"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductApiService } from "@/lib/productApiService";
import { RecebimentoReferenceApiService } from "@/lib/recebimentoReferenceApiService";
import { RecebimentoService } from "@/backend/services/recebimentoService";
import {
  EtiquetasMissing,
  FotosEtiquetas,
  LoteStatus as DbLoteStatus,
  RecebimentoRegistro,
  TipoRecebimento,
} from "@/backend/models/Recebimento";

type Props = { withNf: boolean };
type LoteStatusUi = "ABERTO" | "FINALIZADO";
type LabelKey = "CODIGO_UNICO" | "VISTORIA_REVENDA" | "SAT";

type LabelData = {
  file?: File | null;
  previewUrl?: string;
  missing?: boolean;
  pendencias: string[];
};

type FotoSnapshot = {
  key: LabelKey;
  title: string;
  previewUrl?: string;
  missing?: boolean;
  fileName?: string;
  mimeType?: string;
  storagePath?: string;
  capturedAt?: string;
};

type FormState = {
  codigoUnico: string;
  codigoNf: string;
  ns: string;
  modeloReferencia: string;
  modeloFabricante: string;
  ean: string;
  fornecedor: string;
  observacoes: string;
};

type Row = {
  id: string;
  numero: number;
  recebidoPor: string;
  dataHoraIso: string;
  dataHoraLabel: string;
  codigoUnico: string;
  codigoNf: string;
  ns: string;
  modeloReferencia: string;
  modeloFabricante: string;
  ean: string;
  fornecedor: string;
  observacoes: string;
  loteNumero: number;
  loteStatus: LoteStatusUi;
  pendencias: string[];
  fotos: FotoSnapshot[];
};

type FotoModalState = {
  rowId: string;
  rowNumero: number;
  fotoKey: LabelKey;
  title: string;
  previewUrl?: string;
} | null;

type ConfirmModalState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => void | Promise<void>;
} | null;

type ProductLookup = {
  modeloReferencia: string;
  ean: string;
  marca: string;
} | null;

type NfReference = {
  id: string;
  codigoNf: string;
  modeloReferencia: string;
  ean: string;
  marca: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const LABELS: { key: LabelKey; title: string; hint: string }[] = [
  { key: "CODIGO_UNICO", title: "Etiqueta Codigo Unico", hint: "Centralize o codigo unico e evite reflexos." },
  { key: "VISTORIA_REVENDA", title: "Etiqueta Vistoria Revenda", hint: "Mostre filial, UF, data e carimbo." },
  { key: "SAT", title: "Etiqueta SAT", hint: "Registre numero, OS e carimbo quando existir." },
];

const LABEL_TO_DB_KEY: Record<LabelKey, "codigo_unico" | "vistoria_revenda" | "sat"> = {
  CODIGO_UNICO: "codigo_unico",
  VISTORIA_REVENDA: "vistoria_revenda",
  SAT: "sat",
};

const RX = {
  CODIGO_UNICO: /^[A-Z][A-Z0-9]{7}$/,
  CODIGO_NF: /^[0-9]{3,20}$/,
  NS: /^[A-Z0-9]{3,40}$/i,
};

const STEP_TITLES = [
  "Etiqueta Codigo Unico",
  "Etiqueta Vistoria Revenda",
  "Etiqueta SAT",
  "Recebimento do Produto",
];

function createInitialDados(): Record<LabelKey, LabelData> {
  return {
    CODIGO_UNICO: { missing: false, pendencias: [] },
    VISTORIA_REVENDA: { missing: false, pendencias: [] },
    SAT: { missing: false, pendencias: [] },
  };
}

function createInitialForm(): FormState {
  return {
    codigoUnico: "",
    codigoNf: "",
    ns: "",
    modeloReferencia: "",
    modeloFabricante: "",
    ean: "",
    fornecedor: "",
    observacoes: "",
  };
}

const stripWS = (value: string) => (value || "").replace(/\s+/g, "");
const trimText = (value?: string | null) => String(value || "").trim();

function sanitize(raw: string, kind: "CODIGO_UNICO" | "CODIGO_NF" | "NS") {
  let value = stripWS(raw);
  if (kind !== "CODIGO_NF") value = value.toUpperCase();
  return value;
}

function getPendenciaLabel(key: LabelKey) {
  if (key === "CODIGO_UNICO") return "Coletar foto da etiqueta Codigo Unico";
  if (key === "VISTORIA_REVENDA") return "Coletar foto da etiqueta Vistoria Revenda";
  return "Coletar foto da etiqueta SAT";
}

function toDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });
}

function formatDateLabel(value?: string | null) {
  if (!value) return "Sem data";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toUiLoteStatus(status?: DbLoteStatus | null): LoteStatusUi {
  return status === "finalizado" ? "FINALIZADO" : "ABERTO";
}

function buildFotosEtiquetasFromDados(source: Record<LabelKey, LabelData>): FotosEtiquetas {
  const fotos: FotosEtiquetas = {};
  const capturedAt = new Date().toISOString();

  for (const label of LABELS) {
    const current = source[label.key];
    if (!current?.previewUrl) continue;
    fotos[LABEL_TO_DB_KEY[label.key]] = {
      fileName: current.file?.name,
      mimeType: current.file?.type,
      previewUrl: current.previewUrl,
      capturedAt,
    };
  }

  return fotos;
}

function buildEtiquetasMissingFromDados(source: Record<LabelKey, LabelData>): EtiquetasMissing {
  const missing: EtiquetasMissing = {};

  for (const label of LABELS) {
    if (source[label.key]?.missing) {
      missing[LABEL_TO_DB_KEY[label.key]] = true;
    }
  }

  return missing;
}

function buildPendenciasFromDados(source: Record<LabelKey, LabelData>): string[] {
  const pendencias = new Set<string>();

  for (const label of LABELS) {
    const current = source[label.key];
    if (current?.missing || !current?.previewUrl) {
      pendencias.add(getPendenciaLabel(label.key));
    }
    for (const pendencia of current?.pendencias || []) {
      pendencias.add(pendencia);
    }
  }

  return Array.from(pendencias);
}

function buildFotosEtiquetasFromSnapshots(source: FotoSnapshot[]): FotosEtiquetas {
  const fotos: FotosEtiquetas = {};

  for (const foto of source) {
    if (!foto.previewUrl) continue;
    fotos[LABEL_TO_DB_KEY[foto.key]] = {
      fileName: foto.fileName,
      mimeType: foto.mimeType,
      previewUrl: foto.previewUrl,
      storagePath: foto.storagePath,
      capturedAt: foto.capturedAt,
    };
  }

  return fotos;
}

function buildEtiquetasMissingFromSnapshots(source: FotoSnapshot[]): EtiquetasMissing {
  const missing: EtiquetasMissing = {};

  for (const foto of source) {
    if (foto.missing) {
      missing[LABEL_TO_DB_KEY[foto.key]] = true;
    }
  }

  return missing;
}

function buildPendenciasFromSnapshots(source: FotoSnapshot[]): string[] {
  const pendencias = new Set<string>();

  for (const foto of source) {
    if (foto.missing || !foto.previewUrl) {
      pendencias.add(getPendenciaLabel(foto.key));
    }
  }

  return Array.from(pendencias);
}
function pickLookupFromProduct(product: any): ProductLookup {
  if (!product) return null;
  return {
    modeloReferencia: String(product?.modeloRef || "").trim(),
    ean: String(product?.ean || "").trim(),
    marca: String(product?.marca || "").trim(),
  };
}

function getProductNfCodes(product: any): string[] {
  if (!Array.isArray(product?.nfs)) return [];
  return product.nfs
    .map((item: any) => {
      if (item && typeof item === "object") return String(item.codigo || "").trim();
      return String(item || "").trim();
    })
    .filter(Boolean);
}

function buildRow(registro: RecebimentoRegistro, withNf: boolean, usuarioFallback: string): Row {
  const fotos = LABELS.map((label) => {
    const dbKey = LABEL_TO_DB_KEY[label.key];
    const fotoData = registro.fotosEtiquetas?.[dbKey];
    return {
      key: label.key,
      title: label.title,
      previewUrl: fotoData?.previewUrl,
      missing: Boolean(registro.etiquetasMissing?.[dbKey]),
      fileName: fotoData?.fileName,
      mimeType: fotoData?.mimeType,
      storagePath: fotoData?.storagePath,
      capturedAt: fotoData?.capturedAt,
    };
  });

  return {
    id: String(registro.id || ""),
    numero: Number(registro.numeroItem || 0),
    recebidoPor: String(registro.recebidoPor || registro.analisadoPor || usuarioFallback || "OPERADOR"),
    dataHoraIso: String(registro.dataRecebimento || registro.createdAt || registro.data || new Date().toISOString()),
    dataHoraLabel: formatDateLabel(registro.dataRecebimento || registro.createdAt || registro.data),
    codigoUnico: String(registro.codigoUnico || ""),
    codigoNf: withNf ? String(registro.codigoNF || registro.nf || "") : "SEM NF",
    ns: trimText(registro.numeroSerie) || "-",
    modeloReferencia: withNf
      ? trimText(registro.modeloReferencia || registro.modeloFabricante) || "Aguardando cadastro"
      : trimText(registro.modeloReferencia || registro.modeloFabricante),
    modeloFabricante: trimText(registro.modeloFabricante),
    ean: trimText(registro.ean),
    fornecedor: trimText(registro.fornecedor),
    observacoes: trimText(registro.observacoes),
    loteNumero: Number(registro.loteNumero || 0),
    loteStatus: toUiLoteStatus(registro.loteStatus),
    pendencias: Array.isArray(registro.pendencias) ? registro.pendencias.map((item) => String(item || "")).filter(Boolean) : [],
    fotos,
  };
}

async function fetchProductLookup(
  codigoNf: string,
  fallbackMap?: Map<string, { modeloReferencia: string; ean?: string; marca?: string }>
): Promise<ProductLookup> {
  const normalized = sanitize(codigoNf, "CODIGO_NF");
  if (!normalized) return null;

  try {
    const result = await ProductApiService.searchProducts(normalized, 1, 20);
    const list = Array.isArray(result?.data) ? result.data : [];
    const exactMatch = list.find((item) => getProductNfCodes(item).includes(normalized));
    const found = pickLookupFromProduct(exactMatch || list[0]);
    if (found) return found;
  } catch (error) {
    console.error("Erro ao consultar produto por Codigo NF:", error);
  }

  const fallback = fallbackMap?.get(normalized);
  return fallback
    ? { modeloReferencia: fallback.modeloReferencia, ean: fallback.ean || "", marca: fallback.marca || "" }
    : null;
}

export default function RecebimentoWizardEtiquetas({ withNf }: Props) {
  const searchParams = useSearchParams();
  const requestedLoteParam = searchParams.get("lote");
  const tipoRecebimento: TipoRecebimento = withNf ? "com_nf" : "sem_nf";

  const [usuarioLogado, setUsuarioLogado] = useState("EDUARDO");
  const [loteId, setLoteId] = useState(0);
  const [loteStatus, setLoteStatus] = useState<LoteStatusUi>("ABERTO");
  const [step, setStep] = useState(0);
  const [dados, setDados] = useState<Record<LabelKey, LabelData>>(createInitialDados);
  const [form, setForm] = useState<FormState>(createInitialForm);
  const [simAlt, setSimAlt] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState<FormState>(createInitialForm);
  const [fotoModal, setFotoModal] = useState<FotoModalState>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "info" | "success" | "warn" | "danger" } | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [nfLookup, setNfLookup] = useState<ProductLookup>(null);
  const [nfLookupBusy, setNfLookupBusy] = useState(false);
  const [nfReferences, setNfReferences] = useState<NfReference[]>([]);
  const [nfReferencesLoading, setNfReferencesLoading] = useState(false);
  const [showNfReferenceForm, setShowNfReferenceForm] = useState(false);
  const [nfReferenceBusy, setNfReferenceBusy] = useState(false);
  const [nfReferenceForm, setNfReferenceForm] = useState({
    codigoNf: "",
    modeloReferencia: "",
    ean: "",
    marca: "",
  });
  const [usuarioInicializado, setUsuarioInicializado] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null);

  const fileInputs = {
    CODIGO_UNICO: useRef<HTMLInputElement>(null),
    VISTORIA_REVENDA: useRef<HTMLInputElement>(null),
    SAT: useRef<HTMLInputElement>(null),
  };
  const fotoPickerRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string, kind: "info" | "success" | "warn" | "danger" = "info") => {
    setToast({ msg, kind });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return;
      const currentUser = JSON.parse(userData);
      const userName = String(currentUser?.name || currentUser?.email || "").trim();
      if (userName) setUsuarioLogado(userName.toUpperCase());
    } catch {
      // ignore invalid local user data
    } finally {
      setUsuarioInicializado(true);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    if (!withNf) return () => {
      active = false;
    };

    const loadNfReferences = async () => {
      setNfReferencesLoading(true);
      try {
        const references = await RecebimentoReferenceApiService.listNfReferencias();
        if (!active) return;
        setNfReferences(Array.isArray(references) ? references : []);
      } catch (error) {
        console.error("Erro ao carregar referencias de NF do recebimento:", error);
      } finally {
        if (active) setNfReferencesLoading(false);
      }
    };

    void loadNfReferences();
    return () => {
      active = false;
    };
  }, [withNf]);

  useEffect(() => {
    let active = true;

    if (!usuarioInicializado) return () => {
      active = false;
    };

    async function loadLote() {
      setLoadingInit(true);
      try {
        const requestedLote = Number(requestedLoteParam || "");
        const hasRequestedLote = Number.isFinite(requestedLote) && requestedLote > 0;

        if (hasRequestedLote) {
          const registros = await RecebimentoService.getLote(tipoRecebimento, requestedLote);
          if (!active) return;
          setRows(registros.map((item) => buildRow(item, withNf, usuarioLogado)));
          setLoteId(requestedLote);
          setLoteStatus(registros.some((item) => item.loteStatus === "finalizado") ? "FINALIZADO" : "ABERTO");
          return;
        }

        const loteAberto = await RecebimentoService.getUltimoLoteAberto(tipoRecebimento);
        if (!active) return;
        if (loteAberto) {
          setRows(loteAberto.registros.map((item) => buildRow(item, withNf, usuarioLogado)));
          setLoteId(loteAberto.loteNumero);
          setLoteStatus(loteAberto.registros.some((item) => item.loteStatus === "finalizado") ? "FINALIZADO" : "ABERTO");
          return;
        }

        const nextLote = await RecebimentoService.getNextLoteNumero();
        if (!active) return;
        setRows([]);
        setLoteId(nextLote);
        setLoteStatus("ABERTO");
      } catch (error) {
        console.error("Erro ao carregar lote:", error);
        if (!active) return;
        notify("Erro ao carregar recebimentos.", "danger");
        setRows([]);
        setLoteId(1);
        setLoteStatus("ABERTO");
      } finally {
        if (active) setLoadingInit(false);
      }
    }

    loadLote();
    return () => {
      active = false;
    };
  }, [requestedLoteParam, tipoRecebimento, usuarioInicializado, withNf]);

  const nfReferenceMap = useMemo(
    () =>
      new Map(
        nfReferences.map((item) => [
          item.codigoNf,
          { modeloReferencia: item.modeloReferencia, ean: item.ean, marca: item.marca },
        ])
      ),
    [nfReferences]
  );

  useEffect(() => {
    let active = true;
    const normalized = sanitize(form.codigoNf, "CODIGO_NF");

    if (!withNf || normalized.length < 3 || !RX.CODIGO_NF.test(normalized)) {
      setNfLookup(null);
      setNfLookupBusy(false);
      return () => {
        active = false;
      };
    }

    setNfLookupBusy(true);
    fetchProductLookup(normalized, nfReferenceMap)
      .then((result) => {
        if (active) setNfLookup(result);
      })
      .catch((error) => {
        console.error("Erro ao buscar produto no formulario:", error);
        if (active) setNfLookup(null);
      })
      .finally(() => {
        if (active) setNfLookupBusy(false);
      });

    return () => {
      active = false;
    };
  }, [form.codigoNf, withNf, nfReferenceMap]);

  const ordered = useMemo(() => [...rows].sort((a, b) => a.numero - b.numero), [rows]);
  const bloqueado = loteStatus === "FINALIZADO";
  const actionDisabled = loadingInit || busyAction;
  const codigoUnicoVal = sanitize(form.codigoUnico, "CODIGO_UNICO");
  const nfVal = sanitize(form.codigoNf, "CODIGO_NF");
  const nsVal = sanitize(form.ns, "NS");
  const codigoUnicoOk = !codigoUnicoVal || RX.CODIGO_UNICO.test(codigoUnicoVal);
  const nfOk = !nfVal || RX.CODIGO_NF.test(nfVal);
  const nsOk = !nsVal || RX.NS.test(nsVal);
  const fallbackLookup = useMemo(() => {
    const fallback = nfReferenceMap.get(nfVal);
    return fallback
      ? { modeloReferencia: fallback.modeloReferencia, ean: fallback.ean || "", marca: fallback.marca || "" }
      : null;
  }, [nfReferenceMap, nfVal]);
  const currentLookup = nfLookup || fallbackLookup;
  const curLabel = step >= 1 && step <= 3 ? LABELS[step - 1] : null;
  const curDados = curLabel ? dados[curLabel.key] : null;
  const emptyCols = withNf ? 10 : 9;
  const iconBtn = "inline-flex items-center justify-center w-7 h-7 rounded-xl border";

  const resetFlow = () => {
    setStep(0);
    setForm(createInitialForm());
    setDados(createInitialDados());
  };

  const nextNumero = () => rows.reduce((max, row) => Math.max(max, row.numero), 0) + 1;

  const openConfirmModal = (config: Exclude<ConfirmModalState, null>) => {
    setConfirmModal(config);
  };

  const closeConfirmModal = () => {
    if (busyAction) return;
    setConfirmModal(null);
  };

  const handleConfirmModal = async () => {
    if (!confirmModal) return;
    const current = confirmModal;
    setConfirmModal(null);
    await current.onConfirm();
  };

  const setFile = async (key: LabelKey, file: File) => {
    if (bloqueado || actionDisabled) return;
    try {
      const previewUrl = await toDataURL(file);
      setDados((prev) => ({
        ...prev,
        [key]: { ...prev[key], file, previewUrl, missing: false, pendencias: [] },
      }));
    } catch (error) {
      console.error("Erro ao processar foto:", error);
      notify("Nao foi possivel ler a imagem.", "danger");
    }
  };

  const markMissing = (key: LabelKey) => {
    if (bloqueado || actionDisabled) return;
    const pendencia = getPendenciaLabel(key);
    setDados((prev) => ({
      ...prev,
      [key]: { ...prev[key], file: null, previewUrl: undefined, missing: true, pendencias: [pendencia] },
    }));
  };

  const iniciarNovoLote = async () => {
    if (actionDisabled) return;
    setBusyAction(true);
    try {
      const nextLote = await RecebimentoService.getNextLoteNumero();
      setLoteId(nextLote);
      setLoteStatus("ABERTO");
      setRows([]);
      setEdit(null);
      setFotoModal(null);
      resetFlow();
      notify(`Novo lote iniciado: ${nextLote}`, "success");
    } catch (error) {
      console.error("Erro ao iniciar novo lote:", error);
      notify("Nao foi possivel iniciar um novo lote.", "danger");
    } finally {
      setBusyAction(false);
    }
  };

  const simularEtapa4 = () => {
    const next = !simAlt;
    setSimAlt(next);
    setUsuarioLogado(next ? "EDUARDO" : "FERNANDA");
    setForm({
      codigoUnico: next ? "A1234567" : "B2345678",
      codigoNf: withNf ? (next ? "3551512" : "7777777") : "",
      ns: next ? "ZX9K88" : "",
      modeloReferencia: withNf ? "" : next ? 'TV 32"PHILCO LED PH32E53SG HD/DTV/USB/NET' : "AIR FRYER MONDIAL AFN-40",
      modeloFabricante: withNf ? "" : next ? "PHILCO" : "MONDIAL",
      ean: withNf ? "" : next ? "7899466405923" : "7898578154567",
      fornecedor: withNf ? "" : next ? "PHILCO" : "ESTOQUE LOCAL",
      observacoes: withNf ? "" : next ? "Recebimento sem NF com etiqueta legivel." : "Recebido sem NF; conferir procedencia no cadastro.",
    });
  };

  const abrirCadastroReferenciaNf = () => {
    const codigo = nfVal;
    const base = nfReferenceMap.get(codigo);
    setNfReferenceForm({
      codigoNf: codigo,
      modeloReferencia: currentLookup?.modeloReferencia || base?.modeloReferencia || "",
      ean: currentLookup?.ean || base?.ean || "",
      marca: currentLookup?.marca || base?.marca || "",
    });
    setShowNfReferenceForm(true);
  };

  const salvarReferenciaNf = async () => {
    if (nfReferenceBusy) return;

    const codigo = sanitize(nfReferenceForm.codigoNf, "CODIGO_NF");
    const modeloReferencia = trimText(nfReferenceForm.modeloReferencia);
    const ean = trimText(nfReferenceForm.ean);
    const marca = trimText(nfReferenceForm.marca);

    if (!codigo || !RX.CODIGO_NF.test(codigo)) {
      notify("Informe um Codigo NF valido para cadastrar referencia.", "danger");
      return;
    }

    if (!modeloReferencia) {
      notify("Informe o Modelo Referencia para cadastrar a referencia.", "danger");
      return;
    }

    setNfReferenceBusy(true);
    try {
      const saved = await RecebimentoReferenceApiService.saveNfReferencia({
        codigoNf: codigo,
        modeloReferencia,
        ean,
        marca,
        createdBy: usuarioLogado,
      });

      setNfReferences((prev) => {
        const next = [saved, ...prev.filter((item) => item.codigoNf !== saved.codigoNf)];
        return next;
      });

      setForm((prev) => ({
        ...prev,
        codigoNf: codigo,
      }));

      setNfLookup({
        modeloReferencia: saved.modeloReferencia,
        ean: saved.ean || "",
        marca: saved.marca || "",
      });

      setShowNfReferenceForm(false);
      notify("Referencia de NF salva no banco.", "success");
    } catch (error: any) {
      console.error("Erro ao salvar referencia de NF:", error);
      notify(error?.message || "Nao foi possivel salvar a referencia de NF.", "danger");
    } finally {
      setNfReferenceBusy(false);
    }
  };

  const salvarFinalizar = async () => {
    if (bloqueado) return notify(`O lote ${loteId} esta finalizado. Inicie um novo lote.`, "warn");
    if (actionDisabled) return;

    const erros: string[] = [];
    const usuario = usuarioLogado.trim();
    const modeloReferencia = trimText(form.modeloReferencia);
    const modeloFabricante = trimText(form.modeloFabricante);
    const ean = trimText(form.ean);
    const fornecedor = trimText(form.fornecedor);
    const observacoes = trimText(form.observacoes);
    if (!usuario) erros.push("Usuario logado invalido.");
    if (!codigoUnicoVal) erros.push("Codigo unico e obrigatorio.");
    if (codigoUnicoVal && !RX.CODIGO_UNICO.test(codigoUnicoVal)) erros.push("Codigo unico invalido.");
    if (withNf && !nfVal) erros.push("Codigo NF e obrigatorio.");
    if (withNf && nfVal && !RX.CODIGO_NF.test(nfVal)) erros.push("Codigo NF invalido.");
    if (nsVal && !RX.NS.test(nsVal)) erros.push("Numero de serie invalido.");
    if (!loteId) erros.push("Lote nao carregado.");
    if (erros.length) return notify(erros.join(" "), "danger");

    setBusyAction(true);
    try {
      const produto = withNf ? await fetchProductLookup(nfVal, nfReferenceMap) : null;
      const created = await RecebimentoService.createRecebimento({
        tipoRecebimento,
        loteNumero: loteId,
        loteStatus: "aberto",
        loteCriadoPor: usuario,
        numeroItem: nextNumero(),
        recebidoPor: usuario,
        codigoUnico: codigoUnicoVal,
        codigoNF: withNf ? nfVal : undefined,
        numeroSerie: nsVal || "",
        modeloReferencia: withNf ? produto?.modeloReferencia || "Aguardando cadastro" : modeloReferencia,
        modeloFabricante: withNf ? produto?.marca || "" : modeloFabricante,
        ean: withNf ? produto?.ean || "" : ean,
        nf: withNf ? nfVal : "",
        fornecedor: withNf ? produto?.marca || "" : fornecedor,
        status: "recebido",
        observacoes,
        fotosEtiquetas: buildFotosEtiquetasFromDados(dados),
        etiquetasMissing: buildEtiquetasMissingFromDados(dados),
        pendencias: buildPendenciasFromDados(dados),
      });
 
      setRows((prev) => [...prev, buildRow(created, withNf, usuarioLogado)]);
      resetFlow();
      notify("Recebimento salvo.", "success");
    } catch (error: any) {
      console.error("Erro ao salvar recebimento:", error);
      notify(error?.message || "Nao foi possivel salvar o recebimento.", "danger");
    } finally {
      setBusyAction(false);
    }
  };

  const abrirEdicao = (row: Row) => {
    if (bloqueado) return notify("Lote finalizado: alteracoes bloqueadas.", "warn");
    if (actionDisabled) return;
    setEdit(row);
    setEditForm({
      codigoUnico: row.codigoUnico,
      codigoNf: withNf ? row.codigoNf : "",
      ns: row.ns === "-" ? "" : row.ns,
      modeloReferencia: row.modeloReferencia,
      modeloFabricante: row.modeloFabricante,
      ean: row.ean,
      fornecedor: row.fornecedor,
      observacoes: row.observacoes,
    });
  };

  const salvarEdicao = async () => {
    if (!edit) return;
    if (bloqueado) return notify("Lote finalizado: alteracoes bloqueadas.", "warn");
    if (actionDisabled) return;

    const codigoUnico = sanitize(editForm.codigoUnico, "CODIGO_UNICO");
    const codigoNf = sanitize(editForm.codigoNf, "CODIGO_NF");
    const numeroSerie = sanitize(editForm.ns, "NS");
    const modeloReferencia = trimText(editForm.modeloReferencia);
    const modeloFabricante = trimText(editForm.modeloFabricante);
    const ean = trimText(editForm.ean);
    const fornecedor = trimText(editForm.fornecedor);
    const observacoes = trimText(editForm.observacoes);
    const erros: string[] = [];
    if (!codigoUnico || !RX.CODIGO_UNICO.test(codigoUnico)) erros.push("Codigo unico invalido.");
    if (withNf && (!codigoNf || !RX.CODIGO_NF.test(codigoNf))) erros.push("Codigo NF invalido.");
    if (numeroSerie && !RX.NS.test(numeroSerie)) erros.push("Numero de serie invalido.");
    if (erros.length) return notify(erros.join(" "), "danger");

    setBusyAction(true);
    try {
      const produto = withNf ? await fetchProductLookup(codigoNf, nfReferenceMap) : null;
      const updated = await RecebimentoService.updateRecebimento(edit.id, {
        codigoUnico,
        codigoNF: withNf ? codigoNf : "",
        numeroSerie: numeroSerie || "",
        modeloReferencia: withNf ? produto?.modeloReferencia || edit.modeloReferencia : modeloReferencia,
        modeloFabricante: withNf ? produto?.marca || "" : modeloFabricante,
        ean: withNf ? produto?.ean || "" : ean,
        nf: withNf ? codigoNf : "",
        fornecedor: withNf ? produto?.marca || "" : fornecedor,
        observacoes,
      });

      const nextRow = buildRow(updated, withNf, usuarioLogado);
      setRows((prev) => prev.map((item) => (item.id === edit.id ? nextRow : item)));
      setEdit(null);
      notify("Alteracoes salvas.", "success");
    } catch (error: any) {
      console.error("Erro ao alterar recebimento:", error);
      notify(error?.message || "Nao foi possivel salvar a alteracao.", "danger");
    } finally {
      setBusyAction(false);
    }
  };

  const excluirRecebimento = (row: Row) => {
    if (bloqueado) return notify("Lote finalizado: exclusao bloqueada.", "warn");
    if (actionDisabled) return;
    openConfirmModal({
      title: "Excluir recebimento",
      message: `Excluir o recebimento ${row.numero}?`,
      confirmLabel: "Excluir",
      tone: "danger",
      onConfirm: async () => {
        setBusyAction(true);
        try {
          await RecebimentoService.deleteRecebimento(row.id);
          setRows((prev) => prev.filter((item) => item.id !== row.id));
          if (edit?.id === row.id) setEdit(null);
          if (fotoModal?.rowId === row.id) setFotoModal(null);
          notify(`Recebimento ${row.numero} excluido.`, "success");
        } catch (error: any) {
          console.error("Erro ao excluir recebimento:", error);
          notify(error?.message || "Nao foi possivel excluir o recebimento.", "danger");
        } finally {
          setBusyAction(false);
        }
      },
    });
  };

  const applyFotoToRow = async (file: File) => {
    if (!fotoModal || bloqueado || actionDisabled) return;

    setBusyAction(true);
    try {
      const previewUrl = await toDataURL(file);
      const target = rows.find((row) => row.id === fotoModal.rowId);
      if (!target) throw new Error("Recebimento nao encontrado.");

      const nextFotos = target.fotos.map((foto) =>
        foto.key === fotoModal.fotoKey
          ? { ...foto, previewUrl, missing: false, fileName: file.name, mimeType: file.type, capturedAt: new Date().toISOString() }
          : foto
      );
      const updated = await RecebimentoService.updateRecebimento(target.id, {
        fotosEtiquetas: buildFotosEtiquetasFromSnapshots(nextFotos),
        etiquetasMissing: buildEtiquetasMissingFromSnapshots(nextFotos),
        pendencias: buildPendenciasFromSnapshots(nextFotos),
      });

      const nextRow = buildRow(updated, withNf, usuarioLogado);
      setRows((prev) => prev.map((item) => (item.id === target.id ? nextRow : item)));
      setFotoModal({ rowId: target.id, rowNumero: nextRow.numero, fotoKey: fotoModal.fotoKey, title: fotoModal.title, previewUrl });
      notify("Foto atualizada.", "success");
    } catch (error: any) {
      console.error("Erro ao atualizar foto:", error);
      notify(error?.message || "Nao foi possivel atualizar a foto.", "danger");
    } finally {
      setBusyAction(false);
    }
  };

  const excluirFotoAtual = () => {
    if (!fotoModal?.previewUrl || bloqueado || actionDisabled) return;
    openConfirmModal({
      title: "Excluir foto",
      message: "Excluir esta foto?",
      confirmLabel: "Excluir",
      tone: "danger",
      onConfirm: async () => {
        setBusyAction(true);
        try {
          const target = rows.find((row) => row.id === fotoModal.rowId);
          if (!target) throw new Error("Recebimento nao encontrado.");

          const nextFotos = target.fotos.map((foto) =>
            foto.key === fotoModal.fotoKey
              ? { ...foto, previewUrl: undefined, missing: true, fileName: undefined, mimeType: undefined, storagePath: undefined, capturedAt: undefined }
              : foto
          );
          const updated = await RecebimentoService.updateRecebimento(target.id, {
            fotosEtiquetas: buildFotosEtiquetasFromSnapshots(nextFotos),
            etiquetasMissing: buildEtiquetasMissingFromSnapshots(nextFotos),
            pendencias: buildPendenciasFromSnapshots(nextFotos),
          });

          const nextRow = buildRow(updated, withNf, usuarioLogado);
          setRows((prev) => prev.map((item) => (item.id === target.id ? nextRow : item)));
          setFotoModal({ rowId: target.id, rowNumero: nextRow.numero, fotoKey: fotoModal.fotoKey, title: fotoModal.title, previewUrl: undefined });
          notify("Foto excluida.", "success");
        } catch (error: any) {
          console.error("Erro ao excluir foto:", error);
          notify(error?.message || "Nao foi possivel excluir a foto.", "danger");
        } finally {
          setBusyAction(false);
        }
      },
    });
  };

  const finalizarLote = () => {
    if (!rows.length) return notify("Nao ha recebimentos neste lote.", "warn");
    if (actionDisabled) return;
    openConfirmModal({
      title: "Finalizar lote",
      message: `Finalizar lote ${loteId}? Depois nao sera possivel alterar.`,
      confirmLabel: "Finalizar",
      tone: "primary",
      onConfirm: async () => {
        setBusyAction(true);
        try {
          await RecebimentoService.finalizarLote(tipoRecebimento, loteId);
          setLoteStatus("FINALIZADO");
          setRows((prev) => prev.map((item) => ({ ...item, loteStatus: "FINALIZADO" })));
          notify(`Lote ${loteId} finalizado.`, "success");
        } catch (error: any) {
          console.error("Erro ao finalizar lote:", error);
          notify(error?.message || "Nao foi possivel finalizar o lote.", "danger");
        } finally {
          setBusyAction(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 p-4">
      <div className="mx-auto max-w-6xl text-slate-800">
        <div className="mb-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">RECEBIMENTO DE PRODUTO</h1>
            <span className="inline-flex items-center rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">Lote {loteId || "-"}</span>
            <span className={`inline-flex items-center rounded-2xl border px-3 py-1 text-xs font-semibold ${loteStatus === "ABERTO" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{loteStatus}</span>
            <span className={`inline-flex items-center rounded-2xl border px-3 py-1 text-xs font-semibold ${withNf ? "border-indigo-200 bg-indigo-50 text-indigo-800" : "border-sky-200 bg-sky-50 text-sky-800"}`}>{withNf ? "COM NF" : "SEM NF"}</span>
            {loadingInit ? <span className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">Carregando lote...</span> : null}
          </div>
        </div>

        {step === 0 ? (
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:flex-row">
            <div>
              <div className="mb-1 text-lg font-semibold">Fluxo guiado de 4 etapas</div>
              <div className="text-sm text-slate-600">Codigo unico - Vistoria Revenda - SAT - Recebimento do Produto.</div>
              <div className="mt-2 text-xs text-slate-500">Etapas: {STEP_TITLES.join(" - ")}</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className={`rounded-2xl border px-5 py-3 text-white ${bloqueado || actionDisabled ? "cursor-not-allowed bg-slate-300" : "bg-blue-600 hover:bg-blue-700"}`} onClick={() => { if (bloqueado) return notify(`O lote ${loteId} esta finalizado. Inicie um novo lote.`, "warn"); if (!actionDisabled) setStep(1); }} disabled={bloqueado || actionDisabled}>Efetuar Recebimento</button>
              {bloqueado ? <button type="button" className="rounded-2xl border px-5 py-3 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={iniciarNovoLote} disabled={actionDisabled}>Novo Lote</button> : null}
            </div>
          </div>
        ) : null}

        {step >= 1 && step <= 3 && curLabel && curDados ? (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-slate-500">Passo {step} de 4</div>
            <div className="mb-2 text-xl font-bold">{curLabel.title}</div>
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-4 text-center shadow-sm">
              <div className="mb-3 flex aspect-[4/3] w-full max-w-md items-center justify-center rounded-xl bg-slate-50">
                {curDados.previewUrl ? <img src={curDados.previewUrl} alt="Preview" className="h-full w-full rounded-xl object-contain" /> : <div className="px-6 text-sm text-slate-400"><div className="mb-1 font-semibold">Mantenha a etiqueta centralizada e legivel</div><div className="opacity-80">Use boa iluminacao e evite reflexos.</div></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => fileInputs[curLabel.key].current?.click()} disabled={bloqueado || actionDisabled}>Abrir Camera</button>
                <input ref={fileInputs[curLabel.key]} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) setFile(curLabel.key, file); event.currentTarget.value = ""; }} />
                <button type="button" className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 ${curDados.missing ? "border-rose-600 bg-rose-600 text-white hover:bg-rose-700" : "hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-60`} onClick={() => markMissing(curLabel.key)} disabled={bloqueado || actionDisabled}>Etiqueta nao disponivel</button>
              </div>
              <div className="mt-3 w-full max-w-md text-left text-sm text-slate-600"><div className="font-semibold">Dica:</div><div className="opacity-90">{curLabel.hint}</div></div>
              <div className="mt-4 flex w-full max-w-md items-center justify-between gap-2">
                <button type="button" className="rounded-xl border px-4 py-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={actionDisabled}>Voltar</button>
                <button type="button" className="rounded-xl border bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setStep((current) => Math.min(4, current + 1))} disabled={actionDisabled}>{step < 3 ? "Avancar" : "Ir para Recebimento"}</button>
              </div>
            </div>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="text-xl font-bold">Recebimento do Produto</div>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setStep(3)} disabled={actionDisabled}>Voltar</button>
                <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={simularEtapa4} disabled={actionDisabled}>Simular</button>
              </div>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${withNf ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Codigo Unico<span className="text-red-600"> *</span></label>
                <input className={`rounded-lg border px-3 py-2 ${form.codigoUnico && !codigoUnicoOk ? "border-red-500" : "border-slate-300"}`} placeholder="Digite o codigo unico" value={form.codigoUnico} onChange={(event) => setForm({ ...form, codigoUnico: sanitize(event.target.value, "CODIGO_UNICO") })} />
                {form.codigoUnico && !codigoUnicoOk ? <div className="text-xs text-red-600">Formato invalido. Exemplo: A1234567.</div> : null}
              </div>

              {withNf ? (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Codigo NF<span className="text-red-600"> *</span></label>
                    <input className={`rounded-lg border px-3 py-2 ${form.codigoNf && !nfOk ? "border-red-500" : "border-slate-300"}`} placeholder="Digite o Codigo NF" value={form.codigoNf} onChange={(event) => setForm({ ...form, codigoNf: sanitize(event.target.value, "CODIGO_NF") })} />
                    {form.codigoNf && !nfOk ? <div className="text-xs text-red-600">Somente numeros.</div> : null}
                    {nfLookupBusy && nfVal ? <div className="text-xs text-slate-500">Buscando produto...</div> : null}
                    {nfVal && nfOk && !nfLookupBusy ? (currentLookup?.modeloReferencia ? <div className="mt-1 text-xs text-green-700">Modelo referencia: <b>{currentLookup.modeloReferencia}</b></div> : <div className="mt-1 text-xs text-amber-700">Modelo referencia nao encontrado. O recebimento sera salvo mesmo assim.</div>) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={abrirCadastroReferenciaNf}
                        disabled={actionDisabled || nfReferenceBusy}
                      >
                        Cadastrar referencia NF
                      </button>
                      {nfReferencesLoading ? <span className="text-xs text-slate-500">Carregando referencias...</span> : null}
                      {!nfReferencesLoading ? <span className="text-xs text-slate-500">Referencias cadastradas: {nfReferences.length}</span> : null}
                    </div>
                  </div>

                  {showNfReferenceForm ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 md:col-span-3">
                      <div className="mb-2 text-sm font-semibold text-indigo-900">Cadastrar referencia de NF</div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Codigo NF *</label>
                          <input
                            className={`rounded-lg border px-3 py-2 ${nfReferenceForm.codigoNf && !RX.CODIGO_NF.test(sanitize(nfReferenceForm.codigoNf, "CODIGO_NF")) ? "border-red-500" : "border-slate-300"}`}
                            value={nfReferenceForm.codigoNf}
                            onChange={(event) =>
                              setNfReferenceForm((prev) => ({
                                ...prev,
                                codigoNf: sanitize(event.target.value, "CODIGO_NF"),
                              }))
                            }
                            placeholder="Somente numeros"
                          />
                        </div>

                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Modelo referencia *</label>
                          <input
                            className="rounded-lg border border-slate-300 px-3 py-2"
                            value={nfReferenceForm.modeloReferencia}
                            onChange={(event) =>
                              setNfReferenceForm((prev) => ({
                                ...prev,
                                modeloReferencia: event.target.value,
                              }))
                            }
                            placeholder="Ex.: TV 40 PHILCO FULL HD"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">EAN</label>
                          <input
                            className="rounded-lg border border-slate-300 px-3 py-2"
                            value={nfReferenceForm.ean}
                            onChange={(event) =>
                              setNfReferenceForm((prev) => ({
                                ...prev,
                                ean: event.target.value,
                              }))
                            }
                            placeholder="Opcional"
                          />
                        </div>

                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Marca / Fabricante</label>
                          <input
                            className="rounded-lg border border-slate-300 px-3 py-2"
                            value={nfReferenceForm.marca}
                            onChange={(event) =>
                              setNfReferenceForm((prev) => ({
                                ...prev,
                                marca: event.target.value,
                              }))
                            }
                            placeholder="Opcional"
                          />
                        </div>

                        <div className="flex items-end justify-end gap-2 md:col-span-2">
                          <button
                            type="button"
                            className="rounded-xl border px-4 py-2 text-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => setShowNfReferenceForm(false)}
                            disabled={nfReferenceBusy}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={salvarReferenciaNf}
                            disabled={nfReferenceBusy}
                          >
                            {nfReferenceBusy ? "Salvando..." : "Salvar referencia"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Numero de Serie</label>
                <input className={`rounded-lg border px-3 py-2 ${form.ns && !nsOk ? "border-amber-500" : "border-slate-300"}`} placeholder="Digite o numero de serie" value={form.ns} onChange={(event) => setForm({ ...form, ns: sanitize(event.target.value, "NS") })} />
                {form.ns && !nsOk ? <div className="text-xs text-amber-700">Formato incomum. Use letras e numeros.</div> : null}
              </div>

              {!withNf ? (
                <>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-sm font-medium">Modelo Referencia</label>
                    <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Informe o modelo de referencia" value={form.modeloReferencia} onChange={(event) => setForm({ ...form, modeloReferencia: event.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Modelo Fabricante</label>
                    <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Opcional" value={form.modeloFabricante} onChange={(event) => setForm({ ...form, modeloFabricante: event.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">EAN</label>
                    <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Opcional" value={form.ean} onChange={(event) => setForm({ ...form, ean: event.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Fornecedor</label>
                    <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Opcional" value={form.fornecedor} onChange={(event) => setForm({ ...form, fornecedor: event.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-sm font-medium">Observacoes</label>
                    <textarea className="min-h-28 rounded-lg border border-slate-300 px-3 py-2" placeholder="Detalhes adicionais do recebimento" value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} />
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button type="button" className="rounded-xl border px-4 py-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setStep(3)} disabled={actionDisabled}>Voltar</button>
              <button type="button" className="rounded-2xl border bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={salvarFinalizar} disabled={actionDisabled}>Salvar Recebimento</button>
            </div>
          </div>
        ) : null}

        {step > 0 ? <div className="mt-4 text-xs text-slate-500">Etapas: {STEP_TITLES.join(" - ")}</div> : null}

        <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-lg font-bold">Recebimentos do Lote {loteId || "-"}</div>
              <div className="text-sm text-slate-600">Itens persistidos no banco para este lote.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Total: <b className="ml-1 text-slate-900">{rows.length}</b>
              </div>
              {loteStatus === "ABERTO" ? <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${rows.length ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700" : "cursor-not-allowed bg-slate-100 text-slate-400"} disabled:cursor-not-allowed disabled:opacity-60`} onClick={finalizarLote} disabled={!rows.length || actionDisabled}>Finalizar Lote</button> : <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={iniciarNovoLote} disabled={actionDisabled}>Novo Lote</button>}
            </div>
          </div>

          <div className="hidden px-2 pb-2 xl:block">
            <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full table-auto">
              <thead>
                <tr className="bg-slate-50 text-center text-[11px] font-semibold uppercase text-slate-600">
                  <th className="border-b px-2 py-2 whitespace-nowrap">Alterar</th>
                  <th className="border-b px-2 py-2 whitespace-nowrap">No</th>
                  <th className="border-b px-2 py-2 whitespace-nowrap text-left">Recebido por</th>
                  <th className="border-b px-2 py-2 whitespace-nowrap">Data</th>
                  <th className="border-b px-2 py-2 whitespace-nowrap">Cd. Unico</th>
                  {withNf ? <th className="border-b px-2 py-2 whitespace-nowrap">Codigo NF</th> : null}
                  <th className="border-b px-2 py-2 whitespace-nowrap">No Serie</th>
                  <th className="border-b px-2 py-2 text-left">Modelo Referencia</th>
                  <th className="border-b px-2 py-2 whitespace-nowrap">Fotos</th>
                  <th className="border-b px-2 py-2 whitespace-nowrap">Excluir</th>
                </tr>
              </thead>
              <tbody>
                {!ordered.length ? (
                  <tr><td className="px-3 py-6 text-sm text-slate-500" colSpan={emptyCols}>{loadingInit ? "Carregando recebimentos..." : "Nenhum recebimento salvo neste lote."}</td></tr>
                ) : (
                  ordered.map((row) => (
                    <tr key={row.id} className="align-top text-center text-[11px] hover:bg-slate-50/60">
                      <td className="border-b px-2 py-3"><button type="button" className={`${iconBtn} ${bloqueado || actionDisabled ? "cursor-not-allowed bg-slate-50 text-slate-300" : "hover:bg-slate-50"}`} onClick={() => abrirEdicao(row)} disabled={bloqueado || actionDisabled}>Alt</button></td>
                      <td className="border-b px-2 py-3"><span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 font-semibold">{row.numero}</span></td>
                      <td className="border-b px-2 py-3 text-left font-semibold leading-4 break-all">{row.recebidoPor}</td>
                      <td className="border-b px-2 py-3 whitespace-nowrap">{row.dataHoraLabel}</td>
                      <td className="border-b px-2 py-3 font-mono whitespace-nowrap">{row.codigoUnico}</td>
                      {withNf ? <td className="border-b px-2 py-3 font-mono whitespace-nowrap">{row.codigoNf || "-"}</td> : null}
                      <td className="border-b px-2 py-3 font-mono whitespace-nowrap">{row.ns}</td>
                      <td className="border-b px-2 py-3 text-left leading-5">{row.modeloReferencia || "-"}</td>
                      <td className="border-b px-2 py-3"><div className="flex items-center justify-center gap-1 whitespace-nowrap">{row.fotos.map((foto) => <button key={`${row.id}-${foto.key}`} type="button" className={`h-6 w-6 overflow-hidden rounded-lg border ${bloqueado || actionDisabled ? "cursor-not-allowed bg-slate-50 text-slate-300" : "hover:ring-2 hover:ring-blue-300"} ${foto.previewUrl ? "bg-slate-100" : foto.missing ? "border-amber-200 bg-amber-50" : "bg-slate-50"}`} onClick={() => setFotoModal({ rowId: row.id, rowNumero: row.numero, fotoKey: foto.key, title: foto.title, previewUrl: foto.previewUrl })} disabled={bloqueado || actionDisabled}>{foto.previewUrl ? <img src={foto.previewUrl} alt={foto.title} className="h-full w-full object-cover" /> : <div className={`flex h-full w-full items-center justify-center text-[9px] font-semibold ${foto.missing ? "text-amber-800" : "text-slate-400"}`}>{foto.missing ? "N/D" : "-"}</div>}</button>)}</div></td>
                      <td className="border-b px-2 py-3"><button type="button" className={`${iconBtn} ${bloqueado || actionDisabled ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300" : "border-rose-200 text-rose-700 hover:bg-rose-50"}`} onClick={() => excluirRecebimento(row)} disabled={bloqueado || actionDisabled}>Del</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>

          <div className="grid gap-4 p-4 xl:hidden sm:grid-cols-2">
            {!ordered.length ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 sm:col-span-2">{loadingInit ? "Carregando recebimentos..." : "Nenhum recebimento salvo neste lote."}</div> : ordered.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold">{row.numero}</span><div className="break-all font-mono text-sm text-slate-800">{row.codigoUnico}</div></div><div className="mt-1 text-xs text-slate-500"><span className="break-all font-semibold text-slate-700">{row.recebidoPor}</span><span className="block sm:inline"> - {row.dataHoraLabel}</span></div></div>
                  <div className="flex shrink-0 items-center gap-2"><button type="button" className={`${iconBtn} ${bloqueado || actionDisabled ? "cursor-not-allowed bg-slate-50 text-slate-300" : "hover:bg-slate-50"}`} onClick={() => abrirEdicao(row)} disabled={bloqueado || actionDisabled}>Alt</button><button type="button" className={`${iconBtn} ${bloqueado || actionDisabled ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300" : "border-rose-200 text-rose-700 hover:bg-rose-50"}`} onClick={() => excluirRecebimento(row)} disabled={bloqueado || actionDisabled}>Del</button></div>
                </div>
                <div className={`mt-3 grid gap-3 text-sm ${withNf ? "grid-cols-2" : "grid-cols-2"}`}>
                  {withNf ? <div><div className="text-[11px] uppercase tracking-wide text-slate-500">Codigo NF</div><div className="font-mono text-slate-800">{row.codigoNf || "-"}</div></div> : null}
                  <div><div className="text-[11px] uppercase tracking-wide text-slate-500">Numero de Serie</div><div className="font-mono text-slate-800">{row.ns}</div></div>
                  <div className="col-span-full"><div className="text-[11px] uppercase tracking-wide text-slate-500">Modelo Referencia</div><div className="text-sm leading-6 text-slate-800">{row.modeloReferencia || "-"}</div></div>
                  {!withNf && row.modeloFabricante ? <div><div className="text-[11px] uppercase tracking-wide text-slate-500">Modelo Fabricante</div><div className="text-sm leading-6 text-slate-800">{row.modeloFabricante}</div></div> : null}
                  {!withNf && row.ean ? <div><div className="text-[11px] uppercase tracking-wide text-slate-500">EAN</div><div className="font-mono text-slate-800">{row.ean}</div></div> : null}
                  {!withNf && row.fornecedor ? <div className="col-span-full"><div className="text-[11px] uppercase tracking-wide text-slate-500">Fornecedor</div><div className="text-sm leading-6 text-slate-800">{row.fornecedor}</div></div> : null}
                  {!withNf && row.observacoes ? <div className="col-span-full"><div className="text-[11px] uppercase tracking-wide text-slate-500">Observacoes</div><div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{row.observacoes}</div></div> : null}
                </div>
                <div className="mt-4"><div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Fotos</div><div className="flex flex-wrap gap-2">{row.fotos.map((foto) => <button key={`${row.id}-${foto.key}`} type="button" className={`h-9 w-9 overflow-hidden rounded-lg border ${bloqueado || actionDisabled ? "cursor-not-allowed bg-slate-50 text-slate-300" : "hover:ring-2 hover:ring-blue-300"} ${foto.previewUrl ? "bg-slate-100" : foto.missing ? "border-amber-200 bg-amber-50" : "bg-slate-50"}`} onClick={() => setFotoModal({ rowId: row.id, rowNumero: row.numero, fotoKey: foto.key, title: foto.title, previewUrl: foto.previewUrl })} disabled={bloqueado || actionDisabled}>{foto.previewUrl ? <img src={foto.previewUrl} alt={foto.title} className="h-full w-full object-cover" /> : <div className={`flex h-full w-full items-center justify-center text-[10px] font-semibold ${foto.missing ? "text-amber-800" : "text-slate-400"}`}>{foto.missing ? "N/D" : "-"}</div>}</button>)}</div></div>
              </div>
            ))}
          </div>
        </div>
        {fotoModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setFotoModal(null)}>
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 border-b p-4">
                <div><div className="font-bold text-slate-800">{fotoModal.title}</div><div className="mt-1 text-xs text-slate-500">Recebimento <b>{fotoModal.rowNumero}</b></div></div>
                <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setFotoModal(null)} disabled={actionDisabled}>Fechar</button>
              </div>
              <div className="p-4">
                <div className="overflow-hidden rounded-2xl border bg-slate-50"><div className="flex max-h-[55vh] w-full items-center justify-center p-3">{fotoModal.previewUrl ? <img src={fotoModal.previewUrl} alt={fotoModal.title} className="max-h-[52vh] w-full rounded-xl object-contain" /> : <div className="flex h-[240px] w-full items-center justify-center text-sm text-slate-400">Sem foto</div>}</div></div>
                <input ref={fotoPickerRef} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; applyFotoToRow(file); event.currentTarget.value = ""; }} />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><div className="text-xs text-slate-500">Clique em <b>{fotoModal.previewUrl ? "Alterar" : "Incluir"}</b> para enviar uma nova foto.</div><div className="flex items-center gap-2">{fotoModal.previewUrl ? <button type="button" className="rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={excluirFotoAtual} disabled={actionDisabled}>Excluir</button> : null}<button type="button" className="rounded-xl border bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => fotoPickerRef.current?.click()} disabled={actionDisabled}>{fotoModal.previewUrl ? "Alterar" : "Incluir"}</button></div></div>
              </div>
            </div>
          </div>
        ) : null}

        {edit ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEdit(null)}>
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between gap-2 border-b p-4">
                <div><div className="font-bold text-slate-800">Alterar recebimento</div><div className="text-xs text-slate-500">No {edit.numero} - {edit.dataHoraLabel}</div></div>
                <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setEdit(null)} disabled={actionDisabled}>Fechar</button>
              </div>
              <div className="p-4">
                <div className={`grid grid-cols-1 gap-4 ${withNf ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                  <div className="flex flex-col gap-1"><label className="text-sm font-medium">Codigo Unico<span className="text-red-600"> *</span></label><input className={`rounded-lg border px-3 py-2 ${editForm.codigoUnico && !RX.CODIGO_UNICO.test(sanitize(editForm.codigoUnico, "CODIGO_UNICO")) ? "border-red-500" : "border-slate-300"}`} value={editForm.codigoUnico} onChange={(event) => setEditForm({ ...editForm, codigoUnico: sanitize(event.target.value, "CODIGO_UNICO") })} placeholder="Ex.: A1234567" /></div>
                  {withNf ? <div className="flex flex-col gap-1"><label className="text-sm font-medium">Codigo NF<span className="text-red-600"> *</span></label><input className={`rounded-lg border px-3 py-2 ${editForm.codigoNf && !RX.CODIGO_NF.test(sanitize(editForm.codigoNf, "CODIGO_NF")) ? "border-red-500" : "border-slate-300"}`} value={editForm.codigoNf} onChange={(event) => setEditForm({ ...editForm, codigoNf: sanitize(event.target.value, "CODIGO_NF") })} placeholder="Somente numeros" /></div> : null}
                  <div className="flex flex-col gap-1"><label className="text-sm font-medium">Numero de Serie</label><input className={`rounded-lg border px-3 py-2 ${editForm.ns && !RX.NS.test(sanitize(editForm.ns, "NS")) ? "border-amber-500" : "border-slate-300"}`} value={editForm.ns} onChange={(event) => setEditForm({ ...editForm, ns: sanitize(event.target.value, "NS") })} placeholder="Opcional" /></div>
                  {!withNf ? (
                    <>
                      <div className="flex flex-col gap-1 md:col-span-2"><label className="text-sm font-medium">Modelo Referencia</label><input className="rounded-lg border border-slate-300 px-3 py-2" value={editForm.modeloReferencia} onChange={(event) => setEditForm({ ...editForm, modeloReferencia: event.target.value })} placeholder="Opcional" /></div>
                      <div className="flex flex-col gap-1"><label className="text-sm font-medium">Modelo Fabricante</label><input className="rounded-lg border border-slate-300 px-3 py-2" value={editForm.modeloFabricante} onChange={(event) => setEditForm({ ...editForm, modeloFabricante: event.target.value })} placeholder="Opcional" /></div>
                      <div className="flex flex-col gap-1"><label className="text-sm font-medium">EAN</label><input className="rounded-lg border border-slate-300 px-3 py-2" value={editForm.ean} onChange={(event) => setEditForm({ ...editForm, ean: event.target.value })} placeholder="Opcional" /></div>
                      <div className="flex flex-col gap-1"><label className="text-sm font-medium">Fornecedor</label><input className="rounded-lg border border-slate-300 px-3 py-2" value={editForm.fornecedor} onChange={(event) => setEditForm({ ...editForm, fornecedor: event.target.value })} placeholder="Opcional" /></div>
                      <div className="flex flex-col gap-1 md:col-span-2"><label className="text-sm font-medium">Observacoes</label><textarea className="min-h-28 rounded-lg border border-slate-300 px-3 py-2" value={editForm.observacoes} onChange={(event) => setEditForm({ ...editForm, observacoes: event.target.value })} placeholder="Detalhes adicionais" /></div>
                    </>
                  ) : null}
                </div>
                <div className="mt-5 flex items-center justify-end gap-2"><button type="button" className="rounded-xl border px-4 py-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setEdit(null)} disabled={actionDisabled}>Cancelar</button><button type="button" className="rounded-xl border bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={salvarEdicao} disabled={actionDisabled}>Salvar alteracoes</button></div>
              </div>
            </div>
          </div>
        ) : null}

        {confirmModal ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onClick={closeConfirmModal}>
            <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="text-lg font-black text-slate-900">{confirmModal.title}</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{confirmModal.message}</p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeConfirmModal}
                  disabled={busyAction}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`rounded-2xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                    confirmModal.tone === "danger"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  onClick={handleConfirmModal}
                  disabled={busyAction}
                >
                  {confirmModal.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {toast ? (
          <div className="fixed bottom-4 right-4 z-[70]">
            <div className={`max-w-[340px] rounded-2xl border px-4 py-3 text-sm shadow-lg ${toast.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : toast.kind === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : toast.kind === "danger" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-200 bg-white text-slate-900"}`}>{toast.msg}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
