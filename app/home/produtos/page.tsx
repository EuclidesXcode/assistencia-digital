"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  BookText,
  Cable,
  FileSearch,
  FileText,
  Image as ImageIcon,
  Layers,
  Package as PackageIcon,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { ProductApiService } from "@/lib/productApiService";
import { uploadFile, uploadProductFile } from "@/lib/storage";
import { CreateProductDTO, ItemVinculado, ModeloFabricante as DTOModeloFabricante } from "@/backend/models/Product";
import { processImageToBase64 } from "@/lib/image";
import {
  ProductReferenceSuggestionItem,
  ProductSuggestionCatalog,
  ProductSuggestionCategory,
  buildFallbackSuggestionItemsFromCatalog,
  buildProductSuggestionCatalogFromItems,
  mergeProductSuggestionCatalog,
} from "@/lib/productReferenceCatalog";


const norm = (s: any) => String(s || "").trim();
const upper = (s: any) => norm(s).toUpperCase();
const normalizeLookup = (s: any) => upper(norm(s).normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
const getRowIdentityKey = (value: { id?: any; ean?: any } | null | undefined) => {
  const id = norm(value?.id);
  if (id) return `id:${id}`;
  const ean = upper(value?.ean);
  return ean ? `ean:${ean}` : "";
};

const DEFAULT_CREATED_BY = "SISTEMA";
const agoraBR = () => new Date().toLocaleDateString("pt-BR");

const uniqueSorted = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => norm(value)).filter(Boolean))).sort((a, b) => a.localeCompare(b));

const hasDiacritic = (value: string) => /[\u0300-\u036f]/.test(value.normalize("NFD"));

const compareLabelPreference = (candidate: string, current: string) => {
  const candidateHasDiacritic = hasDiacritic(candidate);
  const currentHasDiacritic = hasDiacritic(current);
  if (candidateHasDiacritic !== currentHasDiacritic) return candidateHasDiacritic ? 1 : -1;
  if (candidate.length !== current.length) return candidate.length - current.length;
  return 0;
};

const uniqueSortedLookup = (values: Array<string | null | undefined>) => {
  const map = new Map<string, string>();

  values.forEach((rawValue) => {
    const value = norm(rawValue);
    if (!value) return;
    const key = normalizeLookup(value);
    if (!key) return;

    const current = map.get(key);
    if (!current) {
      map.set(key, value);
      return;
    }

    if (compareLabelPreference(value, current) > 0) {
      map.set(key, value);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
};

const dedupeSuggestionRowsByLookup = <T extends { id: string; value: string }>(rows: T[]) => {
  const map = new Map<string, T>();

  rows.forEach((row) => {
    const value = norm(row?.value);
    const key = normalizeLookup(value);
    if (!key) return;

    const current = map.get(key);
    if (!current) {
      map.set(key, { ...row, value });
      return;
    }

    const rowEditable = !String(row.id || "").startsWith("fallback:");
    const currentEditable = !String(current.id || "").startsWith("fallback:");

    if (rowEditable && !currentEditable) {
      map.set(key, { ...row, value });
      return;
    }

    if (rowEditable === currentEditable && compareLabelPreference(value, norm(current.value)) > 0) {
      map.set(key, { ...row, value });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value, "pt-BR", { sensitivity: "base" }));
};

const dedupeRevendaClienteOptions = (options: RevendaClienteOption[]) => {
  const map = new Map<string, RevendaClienteOption>();

  options.forEach((option) => {
    const key = upper(option?.nome);
    if (!key) return;

    const current = map.get(key);
    if (!current) {
      map.set(key, option);
      return;
    }

    if (current.origem !== "CLIENTE" && option.origem === "CLIENTE") {
      map.set(key, option);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
};

const detectarFabricanteDoModelo = (modelo: string, fabricantesConhecidos: string[]): string => {
  const u = upper(modelo);
  for (const fab of fabricantesConhecidos.map((item) => upper(item)).filter(Boolean)) {
    if (u.includes(fab)) return fab;
  }
  return "";
};

const detectarLinhaDoModeloFabricante = (modelo: string, linhasConhecidas: string[]): string => {
  const u = normalizeLookup(modelo);
  for (const linha of linhasConhecidas) {
    const normalizedLine = normalizeLookup(linha);
    if (normalizedLine && u.includes(normalizedLine)) return linha;
  }
  return "";
};

const getDisplayFileName = (value: string) => {
  const raw = norm(value);
  if (!raw) return "";
  const withoutQuery = raw.split("?")[0];
  const parts = withoutQuery.split("/");
  const fileName = decodeURIComponent(parts[parts.length - 1] || "");
  return fileName || raw;
};

type FileMeta = {
  id: number;
  file?: File;
  name: string;
  createdAt: string;
  createdBy: string;
  url?: string;
  path?: string;
};

interface RevendaClienteOption {
  id: string;
  nome: string;
  tipo: string;
  documento: string;
  origem: "CLIENTE" | "FILIAL";
}

interface CreateRevendaClienteInput {
  nome: string;
  documento?: string;
}

interface Master {
  id?: string;
  ean: string;
  modeloReferencia: string;
  fabricante: string;
  createdAt?: string;
  createdBy?: string;
}

interface PecaBase {
  id: number;
  descricao: string;
  codigoPeca?: string;
  modeloId?: number;
  createdAt: string;
  createdBy: string;
}

interface ModeloFabricante {
  id: number;
  nome: string;
  codigoProduto: string;
  linha: string;
  createdAt: string;
  createdBy: string;
}

interface CodigoNF {
  id: number;
  codigo: string;
  revenda: string;
  createdAt: string;
  createdBy: string;
}

type ProdutoDocKey = "fotoProduto" | "etiquetaProcel" | "kitAcessorio" | "manualUsuario";

type ModeloDocKey = "vistaExplodida" | "boletimTecnico" | "manualTecnico";

type ModalArquivosKey =
  | { kind: "produto"; doc: ProdutoDocKey }
  | { kind: "modelo"; modeloId: number; doc: ModeloDocKey }
  | { kind: "item"; rowKey: string; title: string };

const createEmptyProdutoDocs = (): Record<ProdutoDocKey, FileMeta[]> => ({
  fotoProduto: [],
  etiquetaProcel: [],
  kitAcessorio: [],
  manualUsuario: [],
});

const createEmptyModeloDocs = (): Record<ModeloDocKey, FileMeta[]> => ({
  vistaExplodida: [],
  boletimTecnico: [],
  manualTecnico: [],
});

const toRemoteFileMeta = (
  value: any,
  id: number,
  fallbackCreatedBy: string = DEFAULT_CREATED_BY,
  fallbackCreatedAt: string = ""
): FileMeta | null => {
  const url = norm(typeof value === "string" ? value : value?.url || value?.path);
  const name = norm(typeof value === "string" ? getDisplayFileName(value) : value?.nome || value?.name || getDisplayFileName(url));
  if (!url && !name) return null;

  return {
    id,
    name: name || `arquivo-${id}`,
    createdAt: norm(value?.createdAt) || fallbackCreatedAt,
    createdBy: norm(value?.createdBy) || fallbackCreatedBy,
    url: url || undefined,
    path: norm(value?.path) || undefined,
  };
};

const toMasterFromRegistro = (r: any, fallbackCreatedBy: string = DEFAULT_CREATED_BY): Master => ({
  id: norm(r?.id) || undefined,
  ean: String(r?.ean || ""),
  modeloReferencia: String(r?.modeloReferencia || ""),
  fabricante: String(r?.fabricante || ""),
  createdAt: String(r?.createdAt || agoraBR()),
  createdBy: String(r?.createdBy || fallbackCreatedBy),
});

const mapApiProductToRegistro = (data: any, fallbackCreatedBy: string = DEFAULT_CREATED_BY) => {
  const now = Date.now();
  const createdAt = agoraBR();
  const createdBy = fallbackCreatedBy;

  const id = norm(data?.id) || undefined;
  const ean = String(data?.ean || "").trim();
  const modeloReferencia = String(data?.modeloRef || data?.modeloReferencia || "").trim();
  const fabricante = String(data?.marca || data?.fabricante || "").trim();

  const nfs: any[] = Array.isArray(data?.nfs) ? data.nfs : [];
  const modelosRaw: any[] = Array.isArray(data?.modelos) ? data.modelos : [];
  const embalagemRaw: any[] = Array.isArray(data?.embalagem) ? data.embalagem : [];
  const acessoriosRaw: any[] = Array.isArray(data?.acessorios) ? data.acessorios : [];
  const esteticaRootRaw: any[] = Array.isArray(data?.estetica) ? data.estetica : [];
  const funcionalRootRaw: any[] = Array.isArray(data?.funcional) ? data.funcional : [];
  const funcionalidadesRaw: any[] = Array.isArray(data?.funcionalidade) ? data.funcionalidade : [];
  const produtoDocs = createEmptyProdutoDocs();
  const modeloDocs: Record<number, Record<ModeloDocKey, FileMeta[]>> = {};
  const itemFotos: Record<string, FileMeta[]> = {};
  let nextFileId = now + 900;

  const toRemoteFiles = (values: any): FileMeta[] => {
    const list = Array.isArray(values) ? values : values ? [values] : [];
    return list
      .map((value) => toRemoteFileMeta(value, nextFileId++, createdBy, createdAt))
      .filter((value): value is FileMeta => !!value);
  };

  const codigosNF: CodigoNF[] = nfs
    .map((nf: any, i: number) => ({
      id: now + 10 + i,
      codigo: upper(nf?.codigo || ""),
      revenda: upper(nf?.revenda || ""),
      createdAt,
      createdBy,
    }))
    .filter((nf) => !!nf.codigo || !!nf.revenda);

  const modelosFabricante: ModeloFabricante[] = modelosRaw
    .map((m: any, i: number) => {
      const nome = norm(m?.nome);
      return {
        id: now + 100 + i,
        nome,
        codigoProduto: upper(m?.codigoTipo || m?.codigoProduto || ""),
        linha: upper(m?.linha || ""),
        createdAt,
        createdBy,
      };
    })
    .filter((m) => !!m.nome);

  const modeloSelecionadoId = modelosFabricante[0]?.id || null;

  const mapPecaBase = (item: any, id: number, extra?: Partial<PecaBase>): PecaBase => ({
    id,
    codigoPeca: upper(item?.codigo || item?.codigoPeca || ""),
    descricao: norm(item?.nome || item?.descricao || ""),
    createdAt,
    createdBy,
    ...extra,
  });

  const embalagens: PecaBase[] = embalagemRaw
    .map((item: any, i: number) => mapPecaBase(item, now + 200 + i))
    .filter((item) => !!item.codigoPeca || !!item.descricao);
  embalagens.forEach((item, i) => {
    const raw = embalagemRaw[i];
    const files = toRemoteFiles(raw?.fotos);
    if (files.length > 0) itemFotos[`EMBALAGEM|${upper(item.codigoPeca || "")}|0`] = files;
  });

  const acessorios: PecaBase[] = acessoriosRaw
    .map((item: any, i: number) => mapPecaBase(item, now + 300 + i))
    .filter((item) => !!item.codigoPeca || !!item.descricao);
  acessorios.forEach((item, i) => {
    const raw = acessoriosRaw[i];
    const files = toRemoteFiles(raw?.fotos);
    if (files.length > 0) itemFotos[`ACESSORIO|${upper(item.codigoPeca || "")}|0`] = files;
  });

  const esteticasFromModelos: PecaBase[] = [];
  const funcionaisFromModelos: PecaBase[] = [];
  modelosRaw.forEach((modelo: any, idxModelo: number) => {
    const modeloId = modelosFabricante[idxModelo]?.id || 0;
    const ests = Array.isArray(modelo?.estetica) ? modelo.estetica : [];
    const funcs = Array.isArray(modelo?.funcional) ? modelo.funcional : [];

    modeloDocs[modeloId] = {
      vistaExplodida: toRemoteFiles(modelo?.vistaExplodida),
      boletimTecnico: toRemoteFiles(modelo?.boletimTecnico),
      manualTecnico: toRemoteFiles(modelo?.manualTecnico),
    };

    ests.forEach((item: any, i: number) =>
      esteticasFromModelos.push(mapPecaBase(item, now + 400 + idxModelo * 100 + i, { modeloId }))
    );
    funcs.forEach((item: any, i: number) =>
      funcionaisFromModelos.push(mapPecaBase(item, now + 500 + idxModelo * 100 + i, { modeloId }))
    );

    ests.forEach((item: any) => {
      const files = toRemoteFiles(item?.fotos);
      if (files.length > 0) itemFotos[`PECA|${upper(item?.codigo || item?.codigoPeca || "")}|${modeloId}`] = files;
    });
    funcs.forEach((item: any) => {
      const files = toRemoteFiles(item?.fotos);
      if (files.length > 0) itemFotos[`PECA|${upper(item?.codigo || item?.codigoPeca || "")}|${modeloId}`] = files;
    });
  });

  const defaultModeloId = modeloSelecionadoId || 0;
  const esteticas: PecaBase[] =
    esteticasFromModelos.length > 0
      ? esteticasFromModelos
      : esteticaRootRaw
        .map((item: any, i: number) => mapPecaBase(item, now + 600 + i, { modeloId: defaultModeloId }))
        .filter((item) => !!item.codigoPeca || !!item.descricao);
  if (esteticasFromModelos.length === 0) {
    esteticaRootRaw.forEach((item: any) => {
      const files = toRemoteFiles(item?.fotos);
      if (files.length > 0) itemFotos[`PECA|${upper(item?.codigo || item?.codigoPeca || "")}|${defaultModeloId}`] = files;
    });
  }

  const funcionaisPeca: PecaBase[] =
    funcionaisFromModelos.length > 0
      ? funcionaisFromModelos
      : funcionalRootRaw
        .map((item: any, i: number) => mapPecaBase(item, now + 700 + i, { modeloId: defaultModeloId }))
        .filter((item) => !!item.codigoPeca || !!item.descricao);
  if (funcionaisFromModelos.length === 0) {
    funcionalRootRaw.forEach((item: any) => {
      const files = toRemoteFiles(item?.fotos);
      if (files.length > 0) itemFotos[`PECA|${upper(item?.codigo || item?.codigoPeca || "")}|${defaultModeloId}`] = files;
    });
  }

  const funcionalidades: PecaBase[] = funcionalidadesRaw
    .map((item: any, i: number) => ({
      id: now + 800 + i,
      descricao: norm(typeof item === "string" ? item : item?.nome || item?.descricao),
      createdAt,
      createdBy,
    }))
    .filter((item) => !!item.descricao);

  produtoDocs.fotoProduto = toRemoteFiles(data?.fotos);
  produtoDocs.etiquetaProcel = toRemoteFiles(data?.etiquetaProcel);
  produtoDocs.kitAcessorio = toRemoteFiles(data?.kitAcessorio);
  produtoDocs.manualUsuario = toRemoteFiles(data?.manualUrl);

  return {
    id,
    ean,
    modeloReferencia,
    fabricante,
    codigosNF,
    modelosFabricante,
    modeloSelecionadoId,
    embalagens,
    acessorios,
    esteticas,
    funcionaisPeca,
    funcionalidades,
    produtoDocs,
    modeloDocs,
    itemFotos,
    createdAt: String(data?.createdAt || createdAt),
    createdBy,
  };
};

const IconBtn: React.FC<{
  title: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  badge?: number;
  children: React.ReactNode;
  variant?: "neutral" | "danger" | "primary";
}> = ({ title, onClick, disabled, badge, children, variant = "neutral" }) => {
  const base =
    "relative inline-flex items-center justify-center rounded-lg border h-8 w-8 transition disabled:opacity-40 disabled:cursor-not-allowed";
  const styles =
    variant === "danger"
      ? "border-red-200 text-red-600 hover:bg-red-50"
      : variant === "primary"
        ? "border-sky-200 text-sky-700 hover:bg-sky-50"
        : "border-slate-200 text-slate-700 hover:bg-slate-50";
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
      {!!badge && (
        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-slate-900 text-white text-[10px] font-semibold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
};

const CountPill: React.FC<{ n: number }> = ({ n }) => {
  if (!n) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-slate-900 text-white text-[10px] font-semibold">
      {n}
    </span>
  );
};

const ModalShell: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
  showCloseButton?: boolean;
}> = ({ open, title, subtitle, onClose, children, maxW = "max-w-3xl", showCloseButton = true }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 md:pl-[calc(var(--sidebar-w)+1rem)]">
      <div
        className={`w-full ${maxW} min-w-0 bg-white rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6 space-y-4 max-h-[90vh] overflow-x-hidden overflow-y-auto`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] px-2 py-1 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
            >
              FECHAR
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

const ModalArquivos: React.FC<{
  open: boolean;
  title: string;
  accept: string;
  files: FileMeta[];
  onClose: () => void;
  onAdd: (files: FileList) => void;
  onRemove: (id: number) => void;
}> = ({ open, title, accept, files, onClose, onAdd, onRemove }) => {
  const [pickKey, setPickKey] = useState(0);
  const [view, setView] = useState<{ src: string; title: string } | null>(null);

  const acceptLower = String(accept || "").toLowerCase();
  const allowImages = acceptLower.includes("image");
  const allowPdf = acceptLower.includes("pdf") || acceptLower.includes("application/pdf");

  const isImageFile = (entry: FileMeta) => {
    const t = String(entry.file?.type || "").toLowerCase();
    if (t.startsWith("image/")) return true;
    const ref = `${entry.name || ""} ${entry.url || ""}`.toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(ref);
  };

  const [previews, setPreviews] = useState<Record<number, string>>({});

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!open || !allowImages) {
        setPreviews({});
        return;
      }

      const entries = await Promise.all(
        files.map(async (f) => {
          if (!isImageFile(f)) return null;
          if (f.url) return [f.id, f.url] as const;
          const localFile = f.file;
          if (!localFile) return null;
          const dataUrl = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result || ""));
            r.onerror = () => resolve("");
            try {
              r.readAsDataURL(localFile);
            } catch {
              resolve("");
            }
          });
          return dataUrl ? ([f.id, dataUrl] as const) : null;
        })
      );

      if (!alive) return;
      const map: Record<number, string> = {};
      for (const e of entries) if (e) map[e[0]] = e[1];
      setPreviews(map);
    };

    run();
    return () => {
      alive = false;
    };
  }, [open, files, allowImages]);

  return (
    <ModalShell
      open={open}
      title={title}
      subtitle={`Arquivos cadastrados: ${files.length}`}
      onClose={() => {
        setView(null);
        onClose();
      }}
      maxW="max-w-2xl"
    >
      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer">
          <Plus size={16} />
          ADICIONAR
          <input
            key={pickKey}
            type="file"
            className="hidden"
            accept={accept}
            multiple
            onChange={(e) => {
              const fl = e.target.files;
              if (fl && fl.length) onAdd(fl);
              setPickKey((k) => k + 1);
            }}
          />
        </label>
        <div className="text-[10px] text-slate-500">Aceita: {accept || "qualquer"}</div>
      </div>

      <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-x-auto overflow-y-auto max-h-[360px]">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-100 text-slate-500 uppercase tracking-wide sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left w-8">#</th>
              {allowImages ? (
                <>
                  <th className="px-2 py-1.5 text-left w-24">Data</th>
                  <th className="px-2 py-1.5 text-left w-28">Incluído por</th>
                  {allowPdf ? <th className="px-2 py-1.5 text-left">Arquivo</th> : null}
                  <th className="px-2 py-1.5 text-left w-24">FOTO</th>
                </>
              ) : (
                <th className="px-2 py-1.5 text-left">Arquivo</th>
              )}
              <th className="px-2 py-1.5 text-right w-14">Excluir</th>
            </tr>
          </thead>
          <tbody>
            {!files.length && (
              <tr>
                <td
                  colSpan={allowImages ? (allowPdf ? 6 : 5) : 3}
                  className="px-3 py-3 text-center text-[11px] text-slate-400"
                >
                  Nenhum arquivo cadastrado.
                </td>
              </tr>
            )}

            {files.map((f, i) => (
              <tr key={f.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-2 py-1.5 align-middle text-[11px] text-slate-500">{i + 1}</td>

                {allowImages ? (
                  <>
                    <td className="px-2 py-1.5 align-middle text-[11px] text-slate-700 whitespace-nowrap">{f.createdAt || "-"}</td>
                    <td className="px-2 py-1.5 align-middle text-[11px] font-medium text-slate-800 whitespace-nowrap">
                      {f.createdBy || "-"}
                    </td>

                    {allowPdf ? <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800">{f.name}</td> : null}

                    <td className="px-2 py-1.5 align-middle">
                      <button
                        type="button"
                        disabled={!previews[f.id]}
                        onClick={() =>
                          previews[f.id] &&
                          setView({
                            src: previews[f.id],
                            title: `${title} — ${f.createdAt || ""} — ${f.createdBy || ""}`.trim() || f.name,
                          })
                        }
                        className="rounded-lg disabled:opacity-50 focus:outline-none"
                      >
                        {previews[f.id] ? (
                          <div className="relative">
                            <img
                              src={previews[f.id]}
                              alt=""
                              className="w-16 h-11 object-cover rounded-lg border border-slate-200 bg-white cursor-zoom-in"
                            />
                            <span className="absolute right-1 bottom-1 bg-white/90 border border-slate-200 rounded-md p-0.5">
                              <ZoomIn size={14} />
                            </span>
                          </div>
                        ) : (
                          <div className="w-16 h-11 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 text-[10px]">
                            —
                          </div>
                        )}
                      </button>
                    </td>
                  </>
                ) : (
                  <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800">{f.name}</td>
                )}

                <td className="px-2 py-1.5 align-middle text-right">
                  <IconBtn title="Excluir" variant="danger" onClick={() => onRemove(f.id)}>
                    <Trash2 size={16} />
                  </IconBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {view && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 md:pl-[calc(var(--sidebar-w)+1rem)]"
          onClick={() => setView(null)}
        >
          <div className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="text-[12px] font-semibold text-slate-800 truncate">{view.title}</div>
              <button
                type="button"
                onClick={() => setView(null)}
                className="text-[11px] px-2 py-1 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
              >
                FECHAR
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center">
              <img src={view.src} alt="" className="max-h-[70vh] max-w-full rounded-xl border border-slate-200 bg-white" />
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
};

const ModalAjuda: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const deleteTarget = null as Master | null;
  const busyDeleteKey = null as string | null;
  const setDeleteTarget = (_value: Master | null) => { };
  const excluir = async (_item: Master) => { };
  return (
    <ModalShell open={open} title="Como usar esta tela" subtitle="Fluxo e regras principais" onClose={onClose} maxW="max-w-2xl">
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 max-h-[420px] overflow-auto text-[12px] text-slate-700 space-y-3">
        <div className="font-semibold text-slate-900">Regras</div>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Cada <span className="font-semibold">revenda/cliente</span> tem seu <span className="font-semibold">Código NF</span>, porém o
            <span className="font-semibold"> EAN / GTIN</span> é único por produto.
          </li>
          <li>
            <span className="font-semibold">Embalagem</span> e <span className="font-semibold">Acessórios</span>: cadastra itens vinculados ao
            <span className="font-semibold"> EAN / GTIN</span>.
          </li>
          <li>
            <span className="font-semibold">Estética</span> e <span className="font-semibold">Funcional</span>: cadastra peças vinculadas ao
            <span className="font-semibold"> Modelo Fabricante</span> selecionado.
          </li>
          <li>
            <span className="font-semibold">Funcionalidade</span>: cadastro de características/itens de verificação para o produto.
          </li>
          <li>
            Itens de Embalagem, Acessórios, Funcionalidade, Estética e Funcional carregam informações da tela de Pré-Análise.
          </li>
        </ul>

        <div className="font-semibold text-slate-900">Anexos</div>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-semibold">Foto do produto</span> pode aparecer em outras telas quando necessário.
          </li>
          <li>
            <span className="font-semibold">Foto da etiqueta Procel</span>, <span className="font-semibold">Foto do kit acessório</span> e
            <span className="font-semibold"> PDF do Manual do usuário</span> aparecem na tela de Embalagem para auxiliar o embalador.
          </li>
          <li>
            <span className="font-semibold">Vista explodida</span>, <span className="font-semibold">Boletim técnico</span>,
            <span className="font-semibold"> Manual técnico</span> e <span className="font-semibold">foto do item</span> auxiliam Pré-Análise e
            Análise Técnica.
          </li>
        </ul>
      </div>

      <ModalShell
        open={!!deleteTarget}
        title="Confirmar exclusão"
        subtitle="Esta ação remove o cadastro da lista e do banco."
        onClose={() => {
          if (busyDeleteKey) return;
          setDeleteTarget(null);
        }}
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-[12px] text-slate-700">
            Excluir o EAN/GTIN <span className="font-semibold">{deleteTarget?.ean || "-"}</span>?
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 space-y-1">
            <div>
              <span className="font-semibold">Modelo:</span> {deleteTarget?.modeloReferencia || "-"}
            </div>
            <div>
              <span className="font-semibold">Fabricante:</span> {deleteTarget?.fabricante || "-"}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={!!busyDeleteKey}
              onClick={() => setDeleteTarget(null)}
              className="px-3 h-9 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              type="button"
              disabled={!!busyDeleteKey || !deleteTarget}
              onClick={() => {
                if (deleteTarget) void excluir(deleteTarget);
              }}
              className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              EXCLUIR
            </button>
          </div>
        </div>
      </ModalShell>
    </ModalShell>
  );
};

const ModalRevendasClientes: React.FC<{
  open: boolean;
  onClose: () => void;
  options: RevendaClienteOption[];
  loading: boolean;
  error?: string;
  onSelect: (nome: string) => void;
  onGoToCadastroCliente: (payload: CreateRevendaClienteInput) => void;
}> = ({ open, onClose, options, loading, error, onSelect, onGoToCadastroCliente }) => {
  const [q, setQ] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoDocumento, setNovoDocumento] = useState("");
  const [createMsg, setCreateMsg] = useState("");
  const deleteTarget = null as Master | null;
  const busyDeleteKey = null as string | null;
  const setDeleteTarget = (_value: Master | null) => {};
  const excluir = async (_item: Master) => {};

  useEffect(() => {
    if (!open) {
      setQ("");
      setNovoNome("");
      setNovoDocumento("");
      setCreateMsg("");
    }
  }, [open]);

  const lista = useMemo(() => {
    const qq = upper(q);
    return options.filter((x) => {
      if (!qq) return true;
      const hay = `${x.nome} ${x.tipo} ${x.documento || ""} ${x.origem}`;
      return upper(hay).includes(qq);
    });
  }, [options, q]);

  const irParaCadastroCliente = () => {
    const nome = norm(novoNome);
    const documento = norm(novoDocumento);
    if (!nome) {
      setCreateMsg("Informe o nome do cliente ou revenda.");
      return;
    }

    onGoToCadastroCliente({ nome, documento });
  };

  return (
    <ModalShell open={open} title="Selecionar Revenda/Cliente" subtitle={`Carregados: ${options.length}`} onClose={onClose} maxW="max-w-4xl">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">PESQUISA</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por nome, tipo, CNPJ ou CPF"
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
        <div className="text-[11px] font-semibold text-slate-700">Cadastrar novo cliente</div>
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 md:col-span-6 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">NOME / RAZAO SOCIAL</label>
            <input
              value={novoNome}
              onChange={(e) => {
                setNovoNome(e.target.value);
                setCreateMsg("");
              }}
              placeholder="Ex.: Magazine Luiza, Casas Bahia, revenda local..."
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">CPF/CNPJ</label>
            <input
              value={novoDocumento}
              onChange={(e) => {
                setNovoDocumento(e.target.value);
                setCreateMsg("");
              }}
              placeholder="Opcional"
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <div className="col-span-12 md:col-span-3 flex md:justify-end">
            <button
              type="button"
              onClick={irParaCadastroCliente}
              className="h-9 w-full md:w-auto px-3 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              IR PARA CADASTRO
            </button>
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          O novo cadastro sera feito na pagina de clientes, com documento e endereco completos.
        </div>
        {createMsg ? <div className="text-[12px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{createMsg}</div> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-x-auto bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left w-8">#</th>
              <th className="px-2 py-2 text-left">Revenda/cliente</th>
              <th className="px-2 py-2 text-left w-20">Tipo</th>
              <th className="px-2 py-2 text-left w-40">CNPJ/CPF</th>
              <th className="px-2 py-2 text-right w-28">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-[11px] text-slate-400">
                  Carregando dados reais...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-[11px] text-red-500">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && !lista.length && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-[11px] text-slate-400">
                  Nenhum resultado.
                </td>
              </tr>
            )}
            {lista.map((x, i) => (
              <tr key={x.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-500">{i + 1}</td>
                <td className="px-2 py-2 align-middle text-[11px] font-semibold text-slate-800 truncate" title={x.nome}>
                  {x.nome}
                </td>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-700 truncate" title={x.tipo}>
                  {x.tipo}
                </td>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-700 font-mono whitespace-nowrap">
                  {x.documento || "-"}
                </td>
                <td className="px-2 py-2 align-middle text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(x.nome)}
                    className="h-8 px-2.5 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    CARREGAR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalShell
        open={!!deleteTarget}
        title="Confirmar exclusão"
        subtitle="Esta ação remove o cadastro da lista e do banco."
        onClose={() => {
          if (busyDeleteKey) return;
          setDeleteTarget(null);
        }}
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-[12px] text-slate-700">
            Excluir o EAN/GTIN <span className="font-semibold">{deleteTarget?.ean || "-"}</span>?
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 space-y-1">
            <div>
              <span className="font-semibold">Modelo:</span> {deleteTarget?.modeloReferencia || "-"}
            </div>
            <div>
              <span className="font-semibold">Fabricante:</span> {deleteTarget?.fabricante || "-"}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={!!busyDeleteKey}
              onClick={() => setDeleteTarget(null)}
              className="px-3 h-9 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              type="button"
              disabled={!!busyDeleteKey || !deleteTarget}
              onClick={() => {
                if (deleteTarget) void excluir(deleteTarget);
              }}
              className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              EXCLUIR
            </button>
          </div>
        </div>
      </ModalShell>
    </ModalShell>
  );
};

const ModalEanGtins: React.FC<{
  open: boolean;
  onClose: () => void;
  eans: Master[];
  registros: any[];
  usuarioAtual: string;
  onAdd: (m: Master) => Promise<Master> | Master;
  onEdit: (payload: { id?: string; originalEan: string; next: Master }) => Promise<void> | void;
  onDelete: (payload: { id?: string; ean?: string }) => Promise<void> | void;
  onSelect: (m: Master, options?: { updateCurrentRecord?: boolean }) => void;
}> = ({ open, onClose, eans, registros, usuarioAtual, onAdd, onEdit, onDelete, onSelect }) => {
  const [q, setQ] = useState("");
  const [fFab, setFFab] = useState<string>("TODOS");

  const [novoEan, setNovoEan] = useState("");
  const [novoModelo, setNovoModelo] = useState("");
  const [novoFab, setNovoFab] = useState("");
  const [msgAdd, setMsgAdd] = useState("");
  const [editMasterId, setEditMasterId] = useState<string | null>(null);
  const [editEanOriginal, setEditEanOriginal] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyDeleteKey, setBusyDeleteKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Master | null>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setFFab("TODOS");
      setNovoEan("");
      setNovoModelo("");
      setNovoFab("");
      setMsgAdd("");
      setEditMasterId(null);
      setEditEanOriginal(null);
      setIsSubmitting(false);
      setBusyDeleteKey(null);
      setDeleteTarget(null);
    }
  }, [open]);

  const isEditing = !!editEanOriginal;

  const existente = useMemo(() => {
    const e = upper(novoEan);
    return e ? eans.find((x) => upper(x.ean) === e) || null : null;
  }, [novoEan, eans]);

  const eanHitRef = useRef("");

  useEffect(() => {
    if (!open || isEditing) return;
    if (existente) {
      const k = upper(existente.ean);
      if (eanHitRef.current !== k) {
        setNovoModelo(existente.modeloReferencia);
        setNovoFab(existente.fabricante);
        setMsgAdd("");
      }
      eanHitRef.current = k;
    } else {
      if (eanHitRef.current) {
        setNovoModelo("");
        setNovoFab("");
      }
      eanHitRef.current = "";
    }
  }, [open, existente, isEditing]);

  const fabs = useMemo(() => {
    const s = new Set<string>();
    eans.forEach((x) => s.add(upper(x.fabricante)));
    return Array.from(s).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [eans]);
  const fabricantesDoModal = useMemo(() => uniqueSorted(eans.map((item) => item.fabricante)), [eans]);

  const codigosNfByRegistroKey = useMemo(() => {
    const map = new Map<string, string[]>();
    registros.forEach((registro: any) => {
      const key = getRowIdentityKey(registro);
      if (!key) return;
      const nfs = Array.isArray(registro?.codigosNF) ? registro.codigosNF : [];
      const codigos = nfs
        .map((nf: any) => upper(nf?.codigo || ""))
        .filter(Boolean);
      if (codigos.length > 0) {
        map.set(key, codigos);
      }
    });
    return map;
  }, [registros]);

  const lista = useMemo(() => {
    const qq = upper(q);
    return eans.filter((x) => {
      if (fFab !== "TODOS" && upper(x.fabricante) !== fFab) return false;
      if (!qq) return true;
      const codigosNf = codigosNfByRegistroKey.get(getRowIdentityKey(x)) || [];
      const hay = `${x.createdAt || ""} ${x.createdBy || ""} ${x.ean} ${x.modeloReferencia} ${x.fabricante} ${codigosNf.join(" ")}`;
      return upper(hay).includes(qq);
    });
  }, [eans, q, fFab, codigosNfByRegistroKey]);

  const limparFormulario = () => {
    setNovoEan("");
    setNovoModelo("");
    setNovoFab("");
    setEditMasterId(null);
    setEditEanOriginal(null);
  };

  const incluir = async () => {
    if (!isEditing && existente) return onSelect(existente, { updateCurrentRecord: false });

    const originalEan = String(editEanOriginal || "").trim();
    const ean = norm(novoEan);
    const modeloReferencia = norm(novoModelo);
    let fabricante = upper(novoFab);
    if (!fabricante) fabricante = detectarFabricanteDoModelo(modeloReferencia, fabricantesDoModal);

    if (!ean || !modeloReferencia) return setMsgAdd("Informe EAN/GTIN e Modelo referência.");
    if (!fabricante) return setMsgAdd("Informe o Fabricante.");
    if (
      eans.some((x) => {
        if (upper(x.ean) !== upper(ean)) return false;
        if (editMasterId) return norm(x.id) !== norm(editMasterId);
        return !originalEan || upper(x.ean) !== upper(originalEan);
      })
    ) {
      return setMsgAdd("EAN/GTIN já cadastrado.");
    }

    try {
      setIsSubmitting(true);

      if (isEditing && originalEan) {
        await onEdit({
          id: editMasterId || undefined,
          originalEan,
          next: {
            id: editMasterId || undefined,
            ean,
            modeloReferencia,
            fabricante,
            createdAt: agoraBR(),
            createdBy: usuarioAtual,
          },
        });
        limparFormulario();
        setMsgAdd("Alteração realizada.");
      } else {
        const saved = await onAdd({
          ean,
          modeloReferencia,
          fabricante,
          createdAt: agoraBR(),
          createdBy: usuarioAtual,
        });
        onSelect(saved, { updateCurrentRecord: true });
      }
    } catch (error: any) {
      setMsgAdd(error?.message ? String(error.message) : "Falha ao salvar alterações.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const iniciarEdicao = (item: Master) => {
    setEditMasterId(norm(item.id) || null);
    setEditEanOriginal(item.ean);
    setNovoEan(item.ean);
    setNovoModelo(item.modeloReferencia);
    setNovoFab(item.fabricante);
    setMsgAdd("Modo alteração: edite e clique em Salvar.");
  };

  const excluir = async (item: Master) => {
    const id = norm(item?.id);
    const ean = String(item?.ean || "").trim();
    if (!id && !ean) return;

    try {
      const busyKey = getRowIdentityKey(item);
      setBusyDeleteKey(busyKey || null);
      await onDelete({ id: id || undefined, ean: ean || undefined });

      if (norm(editMasterId) && norm(editMasterId) === id) {
        limparFormulario();
      } else if (!id && upper(editEanOriginal || "") === upper(ean)) {
        limparFormulario();
      }

      setMsgAdd("Exclusão realizada.");
      setDeleteTarget(null);
    } catch (error: any) {
      setMsgAdd(error?.message ? String(error.message) : "Falha ao excluir.");
    } finally {
      setBusyDeleteKey(null);
    }
  };

  const lockedByExisting = !!existente && !isEditing;

  return (
    <ModalShell open={open} title="Selecionar EAN/GTIN" subtitle={`Cadastrados: ${eans.length}`} onClose={onClose} maxW="max-w-5xl">
      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 space-y-2">
        <div className="text-[11px] font-semibold text-slate-700">{isEditing ? "Alterar EAN/GTIN" : "Incluir EAN/GTIN"}</div>

        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">EAN/GTIN</label>
            <input
              value={novoEan}
              onChange={(e) => {
                setNovoEan(e.target.value);
                setMsgAdd("");
              }}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono"
            />
          </div>

          <div className="col-span-12 md:col-span-6 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">MODELO REFERÊNCIA</label>
            <input
              value={novoModelo}
              readOnly={lockedByExisting}
              onChange={(e) => {
                if (lockedByExisting) return;
                setNovoModelo(e.target.value);
                setMsgAdd("");
              }}
              className={`h-9 rounded-xl border border-slate-300 px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${lockedByExisting ? "bg-slate-50 cursor-not-allowed" : "bg-white"}`}
            />
          </div>

          <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">FABRICANTE</label>
            <input
              value={novoFab}
              readOnly={lockedByExisting}
              onChange={(e) => {
                if (lockedByExisting) return;
                setNovoFab(e.target.value);
                setMsgAdd("");
              }}
              className={`h-9 rounded-xl border border-slate-300 px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase ${lockedByExisting ? "bg-slate-50 cursor-not-allowed" : "bg-white"}`}
            />
          </div>

          <div className="col-span-12 md:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={incluir}
              disabled={isSubmitting}
              className="h-9 w-full px-2.5 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center justify-center gap-1.5"
              title={isEditing ? "Salvar" : existente ? "Carregar" : "Incluir"}
            >
              <Plus size={14} />
              {isEditing ? "SALVAR" : existente ? "CARREGAR" : "INCLUIR"}
            </button>
          </div>
        </div>

        {msgAdd && <div className="text-[11px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{msgAdd}</div>}
      </div>

      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 md:col-span-8 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">PESQUISA</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por EAN/GTIN, código NF, modelo referência ou fabricante"
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <div className="col-span-12 md:col-span-4 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">FILTRO (FABRICANTE)</label>
          <select
            value={fFab}
            onChange={(e) => setFFab(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-2 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="TODOS">TODOS</option>
            {fabs.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-x-auto bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left w-8">#</th>
              <th className="px-2 py-2 text-left w-24">Data</th>
              <th className="px-2 py-2 text-left w-28">Incluído por</th>
              <th className="px-2 py-2 text-left w-32">EAN/GTIN</th>
              <th className="px-2 py-2 text-left">Modelo referência</th>
              <th className="px-2 py-2 text-left w-28">Fabricante</th>
              <th className="px-2 py-2 text-left w-40">Código NF(s)</th>
              <th className="px-2 py-2 text-right w-28">Carregar</th>
              <th className="px-2 py-2 text-right w-16">Alterar</th>
              <th className="px-2 py-2 text-right w-16">Excluir</th>
            </tr>
          </thead>
          <tbody>
            {!lista.length && (
              <tr>
                <td colSpan={10} className="px-3 py-3 text-center text-[11px] text-slate-400">
                  Nenhum resultado.
                </td>
              </tr>
            )}
            {lista.map((x, i) => {
              const rowIdentity = getRowIdentityKey(x);
              const rowKey = rowIdentity || `ean:${upper(x.ean)}:${i}`;
              const codigosNf = codigosNfByRegistroKey.get(rowIdentity) || [];
              const codigosNfText =
                codigosNf.length > 0
                  ? codigosNf.length > 2
                    ? `${codigosNf.slice(0, 2).join(", ")} +${codigosNf.length - 2}`
                    : codigosNf.join(", ")
                  : "-";
              const deleteBusy = busyDeleteKey === rowIdentity;

              return (
                <tr key={rowKey} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-2 py-2 align-middle text-[11px] text-slate-500">{i + 1}</td>
                  <td className="px-2 py-2 align-middle text-[11px] text-slate-700 whitespace-nowrap">{x.createdAt || "-"}</td>
                  <td className="px-2 py-2 align-middle text-[11px] font-medium text-slate-800 whitespace-nowrap">{x.createdBy || "-"}</td>
                  <td className="px-2 py-2 align-middle text-[11px] font-mono text-slate-800 whitespace-nowrap">{x.ean}</td>
                  <td className="px-2 py-2 align-middle text-[11px] font-semibold text-slate-800" title={x.modeloReferencia}>
                    {x.modeloReferencia}
                  </td>
                  <td className="px-2 py-2 align-middle text-[11px] text-slate-700 whitespace-nowrap">{x.fabricante}</td>
                  <td className="px-2 py-2 align-middle text-[11px] text-slate-700 whitespace-nowrap" title={codigosNf.join(", ")}>
                    {codigosNfText}
                  </td>
                  <td className="px-2 py-2 align-middle text-right">
                    <button
                      type="button"
                      onClick={() => onSelect(x, { updateCurrentRecord: false })}
                      disabled={isSubmitting || deleteBusy}
                      className="h-8 px-2.5 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      CARREGAR
                    </button>
                  </td>
                  <td className="px-2 py-2 align-middle text-right">
                    <IconBtn
                      title="Alterar"
                      variant="primary"
                      disabled={isSubmitting || deleteBusy}
                      onClick={() => iniciarEdicao(x)}
                    >
                      <Pencil size={16} />
                    </IconBtn>
                  </td>
                  <td className="px-2 py-2 align-middle text-right">
                    <IconBtn
                      title="Excluir"
                      variant="danger"
                      disabled={isSubmitting || deleteBusy}
                      onClick={() => setDeleteTarget(x)}
                    >
                      <Trash2 size={16} />
                    </IconBtn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ModalShell
        open={!!deleteTarget}
        title="Confirmar exclusão"
        subtitle="Esta ação remove o cadastro da lista e do banco."
        onClose={() => {
          if (busyDeleteKey) return;
          setDeleteTarget(null);
        }}
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-[12px] text-slate-700">
            Excluir o EAN/GTIN <span className="font-semibold">{deleteTarget?.ean || "-"}</span>?
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 space-y-1">
            <div>
              <span className="font-semibold">Modelo:</span> {deleteTarget?.modeloReferencia || "-"}
            </div>
            <div>
              <span className="font-semibold">Fabricante:</span> {deleteTarget?.fabricante || "-"}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={!!busyDeleteKey}
              onClick={() => setDeleteTarget(null)}
              className="px-3 h-9 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              type="button"
              disabled={!!busyDeleteKey || !deleteTarget}
              onClick={() => {
                if (deleteTarget) void excluir(deleteTarget);
              }}
              className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              EXCLUIR
            </button>
          </div>
        </div>
      </ModalShell>
    </ModalShell>
  );
};

const ModalCodigosNF: React.FC<{
  open: boolean;
  master: Master;
  codigosNF: CodigoNF[];
  nfAtual: string;
  revendaAtual: string;
  mensagem: string;
  onClose: () => void;
  onChangeNF: (v: string) => void;
  onChangeRevenda: (v: string) => void;
  onPesquisarRevenda: () => void;
  onAdd: () => void;
  onRemover: (id: number) => void;
  onEditar: (id: number) => void;
}> = ({ open, master, codigosNF, nfAtual, revendaAtual, mensagem, onClose, onChangeNF, onChangeRevenda, onPesquisarRevenda, onAdd, onRemover, onEditar }) => {
  const [q, setQ] = useState("");
  const [fRevenda, setFRevenda] = useState<string>("TODOS");
  const deleteTarget = null as Master | null;
  const busyDeleteKey = null as string | null;
  const setDeleteTarget = (_value: Master | null) => { };
  const excluir = async (_item: Master) => { };

  useEffect(() => {
    if (!open) {
      setQ("");
      setFRevenda("TODOS");
    }
  }, [open]);

  const revendas = useMemo(() => {
    const s = new Set<string>();
    codigosNF.forEach((x) => {
      const r = upper(x.revenda);
      if (r) s.add(r);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [codigosNF]);

  const lista = useMemo(() => {
    const qq = upper(q);
    return codigosNF.filter((x) => {
      if (fRevenda !== "TODOS" && upper(x.revenda) !== fRevenda) return false;
      if (!qq) return true;
      const hay = `${x.createdAt || ""} ${x.createdBy || ""} ${x.codigo || ""} ${x.revenda || ""}`;
      return upper(hay).includes(qq);
    });
  }, [codigosNF, q, fRevenda]);

  return (
    <ModalShell open={open} title="Cadastro de Códigos NF" subtitle={`EAN / GTIN: ${master.ean || "-"}`} onClose={onClose} maxW="max-w-5xl">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 sm:col-span-4 md:col-span-3 lg:col-span-2 flex">
          <button
            type="button"
            onClick={onPesquisarRevenda}
            className="h-9 w-full px-3 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white hover:bg-slate-50 inline-flex items-center justify-center gap-2 text-slate-700"
          >
            <Search size={16} />
            PESQUISAR
          </button>
        </div>
        <div className="col-span-12 sm:col-span-8 md:col-span-5 lg:col-span-6 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">REVENDA/CLIENTE</label>
          <input
            value={revendaAtual}
            onChange={(e) => onChangeRevenda(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
          />
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-2 lg:col-span-2 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">CÓDIGO NF</label>
          <input
            value={nfAtual}
            onChange={(e) => onChangeNF(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
          />
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-2 lg:col-span-2 flex sm:justify-end">
          <button
            type="button"
            onClick={onAdd}
            className="w-full md:w-auto px-3 h-9 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            INCLUIR
          </button>
        </div>
      </div>

      {mensagem && <div className="text-[12px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{mensagem}</div>}

      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 md:col-span-7 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">PESQUISA GERAL</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por data, incluído por, revenda/cliente ou código NF"
            className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <div className="col-span-12 md:col-span-5 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">FILTRO (REVENDA/CLIENTE)</label>
          <select
            value={fRevenda}
            onChange={(e) => setFRevenda(e.target.value)}
            className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="TODOS">TODOS</option>
            {revendas.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {!lista.length && (
          <div className="rounded-2xl border border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
            Nenhum Código NF encontrado.
          </div>
        )}
        {lista.map((x, i) => (
          <div key={x.id} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Registro #{i + 1}</div>
                <div className="text-[12px] font-semibold text-slate-800 break-words">{x.revenda || "-"}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <IconBtn title="Alterar" variant="primary" onClick={() => onEditar(x.id)}>
                  <Pencil size={16} />
                </IconBtn>
                <IconBtn title="Excluir" variant="danger" onClick={() => onRemover(x.id)}>
                  <Trash2 size={16} />
                </IconBtn>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="min-w-0">
                <div className="text-slate-400 uppercase tracking-wide">Data</div>
                <div className="text-slate-700">{x.createdAt || "-"}</div>
              </div>
              <div className="min-w-0">
                <div className="text-slate-400 uppercase tracking-wide">Incluído por</div>
                <div className="text-slate-700 break-all">{x.createdBy || "-"}</div>
              </div>
              <div className="min-w-0">
                <div className="text-slate-400 uppercase tracking-wide">Código NF</div>
                <div className="text-slate-800 font-medium break-all">{x.codigo || "-"}</div>
              </div>
              <div className="min-w-0">
                <div className="text-slate-400 uppercase tracking-wide">Revenda/cliente</div>
                <div className="text-slate-800 font-medium break-words">{x.revenda || "-"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block rounded-2xl border border-slate-200 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[760px] border-collapse text-xs table-auto">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left w-8">#</th>
              <th className="px-1.5 py-2 text-left w-24">Data</th>
              <th className="px-1.5 py-2 text-left w-40">Incluído por</th>
              <th className="px-1.5 py-2 text-left w-32">Código NF</th>
              <th className="px-2 py-2 text-left">Revenda/cliente</th>
              <th className="px-1.5 py-2 text-right w-16">Alterar</th>
              <th className="px-1.5 py-2 text-right w-16">Excluir</th>
            </tr>
          </thead>
          <tbody>
            {!lista.length && (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-center text-[11px] text-slate-400">
                  Nenhum Código NF encontrado.
                </td>
              </tr>
            )}
            {lista.map((x, i) => (
              <tr key={x.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-500">{i + 1}</td>
                <td className="px-1.5 py-2 align-middle text-[11px] text-slate-700 whitespace-nowrap">{x.createdAt || "-"}</td>
                <td className="px-1.5 py-2 align-middle text-[11px] font-medium text-slate-800 break-all">{x.createdBy || "-"}</td>
                <td className="px-1.5 py-2 align-middle text-[11px] text-slate-800 whitespace-nowrap">{x.codigo}</td>
                <td className="px-2 py-2 align-middle text-[11px] font-semibold text-slate-800 break-words" title={x.revenda}>
                  {x.revenda}
                </td>
                <td className="px-1.5 py-2 align-middle text-right">
                  <IconBtn title="Alterar" variant="primary" onClick={() => onEditar(x.id)}>
                    <Pencil size={16} />
                  </IconBtn>
                </td>
                <td className="px-1.5 py-2 align-middle text-right">
                  <IconBtn title="Excluir" variant="danger" onClick={() => onRemover(x.id)}>
                    <Trash2 size={16} />
                  </IconBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalShell
        open={!!deleteTarget}
        title="Confirmar exclusão"
        subtitle="Esta ação remove o cadastro da lista e do banco."
        onClose={() => {
          if (busyDeleteKey) return;
          setDeleteTarget(null);
        }}
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-[12px] text-slate-700">
            Excluir o EAN/GTIN <span className="font-semibold">{deleteTarget?.ean || "-"}</span>?
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 space-y-1">
            <div>
              <span className="font-semibold">Modelo:</span> {deleteTarget?.modeloReferencia || "-"}
            </div>
            <div>
              <span className="font-semibold">Fabricante:</span> {deleteTarget?.fabricante || "-"}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={!!busyDeleteKey}
              onClick={() => setDeleteTarget(null)}
              className="px-3 h-9 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              type="button"
              disabled={!!busyDeleteKey || !deleteTarget}
              onClick={() => {
                if (deleteTarget) void excluir(deleteTarget);
              }}
              className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              EXCLUIR
            </button>
          </div>
        </div>
      </ModalShell>
    </ModalShell>
  );
};

const ModalPecas: React.FC<{
  open: boolean;
  title: string;
  master: Master;
  modeloFabricante?: string;
  form: { codigoPeca?: string; descricao: string };
  mensagem: string;
  emptyText: string;
  addLabel: string;
  onClose: () => void;
  onChangeCodigo?: (v: string) => void;
  onChangeDescricao: (v: string) => void;
  onAdd: () => void;
  lista: PecaBase[];
  onRemover: (id: number) => void;
  sugestoes?: string[];
  suggestionRows?: ProductReferenceSuggestionItem[];
  suggestionCategory?: ProductSuggestionCategory;
  onCreateSuggestion?: (category: ProductSuggestionCategory, value: string) => Promise<void>;
  onUpdateSuggestion?: (id: string, category: ProductSuggestionCategory, value: string) => Promise<void>;
  onDeleteSuggestion?: (id: string, category: ProductSuggestionCategory) => Promise<void>;
}> = ({
  open,
  title,
  master,
  modeloFabricante,
  form,
  mensagem,
  emptyText,
  addLabel,
  onClose,
  onChangeCodigo,
  onChangeDescricao,
  onAdd,
  lista,
  onRemover,
  sugestoes,
  suggestionRows,
  suggestionCategory,
  onCreateSuggestion,
  onUpdateSuggestion,
  onDeleteSuggestion,
}) => {
    const [suggestionMsg, setSuggestionMsg] = useState("");
    const [suggestionBusy, setSuggestionBusy] = useState(false);
    const [suggestionDialog, setSuggestionDialog] = useState<null | { mode: "create" | "edit"; id?: string }>(null);
    const [suggestionDraft, setSuggestionDraft] = useState("");
    const [selectedSuggestionId, setSelectedSuggestionId] = useState("");
    const [suggestionDeleteTarget, setSuggestionDeleteTarget] = useState<null | { id: string; value: string }>(null);

    const suggestionEntries = useMemo(() => {
      if (Array.isArray(suggestionRows) && suggestionRows.length > 0) {
        return suggestionRows
          .filter((item) => !!norm(item?.value))
          .map((item) => ({
            id: norm(item.id),
            value: norm(item.value),
            editable: !!norm(item.id) && !norm(item.id).startsWith("fallback:"),
          }));
      }

      return (sugestoes || []).map((value, index) => ({
        id: `fallback:${index}:${norm(value)}`,
        value: norm(value),
        editable: false,
      }));
    }, [sugestoes, suggestionRows]);

    useEffect(() => {
      if (!open) {
        setSuggestionMsg("");
        setSuggestionBusy(false);
        setSuggestionDialog(null);
        setSuggestionDraft("");
        setSelectedSuggestionId("");
        setSuggestionDeleteTarget(null);
      }
    }, [open]);

    useEffect(() => {
      if (!suggestionEntries.length) {
        setSelectedSuggestionId("");
        return;
      }

      setSelectedSuggestionId((prev) => {
        if (prev && suggestionEntries.some((item) => item.id === prev)) return prev;
        const fromDescricao = suggestionEntries.find(
          (item) => normalizeLookup(item.value) === normalizeLookup(form.descricao)
        );
        return fromDescricao?.id || suggestionEntries[0].id;
      });
    }, [suggestionEntries, form.descricao]);

    const selectedSuggestion = useMemo(
      () => suggestionEntries.find((item) => item.id === selectedSuggestionId) || null,
      [suggestionEntries, selectedSuggestionId]
    );

    const openCreateSuggestionDialog = () => {
      setSuggestionDraft(norm(form.descricao));
      setSuggestionDialog({ mode: "create" });
    };

    const openEditSuggestionDialog = (id: string, currentValue: string) => {
      if (!id || id.startsWith("fallback:")) {
        setSuggestionMsg("Essa sugestao nao pode ser alterada sem tabela no banco.");
        return;
      }
      setSuggestionDraft(norm(currentValue));
      setSuggestionDialog({ mode: "edit", id });
    };

    const closeSuggestionDialog = () => {
      if (suggestionBusy) return;
      setSuggestionDialog(null);
    };

    const handleSaveSuggestionDialog = async () => {
      if (!suggestionDialog || !suggestionCategory) return;
      const cleaned = norm(suggestionDraft);
      if (!cleaned) {
        setSuggestionMsg("Informe um valor valido para a sugestao.");
        return;
      }

      try {
        setSuggestionBusy(true);
        if (suggestionDialog.mode === "create") {
          if (!onCreateSuggestion) return;
          await onCreateSuggestion(suggestionCategory, cleaned);
          setSuggestionMsg("Sugestao cadastrada com sucesso.");
        } else {
          if (!onUpdateSuggestion) return;
          const targetId = norm(suggestionDialog.id);
          if (!targetId || targetId.startsWith("fallback:")) {
            setSuggestionMsg("Essa sugestao nao pode ser alterada sem tabela no banco.");
            return;
          }
          await onUpdateSuggestion(targetId, suggestionCategory, cleaned);
          setSuggestionMsg("Sugestao alterada com sucesso.");
        }
        setSuggestionDialog(null);
      } catch (error: any) {
        const fallbackMessage = suggestionDialog.mode === "create" ? "Falha ao cadastrar sugestao." : "Falha ao alterar sugestao.";
        setSuggestionMsg(String(error?.message || fallbackMessage));
      } finally {
        setSuggestionBusy(false);
      }
    };

    const handleDeleteSuggestion = (id: string, value: string) => {
      if (!onDeleteSuggestion || !suggestionCategory) return;
      if (!id || id.startsWith("fallback:")) {
        setSuggestionMsg("Essa sugestao nao pode ser excluida sem tabela no banco.");
        return;
      }

      setSuggestionDeleteTarget({ id, value });
    };

    const confirmDeleteSuggestion = async () => {
      if (!onDeleteSuggestion || !suggestionCategory || !suggestionDeleteTarget) return;
      try {
        setSuggestionBusy(true);
        await onDeleteSuggestion(suggestionDeleteTarget.id, suggestionCategory);
        setSuggestionMsg("Sugestao excluida com sucesso.");
        setSuggestionDeleteTarget(null);
      } catch (error: any) {
        setSuggestionMsg(String(error?.message || "Falha ao excluir sugestao."));
      } finally {
        setSuggestionBusy(false);
      }
    };

    return (
      <ModalShell
        open={open}
        title={title}
        subtitle={`EAN / GTIN: ${master.ean || "-"}${modeloFabricante ? ` • Modelo Fabricante: ${modeloFabricante}` : ""}`}
        onClose={onClose}
        maxW="max-w-4xl"
      >
        <div className="grid grid-cols-12 gap-2 items-end">
          {onChangeCodigo ? (
            <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-600 tracking-wide">CÓDIGO PEÇA</label>
              <input
                value={form.codigoPeca || ""}
                onChange={(e) => onChangeCodigo(e.target.value)}
                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
              />
            </div>
          ) : null}

          <div className={`col-span-12 ${onChangeCodigo ? "md:col-span-7" : "md:col-span-9"} flex flex-col gap-1.5`}>
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">DESCRIÇÃO</label>
            <input
              value={form.descricao}
              onChange={(e) => onChangeDescricao(e.target.value)}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div className={`col-span-12 ${onChangeCodigo ? "md:col-span-2" : "md:col-span-3"} flex sm:justify-end`}>
            <button
              type="button"
              onClick={onAdd}
              className="w-full sm:w-auto px-3 h-9 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              {addLabel}
            </button>
          </div>
        </div>

        {(suggestionEntries.length > 0 || !!onCreateSuggestion) && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 md:col-span-6 flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-600 tracking-wide">SUGESTOES</label>
                <select
                  value={selectedSuggestionId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedSuggestionId(nextId);
                    const picked = suggestionEntries.find((item) => item.id === nextId);
                    if (picked) {
                      onChangeDescricao(picked.value);
                      setSuggestionMsg("");
                    }
                  }}
                  disabled={suggestionBusy || !suggestionEntries.length}
                  className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  {!suggestionEntries.length ? <option value="">Sem sugestoes cadastradas</option> : null}
                  {suggestionEntries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-12 md:col-span-6 flex flex-wrap gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSuggestion) return;
                    onChangeDescricao(selectedSuggestion.value);
                    setSuggestionMsg("");
                  }}
                  disabled={!selectedSuggestion || suggestionBusy}
                  className="px-3 h-8 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  USAR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSuggestion) return;
                    openEditSuggestionDialog(selectedSuggestion.id, selectedSuggestion.value);
                  }}
                  disabled={!selectedSuggestion || !selectedSuggestion.editable || !onUpdateSuggestion || !suggestionCategory || suggestionBusy}
                  className="px-3 h-8 rounded-xl text-[11px] font-semibold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                >
                  <Pencil size={12} />
                  EDITAR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSuggestion) return;
                    handleDeleteSuggestion(selectedSuggestion.id, selectedSuggestion.value);
                  }}
                  disabled={!selectedSuggestion || !selectedSuggestion.editable || !onDeleteSuggestion || !suggestionCategory || suggestionBusy}
                  className="px-3 h-8 rounded-xl text-[11px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  EXCLUIR
                </button>
                {onCreateSuggestion && suggestionCategory ? (
                <button
                  type="button"
                  onClick={openCreateSuggestionDialog}
                  disabled={suggestionBusy}
                  className="px-3 h-8 rounded-xl text-[11px] font-semibold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  CADASTRAR SUGESTAO
                </button>
                ) : null}
              </div>
            </div>

            {suggestionMsg ? (
              <div className="text-[12px] text-slate-700 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
                {suggestionMsg}
              </div>
            ) : null}
          </div>
        )}

        {suggestionDeleteTarget ? (
          <ModalShell
            open={!!suggestionDeleteTarget}
            title="Excluir sugestao"
            subtitle={`Confirma excluir a sugestao "${suggestionDeleteTarget.value}"?`}
            onClose={() => {
              if (suggestionBusy) return;
              setSuggestionDeleteTarget(null);
            }}
            maxW="max-w-md"
          >
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuggestionDeleteTarget(null)}
                disabled={suggestionBusy}
                className="px-3 h-9 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteSuggestion()}
                disabled={suggestionBusy}
                className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {suggestionBusy ? "EXCLUINDO..." : "EXCLUIR"}
              </button>
            </div>
          </ModalShell>
        ) : null}

        {suggestionDialog ? (
          <ModalShell
            open={!!suggestionDialog}
            title={suggestionDialog.mode === "create" ? "Cadastrar sugestao" : "Editar sugestao"}
            subtitle={suggestionDialog.mode === "create" ? "Digite o valor da nova sugestao." : "Atualize o valor da sugestao selecionada."}
            onClose={closeSuggestionDialog}
            maxW="max-w-md"
          >
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-600 tracking-wide">VALOR DA SUGESTAO</label>
                <input
                  value={suggestionDraft}
                  onChange={(event) => setSuggestionDraft(event.target.value)}
                  disabled={suggestionBusy}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeSuggestionDialog}
                  disabled={suggestionBusy}
                  className="px-3 h-9 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveSuggestionDialog()}
                  disabled={suggestionBusy}
                  className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {suggestionBusy ? "SALVANDO..." : suggestionDialog.mode === "create" ? "CADASTRAR" : "SALVAR"}
                </button>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {mensagem && <div className="text-[12px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{mensagem}</div>}

        <div className="space-y-3 md:hidden">
          {!lista.length && (
            <div className="rounded-2xl border border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
              {emptyText}
            </div>
          )}
          {lista.map((x, i) => (
            <div key={x.id} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Registro #{i + 1}</div>
                  <div className="mt-1 text-[12px] font-semibold text-slate-800 break-words">{x.descricao || "-"}</div>
                </div>
                <IconBtn title="Excluir" variant="danger" onClick={() => onRemover(x.id)}>
                  <Trash2 size={16} />
                </IconBtn>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="min-w-0">
                  <div className="text-slate-400 uppercase tracking-wide">Data</div>
                  <div className="text-slate-700">{x.createdAt || "-"}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-slate-400 uppercase tracking-wide">Incluido por</div>
                  <div className="text-slate-700 break-all">{x.createdBy || "-"}</div>
                </div>
                {onChangeCodigo ? (
                  <div className="min-w-0 col-span-2">
                    <div className="text-slate-400 uppercase tracking-wide">Codigo peca</div>
                    <div className="font-mono text-slate-800 break-all">{x.codigoPeca || "-"}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block rounded-2xl border border-slate-200 overflow-x-auto overflow-y-auto max-h-[320px]">
          <table className="w-full border-collapse text-xs min-w-[760px]">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left w-10">#</th>
                <th className="px-1.5 py-1 text-left w-24">Data</th>
                <th className="px-1.5 py-1 text-left w-24">Incluído por</th>
                {onChangeCodigo ? <th className="px-1.5 py-1 text-left w-24">Código peça</th> : null}
                <th className="px-2 py-1.5 text-left">Descrição</th>
                <th className="px-2 py-1.5 text-right w-14">Excluir</th>
              </tr>
            </thead>
            <tbody>
              {!lista.length && (
                <tr>
                  <td colSpan={onChangeCodigo ? 6 : 5} className="px-3 py-3 text-center text-[11px] text-slate-400">
                    {emptyText}
                  </td>
                </tr>
              )}
              {lista.map((x, i) => (
                <tr key={x.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-2 py-1.5 align-middle text-[11px] text-slate-500">{i + 1}</td>
                  <td className="px-1.5 py-1 align-middle text-[11px] text-slate-700 whitespace-nowrap">{x.createdAt || "-"}</td>
                  <td className="px-1.5 py-1 align-middle text-[11px] font-medium text-slate-800 whitespace-nowrap">{x.createdBy || "-"}</td>
                  {onChangeCodigo ? <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800">{x.codigoPeca}</td> : null}
                  <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800">{x.descricao}</td>
                  <td className="px-2 py-1.5 align-middle text-right">
                    <IconBtn title="Excluir" variant="danger" onClick={() => onRemover(x.id)}>
                      <Trash2 size={16} />
                    </IconBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ModalShell>
    );
  };

const CadastroNF_EAN_Modelo = () => {
  const [registros, setRegistros] = useState<any[]>([]);
  const [eansCad, setEansCad] = useState<Master[]>([]);

  const autoLoadRef = useRef("");
  const returnedClientRef = useRef("");
  const [usuarioLogado, setUsuarioLogado] = useState(DEFAULT_CREATED_BY);
  const [usuarioInicializado, setUsuarioInicializado] = useState(false);
  const [revendasClientes, setRevendasClientes] = useState<RevendaClienteOption[]>([]);
  const [revendasLoading, setRevendasLoading] = useState(false);
  const [revendasErro, setRevendasErro] = useState("");
  const [fabricantesEntidades, setFabricantesEntidades] = useState<string[]>([]);
  const [suggestionRows, setSuggestionRows] = useState<ProductReferenceSuggestionItem[]>(() =>
    buildFallbackSuggestionItemsFromCatalog(mergeProductSuggestionCatalog())
  );

  const [master, setMaster] = useState<Master>({ id: undefined, ean: "", modeloReferencia: "", fabricante: "" });
  const [allowSaveIntoCurrentRecord, setAllowSaveIntoCurrentRecord] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);
  const [resumoSucesso, setResumoSucesso] = useState<Master | null>(null);

  const [mostrarAjuda, setMostrarAjuda] = useState(false);

  const [mostrarLookupEAN, setMostrarLookupEAN] = useState(false);

  const [mostrarPopupNF, setMostrarPopupNF] = useState(false);
  const [codigosNF, setCodigosNF] = useState<CodigoNF[]>([]);
  const [nfAtual, setNfAtual] = useState("");
  const [revendaNFAtual, setRevendaNFAtual] = useState("");
  const [mensagemNF, setMensagemNF] = useState("");
  const [editNfId, setEditNfId] = useState<number | null>(null);
  const [mostrarLookupRevenda, setMostrarLookupRevenda] = useState(false);

  const [modelosFabricante, setModelosFabricante] = useState<ModeloFabricante[]>([]);
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState<number | null>(null);
  const [modeloAtual, setModeloAtual] = useState("");
  const [codigoProdutoAtual, setCodigoProdutoAtual] = useState("");
  const [linhaAtual, setLinhaAtual] = useState("");
  const [linhaSuggestionBusy, setLinhaSuggestionBusy] = useState(false);
  const [linhaSuggestionModal, setLinhaSuggestionModal] = useState<null | { mode: "create" | "edit"; id?: string }>(null);
  const [linhaSuggestionDraft, setLinhaSuggestionDraft] = useState("");
  const [selectedLinhaSuggestionId, setSelectedLinhaSuggestionId] = useState("");
  const [mostrarConfirmacaoExclusaoLinha, setMostrarConfirmacaoExclusaoLinha] = useState(false);
  const [mensagemModelo, setMensagemModelo] = useState("");
  const [editModeloId, setEditModeloId] = useState<number | null>(null);

  const [mostrarPopupEmbalagem, setMostrarPopupEmbalagem] = useState(false);
  const [embalagens, setEmbalagens] = useState<PecaBase[]>([]);
  const [formEmbalagem, setFormEmbalagem] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });
  const [mensagemEmbalagem, setMensagemEmbalagem] = useState("");

  const [mostrarPopupAcessorios, setMostrarPopupAcessorios] = useState(false);
  const [acessorios, setAcessorios] = useState<PecaBase[]>([]);
  const [formAcessorio, setFormAcessorio] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });
  const [mensagemAcessorio, setMensagemAcessorio] = useState("");

  const [mostrarPopupEstetica, setMostrarPopupEstetica] = useState(false);
  const [esteticas, setEsteticas] = useState<PecaBase[]>([]);
  const [formEstetica, setFormEstetica] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });
  const [mensagemEstetica, setMensagemEstetica] = useState("");

  const [mostrarPopupFuncionalPeca, setMostrarPopupFuncionalPeca] = useState(false);
  const [funcionaisPeca, setFuncionaisPeca] = useState<PecaBase[]>([]);
  const [formFuncionalPeca, setFormFuncionalPeca] = useState<{ codigoPeca: string; descricao: string }>({
    codigoPeca: "",
    descricao: "",
  });
  const [mensagemFuncionalPeca, setMensagemFuncionalPeca] = useState("");

  const [mostrarPopupFuncionalidade, setMostrarPopupFuncionalidade] = useState(false);
  const [funcionalidades, setFuncionalidades] = useState<PecaBase[]>([]);
  const [formFuncionalidade, setFormFuncionalidade] = useState<{ descricao: string }>({ descricao: "" });
  const [mensagemFuncionalidade, setMensagemFuncionalidade] = useState("");

  const [produtoDocs, setProdutoDocs] = useState<Record<ProdutoDocKey, FileMeta[]>>(createEmptyProdutoDocs);

  const [modeloDocs, setModeloDocs] = useState<Record<number, Record<ModeloDocKey, FileMeta[]>>>({});
  const [itemFotos, setItemFotos] = useState<Record<string, FileMeta[]>>({});

  const [filtroModeloReferencia, setFiltroModeloReferencia] = useState(true);
  const [filtroModeloFabricante, setFiltroModeloFabricante] = useState(true);
  const [filtroModeloFabricanteId, setFiltroModeloFabricanteId] = useState<number | "TODOS">("TODOS");

  useEffect(() => {
    if (modeloSelecionadoId && filtroModeloFabricanteId === "TODOS") setFiltroModeloFabricanteId(modeloSelecionadoId);
  }, [modeloSelecionadoId, filtroModeloFabricanteId]);

  useEffect(() => {
    if (!modeloSelecionadoId && modelosFabricante.length > 0) {
      setModeloSelecionadoId(modelosFabricante[0].id);
    }
  }, [modeloSelecionadoId, modelosFabricante]);

  const [arquivosCtx, setArquivosCtx] = useState<ModalArquivosKey | null>(null);
  const usuarioAtual = norm(usuarioLogado) || DEFAULT_CREATED_BY;

  const fabricantesConhecidos = useMemo(
    () =>
      uniqueSorted([
        ...fabricantesEntidades,
        ...registros.map((item) => item?.fabricante),
        ...eansCad.map((item) => item?.fabricante),
        master.fabricante,
      ]),
    [fabricantesEntidades, registros, eansCad, master.fabricante]
  );

  const suggestionCatalog = useMemo<ProductSuggestionCatalog>(
    () => buildProductSuggestionCatalogFromItems(suggestionRows),
    [suggestionRows]
  );

  const suggestionRowsByCategory = useMemo(
    () => ({
      linhas: suggestionRows.filter((item) => item.category === "linhas"),
      funcionalidades: suggestionRows.filter((item) => item.category === "funcionalidades"),
      esteticas: suggestionRows.filter((item) => item.category === "esteticas"),
      embalagens: suggestionRows.filter((item) => item.category === "embalagens"),
      acessorios: suggestionRows.filter((item) => item.category === "acessorios"),
      pecas_funcionais: suggestionRows.filter((item) => item.category === "pecas_funcionais"),
    }),
    [suggestionRows]
  );

  const linhaSuggestionRows = useMemo(
    () => dedupeSuggestionRowsByLookup(suggestionRowsByCategory.linhas),
    [suggestionRowsByCategory.linhas]
  );

  useEffect(() => {
    if (!linhaSuggestionRows.length) {
      setSelectedLinhaSuggestionId("");
      return;
    }

    setSelectedLinhaSuggestionId((prev) => {
      if (prev && linhaSuggestionRows.some((item) => item.id === prev)) return prev;
      const fromCurrentLinha = linhaSuggestionRows.find(
        (item) => normalizeLookup(item.value) === normalizeLookup(linhaAtual)
      );
      return fromCurrentLinha?.id || linhaSuggestionRows[0].id;
    });
  }, [linhaSuggestionRows, linhaAtual]);

  const selectedLinhaSuggestion = useMemo(
    () => linhaSuggestionRows.find((item) => item.id === selectedLinhaSuggestionId) || null,
    [linhaSuggestionRows, selectedLinhaSuggestionId]
  );

  const linhasConhecidas = useMemo(
    () => uniqueSortedLookup([...linhaSuggestionRows.map((item) => item.value), ...modelosFabricante.map((item) => item?.linha)]),
    [linhaSuggestionRows, modelosFabricante]
  );

  const sugestoesEmbalagem = useMemo(() => suggestionCatalog.embalagens, [suggestionCatalog.embalagens]);

  const sugestoesAcessorios = useMemo(() => suggestionCatalog.acessorios, [suggestionCatalog.acessorios]);

  const sugestoesEsteticas = useMemo(() => suggestionCatalog.esteticas, [suggestionCatalog.esteticas]);

  const sugestoesFuncionais = useMemo(
    () => suggestionCatalog.pecas_funcionais,
    [suggestionCatalog.pecas_funcionais]
  );

  const sugestoesFuncionalidades = useMemo(
    () => suggestionCatalog.funcionalidades,
    [suggestionCatalog.funcionalidades]
  );

  const catalogoPecasPorCodigo = useMemo(() => {
    const map = new Map<string, string>();
    const registrar = (items: PecaBase[]) => {
      items.forEach((item) => {
        const codigo = upper(item?.codigoPeca || "");
        const descricao = norm(item?.descricao);
        if (codigo && descricao && !map.has(codigo)) map.set(codigo, descricao);
      });
    };

    registrar(embalagens);
    registrar(acessorios);
    registrar(esteticas);
    registrar(funcionaisPeca);
    registros.forEach((item) => {
      registrar(Array.isArray(item?.embalagens) ? item.embalagens : []);
      registrar(Array.isArray(item?.acessorios) ? item.acessorios : []);
      registrar(Array.isArray(item?.esteticas) ? item.esteticas : []);
      registrar(Array.isArray(item?.funcionaisPeca) ? item.funcionaisPeca : []);
    });

    return map;
  }, [embalagens, acessorios, esteticas, funcionaisPeca, registros]);

  const upsertRegistroCache = (registro: any) => {
    const rowKey = getRowIdentityKey(registro);
    if (!rowKey) return;
    setRegistros((prev) => {
      const semMesmoRegistro = prev.filter((item) => getRowIdentityKey(item) !== rowKey);
      return [registro, ...semMesmoRegistro];
    });
  };

  const upsertMasterCache = (item: Master) => {
    const rowKey = getRowIdentityKey(item);
    if (!rowKey) return;
    setEansCad((prev) => {
      const semMesmoRegistro = prev.filter((m) => getRowIdentityKey(m) !== rowKey);
      return [item, ...semMesmoRegistro];
    });
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
    let active = true;

    const carregarReferencias = async () => {
      setRevendasLoading(true);
      setRevendasErro("");
      try {
        const payload = await ProductApiService.getReferences();

        if (!active) return;

        setRevendasClientes(Array.isArray(payload.revendasClientes) ? payload.revendasClientes : []);
        setFabricantesEntidades(Array.isArray(payload.fabricantes) ? payload.fabricantes : []);
        setSuggestionRows(
          Array.isArray(payload.suggestionItems) && payload.suggestionItems.length > 0
            ? payload.suggestionItems
            : buildFallbackSuggestionItemsFromCatalog(payload.suggestions || mergeProductSuggestionCatalog())
        );
      } catch (error: any) {
        if (!active) return;
        console.error("Falha ao carregar dados reais de apoio:", error);
        setRevendasErro("Falha ao carregar clientes, filiais, fabricantes e sugestoes.");
      } finally {
        if (active) setRevendasLoading(false);
      }
    };

    void carregarReferencias();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clientName = norm(new URLSearchParams(window.location.search).get("clientName"));
    if (!clientName || returnedClientRef.current === clientName) return;

    returnedClientRef.current = clientName;
    setRevendaNFAtual(clientName);
    setMensagemNF(`Cliente ${clientName} carregado. Informe ou confirme o Codigo NF.`);
    setMostrarPopupNF(true);
    setMostrarLookupRevenda(false);
  }, []);

  useEffect(() => {
    let active = true;

    if (!usuarioInicializado) {
      return () => {
        active = false;
      };
    }

    const carregarUltimosProdutos = async () => {
      try {
        const latest: any[] = await ProductApiService.getLatestProducts(200);
        if (!active || !Array.isArray(latest) || latest.length === 0) return;

        const mapped = latest.map((item) => mapApiProductToRegistro(item, usuarioAtual)).filter((item) => !!norm(item?.ean));
        if (mapped.length === 0) return;

        setRegistros((prev) => {
          const map = new Map<string, any>();
          [...prev, ...mapped].forEach((item) => {
            const key = getRowIdentityKey(item);
            if (key) map.set(key, item);
          });
          return Array.from(map.values());
        });

        setEansCad((prev) => {
          const map = new Map<string, Master>();
          [...prev, ...mapped.map((item) => toMasterFromRegistro(item, usuarioAtual))].forEach((item) => {
            const key = getRowIdentityKey(item);
            if (key) map.set(key, item);
          });
          return Array.from(map.values());
        });
      } catch (error) {
        console.error("Falha ao carregar produtos salvos:", error);
      }
    };

    void carregarUltimosProdutos();
    return () => {
      active = false;
    };
  }, [usuarioAtual, usuarioInicializado]);

  const irParaCadastroCliente = ({ nome, documento }: CreateRevendaClienteInput) => {
    const params = new URLSearchParams();
    params.set("returnTo", "/home/produtos");
    if (norm(nome)) params.set("prefillName", norm(nome));
    if (norm(documento)) params.set("prefillDocument", norm(documento));
    window.location.href = `/home/cadastro-clientes?${params.toString()}`;
  };

  const cadastrarSugestao = async (category: ProductSuggestionCategory, value: string) => {
    const cleaned = norm(value);
    if (!cleaned) {
      throw new Error("Informe o valor da sugestao.");
    }

    const created = await ProductApiService.createReferenceSuggestion(category, cleaned);
    setSuggestionRows((prev) => {
      const withoutSameId = prev.filter((item) => item.id !== created.suggestion.id);
      const withoutSameValue = withoutSameId.filter(
        (item) =>
          item.category !== created.suggestion.category ||
          normalizeLookup(item.value) !== normalizeLookup(created.suggestion.value)
      );
      return [created.suggestion, ...withoutSameValue];
    });
  };

  const editarSugestao = async (
    id: string,
    category: ProductSuggestionCategory,
    value: string
  ) => {
    const cleanedId = norm(id);
    const cleanedValue = norm(value);
    if (!cleanedId || cleanedId.startsWith("fallback:")) {
      throw new Error("Sugestao sem ID de banco. Rode o SQL de sugestoes e recarregue a tela.");
    }

    if (!cleanedValue) {
      throw new Error("Informe o valor da sugestao.");
    }

    const updated = await ProductApiService.updateReferenceSuggestion(cleanedId, category, cleanedValue);
    setSuggestionRows((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const excluirSugestao = async (id: string) => {
    const cleanedId = norm(id);
    if (!cleanedId || cleanedId.startsWith("fallback:")) {
      throw new Error("Sugestao sem ID de banco. Rode o SQL de sugestoes e recarregue a tela.");
    }

    await ProductApiService.deleteReferenceSuggestion(cleanedId);
    setSuggestionRows((prev) => prev.filter((item) => item.id !== cleanedId));
  };

  const abrirModalCadastrarLinha = () => {
    setLinhaSuggestionDraft(norm(linhaAtual));
    setLinhaSuggestionModal({ mode: "create" });
  };

  const abrirModalEditarLinha = (id: string, value: string) => {
    const cleanedId = norm(id);
    if (!cleanedId || cleanedId.startsWith("fallback:")) {
      setMensagemModelo("Essa sugestao nao pode ser alterada sem tabela no banco.");
      return;
    }
    setLinhaSuggestionDraft(norm(value));
    setLinhaSuggestionModal({ mode: "edit", id: cleanedId });
  };

  const fecharModalLinha = () => {
    if (linhaSuggestionBusy) return;
    setLinhaSuggestionModal(null);
  };

  const salvarModalLinha = async () => {
    if (!linhaSuggestionModal) return;
    const cleanedValue = norm(linhaSuggestionDraft);
    if (!cleanedValue) {
      setMensagemModelo("Informe o valor da sugestao de linha.");
      return;
    }

    try {
      setLinhaSuggestionBusy(true);
      if (linhaSuggestionModal.mode === "create") {
        await cadastrarSugestao("linhas", cleanedValue);
        setMensagemModelo("Sugestao de linha cadastrada.");
      } else {
        const cleanedId = norm(linhaSuggestionModal.id);
        if (!cleanedId || cleanedId.startsWith("fallback:")) {
          setMensagemModelo("Essa sugestao nao pode ser alterada sem tabela no banco.");
          return;
        }
        await editarSugestao(cleanedId, "linhas", cleanedValue);
        setMensagemModelo("Sugestao de linha alterada.");
      }
      setLinhaSuggestionModal(null);
    } catch (error: any) {
      const fallbackMessage = linhaSuggestionModal.mode === "create"
        ? "Falha ao cadastrar sugestao de linha."
        : "Falha ao alterar sugestao de linha.";
      setMensagemModelo(String(error?.message || fallbackMessage));
    } finally {
      setLinhaSuggestionBusy(false);
    }
  };

  const abrirConfirmacaoExclusaoLinha = () => {
    if (!selectedLinhaSuggestion) return;
    if (selectedLinhaSuggestion.id.startsWith("fallback:")) {
      setMensagemModelo("Essa sugestao nao pode ser excluida sem tabela no banco.");
      return;
    }
    setMostrarConfirmacaoExclusaoLinha(true);
  };

  const excluirLinhaSelecionada = async () => {
    if (!selectedLinhaSuggestion) return;
    if (selectedLinhaSuggestion.id.startsWith("fallback:")) {
      setMensagemModelo("Essa sugestao nao pode ser excluida sem tabela no banco.");
      return;
    }
    try {
      setLinhaSuggestionBusy(true);
      await excluirSugestao(selectedLinhaSuggestion.id);
      setMensagemModelo("Sugestao de linha excluida.");
      setMostrarConfirmacaoExclusaoLinha(false);
    } catch (error: any) {
      setMensagemModelo(String(error?.message || "Falha ao excluir sugestao de linha."));
    } finally {
      setLinhaSuggestionBusy(false);
    }
  };

  const lookupDescricao = (codigoPeca: string) => {
    const cod = upper(codigoPeca);
    if (!cod) return "";
    const base = catalogoPecasPorCodigo.get(cod);
    if (base) return base;
    const all = [...embalagens, ...acessorios, ...esteticas, ...funcionaisPeca];
    const found = all.find((x) => upper(x.codigoPeca || "") === cod);
    return found?.descricao || "";
  };

  const masterPreenchido = useMemo(() => !!norm(master.ean) && !!norm(master.modeloReferencia), [master]);
  const modeloSelecionado = useMemo(
    () => (modeloSelecionadoId ? modelosFabricante.find((m) => m.id === modeloSelecionadoId) || null : null),
    [modeloSelecionadoId, modelosFabricante]
  );

  const existeDuplicidadeMaster = () => {
    const ean = upper(master.ean);
    const masterId = norm(master.id);
    if (!ean) return false;
    return (
      registros.some((r) => upper(r?.ean) === ean && (!masterId || norm(r?.id) !== masterId)) ||
      eansCad.some((m) => upper(m.ean) === ean && (!masterId || norm(m.id) !== masterId))
    );
  };

  const handleChangeMaster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMensagem("");

    setMaster((p) => {
      const next = { ...p, [name]: value } as Master;
      if (name === "modeloReferencia") {
        const fab = detectarFabricanteDoModelo(value, fabricantesConhecidos);
        if (fab && !norm(p.fabricante)) next.fabricante = fab;
      }
      if (name === "fabricante") next.fabricante = upper(value);
      return next;
    });
  };

  const limparVinculos = () => {
    setCodigosNF([]);
    setNfAtual("");
    setRevendaNFAtual("");
    setMensagemNF("");
    setEditNfId(null);
    setMostrarLookupRevenda(false);

    setModeloAtual("");
    setCodigoProdutoAtual("");
    setLinhaAtual("");
    setModelosFabricante([]);
    setModeloSelecionadoId(null);
    setEditModeloId(null);
    setMensagemModelo("");

    setAcessorios([]);
    setFormAcessorio({ codigoPeca: "", descricao: "" });
    setMensagemAcessorio("");

    setEmbalagens([]);
    setFormEmbalagem({ codigoPeca: "", descricao: "" });
    setMensagemEmbalagem("");

    setEsteticas([]);
    setFormEstetica({ codigoPeca: "", descricao: "" });
    setMensagemEstetica("");

    setFuncionaisPeca([]);
    setFormFuncionalPeca({ codigoPeca: "", descricao: "" });
    setMensagemFuncionalPeca("");

    setFuncionalidades([]);
    setFormFuncionalidade({ descricao: "" });
    setMensagemFuncionalidade("");

    setProdutoDocs(createEmptyProdutoDocs());
    setModeloDocs({});
    setItemFotos({});
    setArquivosCtx(null);
  };

  const carregarRegistro = (r: any, options?: { updateCurrentRecord?: boolean }) => {
    limparVinculos();
    const updateCurrentRecord = !!options?.updateCurrentRecord;

    setMaster({
      id: updateCurrentRecord ? norm(r?.id) || undefined : undefined,
      ean: String(r?.ean || ""),
      modeloReferencia: String(r?.modeloReferencia || ""),
      fabricante: String(r?.fabricante || ""),
    });
    setAllowSaveIntoCurrentRecord(updateCurrentRecord);
    setCodigosNF((r?.codigosNF || []) as CodigoNF[]);
    setModelosFabricante((r?.modelosFabricante || []) as ModeloFabricante[]);
    setModeloSelecionadoId(r?.modeloSelecionadoId || null);
    setEmbalagens((r?.embalagens || []) as PecaBase[]);
    setAcessorios((r?.acessorios || []) as PecaBase[]);
    setEsteticas((r?.esteticas || []) as PecaBase[]);
    setFuncionaisPeca((r?.funcionaisPeca || []) as PecaBase[]);
    setFuncionalidades((r?.funcionalidades || []) as PecaBase[]);
    setProdutoDocs((r?.produtoDocs || createEmptyProdutoDocs()) as Record<ProdutoDocKey, FileMeta[]>);
    setModeloDocs((r?.modeloDocs || {}) as Record<number, Record<ModeloDocKey, FileMeta[]>>);
    setItemFotos((r?.itemFotos || {}) as Record<string, FileMeta[]>);

    setMensagem(updateCurrentRecord ? "Dados carregados automaticamente." : "Cadastro base carregado. Salvar criara um novo registro.");
  };

  const carregarPorEan = async (ean: string) => {
    const ue = upper(ean);
    if (!ue) return;

    const reg = registros.find((x) => upper(x?.ean) === ue);
    if (reg) return carregarRegistro(reg, { updateCurrentRecord: false });

    const m = eansCad.find((x) => upper(x.ean) === ue);
    if (m) {
      limparVinculos();
      setMaster({ id: undefined, ean: m.ean, modeloReferencia: m.modeloReferencia, fabricante: m.fabricante });
      setAllowSaveIntoCurrentRecord(false);
      setMensagem("Cadastro base carregado. Salvar criara um novo registro.");
      return;
    }

    try {
      const remoto = await ProductApiService.getProductByEan(ue);
      if (!remoto) return;

      const registroMapeado = mapApiProductToRegistro(remoto, usuarioAtual);
      carregarRegistro(registroMapeado, { updateCurrentRecord: false });
      upsertRegistroCache(registroMapeado);
      upsertMasterCache(toMasterFromRegistro(registroMapeado, usuarioAtual));
    } catch (error) {
      console.error("Falha ao carregar produto por EAN:", error);
    }
  };

  useEffect(() => {
    const e = upper(master.ean);
    if (!e) {
      autoLoadRef.current = "";
      return;
    }

    const hit =
      registros.some((r) => upper(r?.ean) === e) ||
      eansCad.some((m) => upper(m.ean) === e);

    const shouldTryLookup = hit || e.length >= 8;
    if (!shouldTryLookup) return;
    if (autoLoadRef.current === e) return;

    autoLoadRef.current = e;
    void carregarPorEan(e);
  }, [master.ean, registros, eansCad]);

  const abrirCodigosNF = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    setMensagem("");
    setMostrarPopupNF(true);
  };

  const abrirEmbalagem = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    setMensagem("");
    setMostrarPopupEmbalagem(true);
  };

  const abrirAcessorios = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    setMensagem("");
    setMostrarPopupAcessorios(true);
  };

  const abrirEstetica = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    if (!modeloSelecionadoId && modelosFabricante.length === 0 && esteticas.length === 0) {
      return setMensagem("Selecione um Modelo Fabricante.");
    }
    setMensagem("");
    setMostrarPopupEstetica(true);
  };

  const abrirFuncionalPeca = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    if (!modeloSelecionadoId && modelosFabricante.length === 0 && funcionaisPeca.length === 0) {
      return setMensagem("Selecione um Modelo Fabricante.");
    }
    setMensagem("");
    setMostrarPopupFuncionalPeca(true);
  };

  const abrirFuncionalidade = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    setMensagem("");
    setMostrarPopupFuncionalidade(true);
  };

  const addCodigoNF = () => {
    const codigo = upper(nfAtual);
    const revenda = upper(revendaNFAtual);
    if (!codigo || !revenda) return setMensagemNF("Informe Código NF e selecione Revenda/Cliente.");

    const dup = codigosNF.some((x) => upper(x.codigo) === codigo && upper(x.revenda) === revenda && x.id !== editNfId);
    if (dup) return setMensagemNF("Código NF já cadastrado para esta revenda.");

    if (editNfId) {
      setCodigosNF((p) => p.map((x) => (x.id === editNfId ? { ...x, codigo, revenda } : x)));
      setEditNfId(null);
    } else {
      setCodigosNF((p) => [...p, { id: Date.now(), codigo, revenda, createdAt: agoraBR(), createdBy: usuarioAtual }]);
    }

    setNfAtual("");
    setRevendaNFAtual("");
    setMensagemNF("");
  };

  const editarCodigoNF = (id: number) => {
    const nf = codigosNF.find((x) => x.id === id);
    if (!nf) return;
    setEditNfId(id);
    setNfAtual(nf.codigo);
    setRevendaNFAtual(nf.revenda);
    setMensagemNF("Modo alteração: edite e clique em Incluir.");
  };

  const removerCodigoNF = (id: number) => {
    setCodigosNF((p) => p.filter((x) => x.id !== id));
    if (editNfId === id) {
      setEditNfId(null);
      setNfAtual("");
      setRevendaNFAtual("");
      setMensagemNF("");
    }
  };

  const addModelo = () => {
    const nome = norm(modeloAtual);
    const codigoProduto = upper(codigoProdutoAtual);
    const linha = upper(linhaAtual || detectarLinhaDoModeloFabricante(nome, linhasConhecidas));
    if (!nome || !codigoProduto || !linha) return setMensagemModelo("Informe Modelo Fabricante, Código do Produto e Linha.");

    const dup = modelosFabricante.some(
      (m) => upper(m.nome) === upper(nome) && upper(m.codigoProduto) === codigoProduto && m.id !== editModeloId
    );
    if (dup) return setMensagemModelo("Modelo Fabricante já cadastrado.");

    if (editModeloId) {
      setModelosFabricante((p) => p.map((m) => (m.id === editModeloId ? { ...m, nome, codigoProduto, linha } : m)));
      setEditModeloId(null);
    } else {
      const id = Date.now();
      setModelosFabricante((p) => [...p, { id, nome, codigoProduto, linha, createdAt: agoraBR(), createdBy: usuarioAtual }]);
      if (!modeloSelecionadoId) setModeloSelecionadoId(id);
    }

    setModeloAtual("");
    setCodigoProdutoAtual("");
    setLinhaAtual("");
    setMensagemModelo("");
  };

  const editarModelo = (id: number) => {
    const m = modelosFabricante.find((x) => x.id === id);
    if (!m) return;
    setEditModeloId(id);
    setModeloAtual(m.nome);
    setCodigoProdutoAtual(m.codigoProduto);
    setLinhaAtual(m.linha);
    setMensagemModelo("Modo alteração: edite e clique em Incluir.");
  };

  const removerModelo = (id: number) => {
    setModelosFabricante((p) => p.filter((x) => x.id !== id));
    setModeloDocs((p) => {
      const n = { ...p };
      delete (n as any)[id];
      return n;
    });
    setEsteticas((p) => p.filter((x) => (x.modeloId || 0) !== id));
    setFuncionaisPeca((p) => p.filter((x) => (x.modeloId || 0) !== id));
    if (modeloSelecionadoId === id) setModeloSelecionadoId(null);
    if (editModeloId === id) {
      setEditModeloId(null);
      setModeloAtual("");
      setCodigoProdutoAtual("");
      setLinhaAtual("");
    }
  };

  const addItemGenerico = (
    form: { codigoPeca: string; descricao: string },
    setForm: React.Dispatch<React.SetStateAction<{ codigoPeca: string; descricao: string }>>,
    setLista: React.Dispatch<React.SetStateAction<PecaBase[]>>,
    setMsg: (t: string) => void,
    opts?: { vincularModelo?: boolean; dupWithin?: PecaBase[] }
  ) => {
    const vincularModelo = !!opts?.vincularModelo;
    const codigoPeca = upper(form.codigoPeca);
    const descricao = norm(form.descricao);

    if (!codigoPeca || !descricao) return setMsg("Informe o código peça e a descrição.");
    const mid = vincularModelo ? modeloSelecionadoId || 0 : 0;

    const scope =
      opts?.dupWithin ||
      (vincularModelo ? [...esteticas, ...funcionaisPeca] : [...acessorios, ...embalagens]);

    const dup = scope.some(
      (x) => upper(x.codigoPeca || "") === codigoPeca && (vincularModelo ? (x.modeloId || 0) === mid : true)
    );
    if (dup) return setMsg("Item já cadastrado.");

    const item: PecaBase = {
      id: Date.now(),
      codigoPeca,
      descricao,
      ...(vincularModelo ? { modeloId: mid } : {}),
      createdAt: agoraBR(),
      createdBy: usuarioAtual,
    };

    setLista((p) => [...p, item]);
    setForm({ codigoPeca: "", descricao: "" });
    setMsg("");
  };

  const addFuncionalidade = () => {
    const descricao = norm(formFuncionalidade.descricao);
    if (!descricao) return setMensagemFuncionalidade("Informe a descrição.");
    const dup = funcionalidades.some((x) => upper(x.descricao) === upper(descricao));
    if (dup) return setMensagemFuncionalidade("Funcionalidade já cadastrada.");
    setFuncionalidades((p) => [...p, { id: Date.now(), descricao, createdAt: agoraBR(), createdBy: usuarioAtual }]);
    setFormFuncionalidade({ descricao: "" });
    setMensagemFuncionalidade("");
  };

  const mergedEsteticaFuncional = useMemo(() => {
    const map = new Map<string, { tipo: string; codigoPeca: string; descricao: string; modeloId: number }>();

    const add = (tipo: "ESTÉTICA" | "FUNCIONAL", item: PecaBase) => {
      const codigoPeca = upper(item.codigoPeca || "");
      const modeloId = item.modeloId || 0;
      const k = `${modeloId}|${codigoPeca}`;
      const cur = map.get(k);
      if (!cur) map.set(k, { tipo, codigoPeca, descricao: item.descricao, modeloId });
      else map.set(k, { ...cur, tipo: "ESTÉTICO/FUNCIONAL" });
    };

    esteticas.forEach((x) => add("ESTÉTICA", x));
    funcionaisPeca.forEach((x) => add("FUNCIONAL", x));

    return Array.from(map.values());
  }, [esteticas, funcionaisPeca]);

  const itensResumo = useMemo(() => {
    const ref = norm(master.modeloReferencia) || "-";
    const getModeloFab = (id: number) => modelosFabricante.find((m) => m.id === id)?.nome || "-";

    const rows: Array<
      {
        tipo: string;
        codigoPeca?: string;
        descricao: string;
        modeloId?: number;
        vinculo: string;
        vinculoTipo: "MODELO_REFERENCIA" | "MODELO_FABRICANTE";
      } & { rowKey: string }
    > = [];

    embalagens.forEach((x) =>
      rows.push({
        tipo: "EMBALAGEM",
        codigoPeca: x.codigoPeca,
        descricao: x.descricao,
        vinculo: ref,
        vinculoTipo: "MODELO_REFERENCIA",
        rowKey: `EMBALAGEM|${upper(x.codigoPeca)}|0`,
      })
    );

    acessorios.forEach((x) =>
      rows.push({
        tipo: "ACESSÓRIO",
        codigoPeca: x.codigoPeca,
        descricao: x.descricao,
        vinculo: ref,
        vinculoTipo: "MODELO_REFERENCIA",
        rowKey: `ACESSORIO|${upper(x.codigoPeca)}|0`,
      })
    );

    mergedEsteticaFuncional.forEach((x) =>
      rows.push({
        tipo: x.tipo,
        codigoPeca: x.codigoPeca,
        descricao: x.descricao,
        modeloId: x.modeloId,
        vinculo: getModeloFab(x.modeloId),
        vinculoTipo: "MODELO_FABRICANTE",
        rowKey: `PECA|${upper(x.codigoPeca)}|${x.modeloId}`,
      })
    );

    funcionalidades.forEach((x) =>
      rows.push({
        tipo: "FUNCIONALIDADE",
        descricao: x.descricao,
        vinculo: ref,
        vinculoTipo: "MODELO_REFERENCIA",
        rowKey: `FUNCIONALIDADE|${upper(x.descricao)}|0`,
      })
    );

    return rows;
  }, [embalagens, acessorios, mergedEsteticaFuncional, funcionalidades, master.modeloReferencia, modelosFabricante]);

  const itensFiltrados = useMemo(() => {
    return itensResumo.filter((r) => {
      if (r.vinculoTipo === "MODELO_REFERENCIA") return filtroModeloReferencia;
      if (!filtroModeloFabricante) return false;
      if (filtroModeloFabricanteId === "TODOS") return true;
      return (r.modeloId || 0) === filtroModeloFabricanteId;
    });
  }, [itensResumo, filtroModeloReferencia, filtroModeloFabricante, filtroModeloFabricanteId]);

  const getArquivosInfo = useMemo(() => {
    if (!arquivosCtx)
      return {
        open: false,
        title: "",
        accept: "",
        files: [] as FileMeta[],
        onAdd: (_: FileList) => { },
        onRemove: (_: number) => { },
      };

    const baseAdd = (arr: FileMeta[], fl: FileList) => {
      const now = Date.now();
      const next = [...arr];
      Array.from(fl).forEach((f, i) => next.push({ id: now + i, file: f, name: f.name, createdAt: agoraBR(), createdBy: usuarioAtual }));
      return next;
    };

    if (arquivosCtx.kind === "produto") {
      const titles: Record<ProdutoDocKey, string> = {
        fotoProduto: "Foto do produto",
        etiquetaProcel: "Etiqueta Procel",
        kitAcessorio: "Kit acessório",
        manualUsuario: "Manual do usuário (PDF)",
      };
      const acceptMap: Record<ProdutoDocKey, string> = {
        fotoProduto: "image/*",
        etiquetaProcel: "image/*",
        kitAcessorio: "image/*",
        manualUsuario: "application/pdf",
      };
      const doc = arquivosCtx.doc;
      return {
        open: true,
        title: titles[doc],
        accept: acceptMap[doc],
        files: produtoDocs[doc] || [],
        onAdd: (fl: FileList) => setProdutoDocs((p) => ({ ...p, [doc]: baseAdd(p[doc] || [], fl) })),
        onRemove: (id: number) => setProdutoDocs((p) => ({ ...p, [doc]: (p[doc] || []).filter((x) => x.id !== id) })),
      };
    }

    if (arquivosCtx.kind === "modelo") {
      const titles: Record<ModeloDocKey, string> = {
        vistaExplodida: "Vista explodida",
        boletimTecnico: "Boletim técnico",
        manualTecnico: "Manual técnico",
      };
      const acceptMap: Record<ModeloDocKey, string> = {
        vistaExplodida: "application/pdf,image/*",
        boletimTecnico: "application/pdf,image/*",
        manualTecnico: "application/pdf,image/*",
      };
      const doc = arquivosCtx.doc;
      const mid = arquivosCtx.modeloId;
      const cur = modeloDocs[mid] || createEmptyModeloDocs();
      return {
        open: true,
        title: `${titles[doc]} — ${modelosFabricante.find((m) => m.id === mid)?.nome || "Modelo"}`,
        accept: acceptMap[doc],
        files: cur[doc] || [],
        onAdd: (fl: FileList) =>
          setModeloDocs((p) => {
            const next = { ...p };
            const now = next[mid] || createEmptyModeloDocs();
            next[mid] = { ...now, [doc]: baseAdd(now[doc] || [], fl) };
            return next;
          }),
        onRemove: (id: number) =>
          setModeloDocs((p) => {
            const next = { ...p };
            const now = next[mid] || createEmptyModeloDocs();
            next[mid] = { ...now, [doc]: (now[doc] || []).filter((x) => x.id !== id) };
            return next;
          }),
      };
    }

    const title = arquivosCtx.title;
    const rowKey = arquivosCtx.rowKey;
    return {
      open: true,
      title,
      accept: "image/*",
      files: itemFotos[rowKey] || [],
      onAdd: (fl: FileList) => setItemFotos((p) => ({ ...p, [rowKey]: baseAdd(p[rowKey] || [], fl) })),
      onRemove: (id: number) => setItemFotos((p) => ({ ...p, [rowKey]: (p[rowKey] || []).filter((x) => x.id !== id) })),
    };
  }, [arquivosCtx, produtoDocs, modeloDocs, itemFotos, modelosFabricante]);

  const openArquivos = (ctx: ModalArquivosKey) => setArquivosCtx(ctx);
  const closeArquivos = () => setArquivosCtx(null);

  const excluirItemVinculado = (r: any) => {
    const tipo = upper(r?.tipo);
    const codigoPeca = upper(r?.codigoPeca || "");
    const descricao = upper(r?.descricao || "");
    const modeloId = Number(r?.modeloId || 0);

    if (tipo === "EMBALAGEM") setEmbalagens((p) => p.filter((x) => upper(x.codigoPeca || "") !== codigoPeca));
    else if (tipo === "ACESSÓRIO") setAcessorios((p) => p.filter((x) => upper(x.codigoPeca || "") !== codigoPeca));
    else if (tipo === "FUNCIONALIDADE") setFuncionalidades((p) => p.filter((x) => upper(x.descricao) !== descricao));
    else if (tipo === "ESTÉTICA")
      setEsteticas((p) => p.filter((x) => !((x.modeloId || 0) === modeloId && upper(x.codigoPeca || "") === codigoPeca)));
    else if (tipo === "FUNCIONAL")
      setFuncionaisPeca((p) => p.filter((x) => !((x.modeloId || 0) === modeloId && upper(x.codigoPeca || "") === codigoPeca)));
    else if (tipo === "ESTÉTICO/FUNCIONAL") {
      setEsteticas((p) => p.filter((x) => !((x.modeloId || 0) === modeloId && upper(x.codigoPeca || "") === codigoPeca)));
      setFuncionaisPeca((p) => p.filter((x) => !((x.modeloId || 0) === modeloId && upper(x.codigoPeca || "") === codigoPeca)));
    }

    setItemFotos((p) => {
      if (!p?.[r.rowKey]) return p;
      const n = { ...p };
      delete (n as any)[r.rowKey];
      return n;
    });
  };

  const ensureUploadedFileMeta = async (
    meta: FileMeta,
    kind: "product-image" | "product-manual" | "model-doc" | "item-image"
  ): Promise<FileMeta> => {
    if (meta.url) return meta;
    if (!meta.file) {
      throw new Error(`Arquivo sem origem local para upload: ${meta.name || "sem nome"}.`);
    }

    const result =
      kind === "product-image"
        ? await uploadProductFile(meta.file, "image")
        : kind === "product-manual"
          ? await uploadProductFile(meta.file, "manual")
          : kind === "model-doc"
            ? await uploadFile(meta.file, undefined, "produtos/modelos")
            : await uploadFile(meta.file, undefined, "produtos/itens");

    if (result.error || !result.url) {
      throw new Error(`Falha ao enviar arquivo: ${meta.name || "sem nome"}.`);
    }

    return {
      ...meta,
      url: result.url,
      path: result.path,
    };
  };

  const salvar = async () => {
    if (!masterPreenchido) return setMensagem("Preencha EAN / GTIN e Modelo Referência.");
    if (!norm(master.fabricante)) return setMensagem("Informe o Fabricante.");

    try {
      const produtoExistenteId = allowSaveIntoCurrentRecord ? norm(master.id) || undefined : undefined;
      setMensagem(produtoExistenteId ? "Atualizando..." : "Salvando...");

      const produtoDocsPersistidos: Record<ProdutoDocKey, FileMeta[]> = {
        fotoProduto: await Promise.all(produtoDocs.fotoProduto.map((item) => ensureUploadedFileMeta(item, "product-image"))),
        etiquetaProcel: await Promise.all(produtoDocs.etiquetaProcel.map((item) => ensureUploadedFileMeta(item, "product-image"))),
        kitAcessorio: await Promise.all(produtoDocs.kitAcessorio.map((item) => ensureUploadedFileMeta(item, "product-image"))),
        manualUsuario: await Promise.all(produtoDocs.manualUsuario.map((item) => ensureUploadedFileMeta(item, "product-manual"))),
      };

      const modeloDocsPersistidos = Object.fromEntries(
        await Promise.all(
          modelosFabricante.map(async (modelo) => {
            const docs = modeloDocs[modelo.id] || createEmptyModeloDocs();
            return [
              modelo.id,
              {
                vistaExplodida: await Promise.all(docs.vistaExplodida.map((item) => ensureUploadedFileMeta(item, "model-doc"))),
                boletimTecnico: await Promise.all(docs.boletimTecnico.map((item) => ensureUploadedFileMeta(item, "model-doc"))),
                manualTecnico: await Promise.all(docs.manualTecnico.map((item) => ensureUploadedFileMeta(item, "model-doc"))),
              },
            ];
          })
        )
      ) as Record<number, Record<ModeloDocKey, FileMeta[]>>;

      const itemFotosPersistidos = Object.fromEntries(
        await Promise.all(
          Object.entries(itemFotos).map(async ([rowKey, files]) => [
            rowKey,
            await Promise.all(files.map((item) => ensureUploadedFileMeta(item, "item-image"))),
          ])
        )
      ) as Record<string, FileMeta[]>;

      const fotosPorRowKey = (rowKey: string) =>
        (itemFotosPersistidos[rowKey] || []).map((item) => item.url).filter((value): value is string => !!value);

      const mapPeca = (p: PecaBase, tipo: ItemVinculado["tipo"]): ItemVinculado => ({
        tipo,
        nome: p.descricao,
        codigo: p.codigoPeca,
        quantidade: 1,
        fotos: fotosPorRowKey(`${tipo === "embalagem" ? "EMBALAGEM" : "ACESSORIO"}|${upper(p.codigoPeca || "")}|0`),
      });

      const mapFuncionalidade = (p: PecaBase): ItemVinculado => ({
        tipo: "funcionalidade",
        nome: p.descricao,
        quantidade: 1,
      });

      const mapPecaModelo = (p: PecaBase, tipo: "estetica" | "funcional"): ItemVinculado => ({
        tipo,
        nome: p.descricao,
        codigo: p.codigoPeca,
        quantidade: 1,
        fotos: fotosPorRowKey(`PECA|${upper(p.codigoPeca || "")}|${p.modeloId || 0}`),
      });

      const mappedModelos: DTOModeloFabricante[] = modelosFabricante.map((modelo) => {
        const ests = esteticas.filter((item) => item.modeloId === modelo.id);
        const funcs = funcionaisPeca.filter((item) => item.modeloId === modelo.id);
        const docs = modeloDocsPersistidos[modelo.id] || createEmptyModeloDocs();

        return {
          id: String(modelo.id),
          nome: modelo.nome,
          categoria: "Geral",
          codigoTipo: modelo.codigoProduto,
          linha: modelo.linha,
          vistaExplodida: docs.vistaExplodida.map((item) => item.url).filter((value): value is string => !!value),
          boletimTecnico: docs.boletimTecnico.map((item) => item.url).filter((value): value is string => !!value),
          manualTecnico: docs.manualTecnico.map((item) => item.url).filter((value): value is string => !!value),
          estetica: ests.map((item) => ({
            tipo: "estetica" as const,
            nome: item.descricao,
            codigo: item.codigoPeca,
            quantidade: 1,
            fotos: fotosPorRowKey(`PECA|${upper(item.codigoPeca || "")}|${modelo.id}`),
          })),
          funcional: funcs.map((item) => ({
            tipo: "funcional" as const,
            nome: item.descricao,
            codigo: item.codigoPeca,
            quantidade: 1,
            fotos: fotosPorRowKey(`PECA|${upper(item.codigoPeca || "")}|${modelo.id}`),
          })),
          funcionalidades: [],
        };
      });

      const dto: CreateProductDTO = {
        ean: master.ean,
        modeloRef: master.modeloReferencia,
        marca: master.fabricante,
        nfs: codigosNF.map((nf) => ({ codigo: nf.codigo, revenda: nf.revenda })),
        modelos: mappedModelos,
        embalagem: embalagens.map((item) => mapPeca(item, "embalagem")),
        acessorios: acessorios.map((item) => mapPeca(item, "acessorio")),
        estetica: esteticas.map((item) => mapPecaModelo(item, "estetica")),
        funcional: funcionaisPeca.map((item) => mapPecaModelo(item, "funcional")),
        funcionalidade: funcionalidades.map(mapFuncionalidade),
        fotos: produtoDocsPersistidos.fotoProduto.map((item) => item.url).filter((value): value is string => !!value),
        etiquetaProcel: produtoDocsPersistidos.etiquetaProcel.map((item) => item.url).filter((value): value is string => !!value),
        kitAcessorio: produtoDocsPersistidos.kitAcessorio.map((item) => item.url).filter((value): value is string => !!value),
        manualUrl: produtoDocsPersistidos.manualUsuario[0]?.url
      };

      const persisted = produtoExistenteId
        ? await ProductApiService.updateProduct({
          id: produtoExistenteId,
          originalEan: master.ean,
          ...dto,
        })
        : await ProductApiService.createProduct(dto);

      const produtoIdPersistido = persisted?.id || norm(master.id) || undefined;
      if (!produtoIdPersistido) {
        throw new Error("Produto salvo sem ID retornado pelo banco.");
      }

      const preAnaliseResponse = await fetch("/api/pre-analise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
        produtoId: produtoIdPersistido,
        codigo: dto.nfs[0]?.codigo || "",
        codigoNF: dto.nfs[0]?.codigo || "",
        modelo: dto.modeloRef,
        modeloRef: dto.modeloRef,
        ean: dto.ean,
        gtin: dto.ean,
        nfReceb: dto.nfs[0]?.codigo || "",
        recebidoPor: usuarioAtual,
        respostas: {
          origem: "cadastro_produto",
          snapshot: {
            embalagem: dto.embalagem,
            acessorios: dto.acessorios,
            estetica: dto.estetica,
            funcional: dto.funcional,
            funcionalidade: dto.funcionalidade,
            modelos: dto.modelos,
            nfs: dto.nfs,
            fotos: dto.fotos,
            etiquetaProcel: dto.etiquetaProcel || [],
            kitAcessorio: dto.kitAcessorio || [],
            manualUrl: dto.manualUrl || null,
          },
        },
        }),
      });

      if (!preAnaliseResponse.ok) {
        const payload = await preAnaliseResponse.json().catch(() => ({}));
        throw new Error(String(payload?.error || "Erro ao criar Pre-Analise do produto."));
      }

      const masterSalvo: Master = {
        id: produtoIdPersistido,
        ean: master.ean,
        modeloReferencia: master.modeloReferencia,
        fabricante: master.fabricante,
        createdAt: agoraBR(),
        createdBy: usuarioAtual,
      };

      setProdutoDocs(produtoDocsPersistidos);
      setModeloDocs(modeloDocsPersistidos);
      setItemFotos(itemFotosPersistidos);

      const payload = {
        ...masterSalvo,
        codigosNF,
        modelosFabricante,
        modeloSelecionadoId,
        embalagens,
        acessorios,
        esteticas,
        funcionaisPeca,
        funcionalidades,
        produtoDocs: produtoDocsPersistidos,
        modeloDocs: modeloDocsPersistidos,
        itemFotos: itemFotosPersistidos,
        criadoEm: agoraBR(),
        criadoPor: usuarioAtual,
      };

      upsertRegistroCache(payload);
      upsertMasterCache(masterSalvo);
      setResumoSucesso(masterSalvo);
      limpar();
      setMostrarModalSucesso(true);
      console.log("SALVO NO BANCO", dto);

      // Opcional: Limpar formulário após salvar?
      // limpar(); 
    } catch (err: any) {
      console.error(err);
      const rawMessage = String(err?.message || err || "");
      /*
      TODO: CASO PRECISE voltar a usar
      if (!allowSaveIntoCurrentRecord && /ean unico|produtos_ean_key/i.test(rawMessage)) {
        setMensagem("Novo cadastro carregado a partir de EAN existente. Revise os Códigos NF antes de salvar.");
        setMostrarModalAvisoNovoCadastro(true);
        return;
      }

      */
      setMensagem("Erro ao salvar: " + rawMessage);
    }
  };

  const limpar = () => {
    setMaster({ id: undefined, ean: "", modeloReferencia: "", fabricante: "" });
    setAllowSaveIntoCurrentRecord(false);
    setCodigosNF([]);
    setNfAtual("");
    setRevendaNFAtual("");
    setMensagemNF("");
    setEditNfId(null);

    setModeloAtual("");
    setCodigoProdutoAtual("");
    setLinhaAtual("");
    setModelosFabricante([]);
    setModeloSelecionadoId(null);
    setEditModeloId(null);
    setMensagemModelo("");

    setAcessorios([]);
    setFormAcessorio({ codigoPeca: "", descricao: "" });
    setMensagemAcessorio("");

    setEmbalagens([]);
    setFormEmbalagem({ codigoPeca: "", descricao: "" });
    setMensagemEmbalagem("");

    setEsteticas([]);
    setFormEstetica({ codigoPeca: "", descricao: "" });
    setMensagemEstetica("");

    setFuncionaisPeca([]);
    setFormFuncionalPeca({ codigoPeca: "", descricao: "" });
    setMensagemFuncionalPeca("");

    setFuncionalidades([]);
    setFormFuncionalidade({ descricao: "" });
    setMensagemFuncionalidade("");

    setProdutoDocs(createEmptyProdutoDocs());
    setModeloDocs({});
    setItemFotos({});

    setMensagem("");
  };

  const criarMasterCadastro = async (payload: Master): Promise<Master> => {
    const ean = norm(payload?.ean);
    const modeloReferencia = norm(payload?.modeloReferencia);
    const fabricante = upper(payload?.fabricante);

    const dto: CreateProductDTO = {
      ean,
      modeloRef: modeloReferencia,
      marca: fabricante,
      nfs: [],
      modelos: [],
      embalagem: [],
      acessorios: [],
      estetica: [],
      funcional: [],
      funcionalidade: [],
      fotos: [],
      etiquetaProcel: [],
      kitAcessorio: [],
      manualUrl: undefined,
    };

    const created = await ProductApiService.createProduct(dto);
    const persisted = await ProductApiService.getProductByEan(ean);

    if (persisted) {
      const registroMapeado = mapApiProductToRegistro(persisted, usuarioAtual);
      upsertRegistroCache(registroMapeado);
      const masterSalvo = toMasterFromRegistro(registroMapeado, usuarioAtual);
      upsertMasterCache(masterSalvo);
      return masterSalvo;
    }

    const masterSalvo: Master = {
      id: created?.id || undefined,
      ean,
      modeloReferencia,
      fabricante,
      createdAt: payload?.createdAt || agoraBR(),
      createdBy: payload?.createdBy || usuarioAtual,
    };

    upsertMasterCache(masterSalvo);
    return masterSalvo;
  };

  const editarMasterCadastro = async (payload: { id?: string; originalEan: string; next: Master }) => {
    const id = norm(payload?.id) || undefined;
    const originalEan = norm(payload?.originalEan);
    const next: Master = {
      ...payload.next,
      id: norm(payload?.next?.id) || id,
      ean: norm(payload?.next?.ean),
      modeloReferencia: norm(payload?.next?.modeloReferencia),
      fabricante: upper(payload?.next?.fabricante),
    };

    await ProductApiService.updateProductMaster({
      id,
      originalEan,
      ean: next.ean,
      modeloRef: next.modeloReferencia,
      marca: next.fabricante,
    });

    const matchTarget = (value: { id?: any; ean?: any } | null | undefined) => {
      if (!value) return false;
      if (id) return norm(value?.id) === id;
      return upper(value?.ean) === upper(originalEan);
    };

    setEansCad((prev) =>
      prev.map((item) =>
        matchTarget(item)
          ? {
            ...item,
            ...next,
            id: next.id || item.id,
          }
          : item
      )
    );

    setRegistros((prev) =>
      prev.map((item) =>
        matchTarget(item)
          ? {
            ...item,
            id: next.id || item.id,
            ean: next.ean,
            modeloReferencia: next.modeloReferencia,
            fabricante: next.fabricante,
          }
          : item
      )
    );

    setMaster((prev) =>
      matchTarget(prev)
        ? {
          ...prev,
          ...next,
          id: next.id || prev.id,
        }
        : prev
    );
  };

  const excluirMasterCadastro = async (payload: { id?: string; ean?: string }) => {
    const id = norm(payload?.id);
    const ean = norm(payload?.ean);
    if (!id && !ean) return;

    try {
      if (id) {
        await ProductApiService.deleteProductById(id);
      } else {
        await ProductApiService.deleteProductByEan(ean);
      }
    } catch (error: any) {
      const message = String(error?.message || "");
      if (!/nao encontrado|não encontrado|not found/i.test(message)) {
        throw error;
      }
    }

    const matchTarget = (value: { id?: any; ean?: any } | null | undefined) => {
      if (!value) return false;
      if (id) return norm(value?.id) === id;
      return upper(value?.ean) === upper(ean);
    };

    setEansCad((prev) => prev.filter((item) => !matchTarget(item)));
    setRegistros((prev) => prev.filter((item) => !matchTarget(item)));

    if (matchTarget(master)) {
      limpar();
    }
  };

  const btnBase = "inline-flex items-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold border transition";

  const setCodigoComDescricao = (
    setForm: React.Dispatch<React.SetStateAction<{ codigoPeca: string; descricao: string }>>,
    setMsg: (t: string) => void,
    v: string
  ) => {
    const codigoPeca = upper(v);
    const desc = lookupDescricao(codigoPeca);
    setForm((p) => {
      const hasManualDescricao = !!norm(p.descricao);
      return {
        ...p,
        codigoPeca,
        descricao: !hasManualDescricao && desc ? desc : p.descricao,
      };
    });
    setMsg("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full min-w-0 px-4 md:px-6 py-4">
        <div className="mx-auto w-full max-w-[1400px] min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800">Cadastro de EAN/GTIN, Código NF e Modelo Fabricante</h1>
              <p className="text-[12px] text-slate-600">Cadastro centralizado para alimentar Pré-Análise, Embalagem e Análise Técnica.</p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarAjuda(true)}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800"
            >
              <BookOpen size={16} />
              COMO USAR
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-3 lg:col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-600 tracking-wide">PESQUISAR</label>
                <button
                  type="button"
                  onClick={() => setMostrarLookupEAN(true)}
                  className="h-9 w-full rounded-full border border-slate-300 bg-white px-4 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2"
                >
                  <Search size={16} />
                  PESQUISAR
                </button>
              </div>
              <div className="col-span-12 md:col-span-3 lg:col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-600 tracking-wide">EAN / GTIN</label>
                <input
                  type="text"
                  name="ean"
                  value={master.ean}
                  onChange={handleChangeMaster}
                  className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div className="col-span-12 md:col-span-4 lg:col-span-6 flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-600 tracking-wide">MODELO REFERÊNCIA</label>
                <input
                  type="text"
                  value={master.modeloReferencia}
                  readOnly
                  className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[12px] text-slate-800 cursor-not-allowed"
                />
              </div>
              <div className="col-span-12 md:col-span-2 lg:col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-600 tracking-wide">FABRICANTE</label>
                <input
                  type="text"
                  value={master.fabricante}
                  readOnly
                  className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[12px] text-slate-800 uppercase cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={abrirCodigosNF} className={`${btnBase} border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100`}>
                  <Receipt size={16} />
                  CÓDIGOS NF<CountPill n={codigosNF.length} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={abrirEmbalagem}
                  className={`${btnBase} border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100`}
                >
                  <PackageIcon size={16} />
                  EMBALAGEM<CountPill n={embalagens.length} />
                </button>
                <button
                  type="button"
                  onClick={abrirAcessorios}
                  className={`${btnBase} border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100`}
                >
                  <Cable size={16} />
                  ACESSÓRIOS<CountPill n={acessorios.length} />
                </button>
                <button
                  type="button"
                  onClick={abrirFuncionalidade}
                  className={`${btnBase} border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100`}
                >
                  <Sparkles size={16} />
                  FUNCIONALIDADE<CountPill n={funcionalidades.length} />
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[12px] font-semibold text-slate-800">Anexos do produto</div>
                  <div className="text-[10px] text-slate-500">Use para auxiliar Pré-Análise, Embalagem e Análise Técnica.</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => openArquivos({ kind: "produto", doc: "fotoProduto" })}
                  className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <span className="text-[11px] font-semibold text-slate-700 inline-flex items-center gap-2">
                    <ImageIcon size={16} /> Foto do produto
                  </span>
                  <CountPill n={produtoDocs.fotoProduto.length} />
                </button>
                <button
                  type="button"
                  onClick={() => openArquivos({ kind: "produto", doc: "etiquetaProcel" })}
                  className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <span className="text-[11px] font-semibold text-slate-700 inline-flex items-center gap-2">
                    <Tag size={16} /> Etiqueta Procel
                  </span>
                  <CountPill n={produtoDocs.etiquetaProcel.length} />
                </button>
                <button
                  type="button"
                  onClick={() => openArquivos({ kind: "produto", doc: "kitAcessorio" })}
                  className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <span className="text-[11px] font-semibold text-slate-700 inline-flex items-center gap-2">
                    <Paperclip size={16} /> Kit acessório
                  </span>
                  <CountPill n={produtoDocs.kitAcessorio.length} />
                </button>
                <button
                  type="button"
                  onClick={() => openArquivos({ kind: "produto", doc: "manualUsuario" })}
                  className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <span className="text-[11px] font-semibold text-slate-700 inline-flex items-center gap-2">
                    <FileText size={16} /> Manual (PDF)
                  </span>
                  <CountPill n={produtoDocs.manualUsuario.length} />
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-white">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[12px] font-semibold text-slate-800">Modelos Fabricante vinculados</div>
                  <div className="text-[10px] text-slate-500">Selecione um modelo para vincular Estética e Funcional.</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-5 flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-600 tracking-wide">MODELO FABRICANTE</label>
                  <input
                    type="text"
                    value={modeloAtual}
                    onChange={(e) => {
                      setModeloAtual(e.target.value);
                      if (!linhaAtual) setLinhaAtual(detectarLinhaDoModeloFabricante(e.target.value, linhasConhecidas));
                      setMensagemModelo("");
                    }}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-600 tracking-wide">CÓDIGO DO PRODUTO</label>
                  <input
                    type="text"
                    value={codigoProdutoAtual}
                    onChange={(e) => {
                      setCodigoProdutoAtual(e.target.value);
                      setMensagemModelo("");
                    }}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
                  />
                </div>
                <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-600 tracking-wide">LINHA</label>
                  <input
                    type="text"
                    value={linhaAtual}
                    onChange={(e) => {
                      setLinhaAtual(e.target.value);
                      setMensagemModelo("");
                    }}
                    autoComplete="off"
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
                  />
                </div>
                <div className="col-span-12 md:col-span-2 flex md:justify-end">
                  <div className="flex w-full md:justify-end">
                    <button
                      type="button"
                      onClick={addModelo}
                      className="w-full md:w-auto px-3 h-9 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      INCLUIR
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-800">Sugestoes de linha</div>
                    <div className="text-[10px] text-slate-500">Clique em usar para preencher o campo LINHA, ou gerencie as sugestoes.</div>
                  </div>
                  <button
                    type="button"
                    onClick={abrirModalCadastrarLinha}
                    disabled={linhaSuggestionBusy}
                    className="w-full md:w-auto px-3 h-8 rounded-xl text-[11px] font-semibold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    INCLUIR NOVA LINHA
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 md:col-span-6 flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-600 tracking-wide">SUGESTOES DE LINHA</label>
                    <select
                      value={selectedLinhaSuggestionId}
                      onChange={(event) => setSelectedLinhaSuggestionId(event.target.value)}
                      disabled={linhaSuggestionBusy || !linhaSuggestionRows.length}
                      className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    >
                      {!linhaSuggestionRows.length ? <option value="">Sem sugestoes cadastradas</option> : null}
                      {linhaSuggestionRows.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-6 flex flex-wrap gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedLinhaSuggestion) return;
                        setLinhaAtual(selectedLinhaSuggestion.value);
                        setMensagemModelo("");
                      }}
                      disabled={!selectedLinhaSuggestion || linhaSuggestionBusy}
                      className="px-2.5 h-8 rounded-lg text-[10px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      USAR
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedLinhaSuggestion) return;
                        abrirModalEditarLinha(selectedLinhaSuggestion.id, selectedLinhaSuggestion.value);
                      }}
                      disabled={!selectedLinhaSuggestion || selectedLinhaSuggestion.id.startsWith("fallback:") || linhaSuggestionBusy}
                      className="px-2.5 h-8 rounded-lg text-[10px] font-semibold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 inline-flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Pencil size={12} />
                      EDITAR
                    </button>
                    <button
                      type="button"
                      onClick={abrirConfirmacaoExclusaoLinha}
                      disabled={!selectedLinhaSuggestion || selectedLinhaSuggestion.id.startsWith("fallback:") || linhaSuggestionBusy}
                      className="px-2.5 h-8 rounded-lg text-[10px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 inline-flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={12} />
                      EXCLUIR
                    </button>
                  </div>
                </div>
              </div>

              {linhaSuggestionModal ? (
                <ModalShell
                  open={!!linhaSuggestionModal}
                  title={linhaSuggestionModal.mode === "create" ? "Cadastrar sugestao de linha" : "Editar sugestao de linha"}
                  subtitle={linhaSuggestionModal.mode === "create" ? "Digite a nova linha para reutilizar nos cadastros." : "Atualize o valor da linha selecionada."}
                  onClose={fecharModalLinha}
                  maxW="max-w-md"
                >
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-slate-600 tracking-wide">LINHA</label>
                      <input
                        value={linhaSuggestionDraft}
                        onChange={(event) => setLinhaSuggestionDraft(event.target.value)}
                        disabled={linhaSuggestionBusy}
                        className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={fecharModalLinha}
                        disabled={linhaSuggestionBusy}
                        className="px-3 h-9 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        CANCELAR
                      </button>
                      <button
                        type="button"
                        onClick={() => void salvarModalLinha()}
                        disabled={linhaSuggestionBusy}
                        className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                      >
                        {linhaSuggestionBusy ? "SALVANDO..." : linhaSuggestionModal.mode === "create" ? "CADASTRAR" : "SALVAR"}
                      </button>
                    </div>
                  </div>
                </ModalShell>
              ) : null}

              {mostrarConfirmacaoExclusaoLinha ? (
                <ModalShell
                  open={mostrarConfirmacaoExclusaoLinha}
                  title="Excluir sugestao de linha"
                  subtitle={`Confirma excluir a sugestao "${selectedLinhaSuggestion?.value || "-"}"?`}
                  onClose={() => {
                    if (linhaSuggestionBusy) return;
                    setMostrarConfirmacaoExclusaoLinha(false);
                  }}
                  maxW="max-w-md"
                >
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmacaoExclusaoLinha(false)}
                      disabled={linhaSuggestionBusy}
                      className="px-3 h-9 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      CANCELAR
                    </button>
                    <button
                      type="button"
                      onClick={() => void excluirLinhaSelecionada()}
                      disabled={linhaSuggestionBusy}
                      className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {linhaSuggestionBusy ? "EXCLUINDO..." : "EXCLUIR"}
                    </button>
                  </div>
                </ModalShell>
              ) : null}

              {mensagemModelo && (
                <div className="text-[12px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">{mensagemModelo}</div>
              )}

              <div className="mt-3 space-y-3 md:hidden">
                {!modelosFabricante.length && (
                  <div className="rounded-2xl border border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                    Nenhum Modelo Fabricante cadastrado.
                  </div>
                )}
                {modelosFabricante.map((m, i) => {
                  const sel = m.id === modeloSelecionadoId;
                  const docs = modeloDocs[m.id] || createEmptyModeloDocs();
                  return (
                    <div
                      key={m.id}
                      className={`rounded-2xl border bg-white p-3 space-y-3 cursor-pointer ${sel ? "border-sky-500 ring-1 ring-sky-500" : "border-slate-200"}`}
                      onClick={() => setModeloSelecionadoId(m.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">Modelo #{i + 1}</div>
                          <div className="mt-1 text-[12px] font-semibold text-slate-800 break-words">{m.nome}</div>
                        </div>
                        {sel && (
                          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 h-7 text-[10px] font-semibold text-sky-700 shrink-0">
                            Selecionado
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div className="min-w-0">
                          <div className="text-slate-400 uppercase tracking-wide">Codigo do produto</div>
                          <div className="font-mono text-slate-800 break-all">{m.codigoProduto || "-"}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-slate-400 uppercase tracking-wide">Linha</div>
                          <div className="text-slate-800 break-all">{m.linha || "-"}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openArquivos({ kind: "modelo", modeloId: m.id, doc: "vistaExplodida" });
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 h-9 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Layers size={14} />
                          {docs.vistaExplodida?.length || 0}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openArquivos({ kind: "modelo", modeloId: m.id, doc: "boletimTecnico" });
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 h-9 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <FileSearch size={14} />
                          {docs.boletimTecnico?.length || 0}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openArquivos({ kind: "modelo", modeloId: m.id, doc: "manualTecnico" });
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 h-9 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <BookText size={14} />
                          {docs.manualTecnico?.length || 0}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            editarModelo(m.id);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 h-9 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                        >
                          <Pencil size={14} />
                          Alterar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removerModelo(m.id);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 h-9 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 hidden md:block rounded-2xl border border-slate-200 overflow-x-auto overflow-y-auto max-h-[260px]">
                <table className="w-full border-collapse text-[11px] min-w-[860px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left w-10">#</th>
                      <th className="px-2 py-1.5 text-left">Modelo fabricante</th>
                      <th className="px-2 py-1.5 text-left w-32">Código do produto</th>
                      <th className="px-2 py-1.5 text-left w-16">Linha</th>
                      <th className="px-2 py-1.5 text-center w-16">Vista explodida</th>
                      <th className="px-2 py-1.5 text-center w-16">Boletim técnico</th>
                      <th className="px-2 py-1.5 text-center w-16">Manual técnico</th>
                      <th className="px-3 py-2 text-right w-16">Alterar</th>
                      <th className="px-3 py-2 text-right w-16">Remover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!modelosFabricante.length && (
                      <tr>
                        <td colSpan={9} className="px-3 py-3 text-center text-[11px] text-slate-400">
                          Nenhum Modelo Fabricante cadastrado.
                        </td>
                      </tr>
                    )}
                    {modelosFabricante.map((m, i) => {
                      const sel = m.id === modeloSelecionadoId;
                      const docs = modeloDocs[m.id] || createEmptyModeloDocs();
                      return (
                        <tr
                          key={m.id}
                          className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"} ${sel ? "ring-1 ring-sky-500" : ""} cursor-pointer`}
                          onClick={() => setModeloSelecionadoId(m.id)}
                        >
                          <td className="px-2 py-1.5 align-middle text-[11px] text-slate-500">{i + 1}</td>
                          <td className="px-2 py-1.5 align-middle text-[11px] font-semibold text-slate-800">{m.nome}</td>
                          <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800 whitespace-nowrap">{m.codigoProduto}</td>
                          <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800 whitespace-nowrap">{m.linha}</td>

                          <td className="px-2 py-1.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <IconBtn
                              title="Vista explodida"
                              badge={docs.vistaExplodida?.length || 0}
                              onClick={() => openArquivos({ kind: "modelo", modeloId: m.id, doc: "vistaExplodida" })}
                            >
                              <Layers size={16} />
                            </IconBtn>
                          </td>
                          <td className="px-2 py-1.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <IconBtn
                              title="Boletim técnico"
                              badge={docs.boletimTecnico?.length || 0}
                              onClick={() => openArquivos({ kind: "modelo", modeloId: m.id, doc: "boletimTecnico" })}
                            >
                              <FileSearch size={16} />
                            </IconBtn>
                          </td>
                          <td className="px-2 py-1.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <IconBtn
                              title="Manual técnico"
                              badge={docs.manualTecnico?.length || 0}
                              onClick={() => openArquivos({ kind: "modelo", modeloId: m.id, doc: "manualTecnico" })}
                            >
                              <BookText size={16} />
                            </IconBtn>
                          </td>

                          <td className="px-2 py-1.5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                            <IconBtn title="Alterar" variant="primary" onClick={() => editarModelo(m.id)}>
                              <Pencil size={16} />
                            </IconBtn>
                          </td>
                          <td className="px-2 py-1.5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                            <IconBtn title="Excluir" variant="danger" onClick={() => removerModelo(m.id)}>
                              <Trash2 size={16} />
                            </IconBtn>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={abrirEstetica}
                  className={`${btnBase} border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100`}
                >
                  <Sparkles size={16} />
                  ESTÉTICA<CountPill n={esteticas.filter((x) => (x.modeloId || 0) === (modeloSelecionadoId || 0)).length} />
                </button>
                <button
                  type="button"
                  onClick={abrirFuncionalPeca}
                  className={`${btnBase} border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100`}
                >
                  <Sparkles size={16} />
                  FUNCIONAL<CountPill n={funcionaisPeca.filter((x) => (x.modeloId || 0) === (modeloSelecionadoId || 0)).length} />
                </button>
                {modeloSelecionado && (
                  <div className="ml-auto text-[11px] text-slate-600 inline-flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                      Selecionado: <span className="font-semibold">{modeloSelecionado.nome}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[12px] font-semibold text-slate-800 inline-flex items-center">
                    Itens vinculados ao produto<CountPill n={itensFiltrados.length} />
                  </div>
                  <div className="text-[10px] text-slate-500">Emb. + Acess. + Peças + Funcionalidades. Inclua fotos dos itens quando necessário.</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFiltroModeloReferencia((v) => !v)}
                      className={`px-3 h-8 rounded-xl text-[11px] font-semibold border transition ${filtroModeloReferencia
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      MODELO REFERÊNCIA
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroModeloFabricante((v) => !v)}
                      className={`px-3 h-8 rounded-xl text-[11px] font-semibold border transition ${filtroModeloFabricante
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      MODELO FABRICANTE
                    </button>
                    {filtroModeloFabricante && (
                      <select
                        value={filtroModeloFabricanteId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFiltroModeloFabricanteId(v === "TODOS" ? "TODOS" : Number(v));
                        }}
                        className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      >
                        <option value="TODOS">TODOS OS MODELOS</option>
                        {modelosFabricante.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-3 md:hidden">
                {!itensFiltrados.length && (
                  <div className="rounded-2xl border border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                    Nenhum item vinculado ainda.
                  </div>
                )}
                {itensFiltrados.map((r, i) => {
                  const n = (itemFotos[r.rowKey] || []).length;
                  return (
                    <div key={r.rowKey} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">Item #{i + 1}</div>
                          <div className="mt-1 text-[12px] font-semibold text-slate-800 break-words">{r.descricao || "-"}</div>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 h-7 text-[10px] font-semibold text-slate-700 shrink-0">
                          {r.tipo}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div className="min-w-0 col-span-2">
                          <div className="text-slate-400 uppercase tracking-wide">Modelo</div>
                          <div className="text-slate-700 break-words">{r.vinculo || "-"}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-slate-400 uppercase tracking-wide">Codigo peca</div>
                          <div className="font-mono text-slate-800 break-all">{r.codigoPeca || "-"}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-slate-400 uppercase tracking-wide">Fotos</div>
                          <div className="text-slate-700">{n}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openArquivos({ kind: "item", rowKey: r.rowKey, title: `Fotos — ${r.tipo} — ${r.codigoPeca || r.descricao}` })
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <ImageIcon size={14} />
                          Fotos ({n})
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirItemVinculado(r)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 h-9 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 hidden md:block rounded-2xl border border-slate-200 overflow-x-auto overflow-y-auto max-h-[320px] bg-white">
                <table className="w-full border-collapse text-[11px] min-w-[760px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left w-8">#</th>
                      <th className="px-2 py-2 text-left w-28">Tipo</th>
                      <th className="px-2 py-2 text-left w-72">Modelo</th>
                      <th className="px-2 py-2 text-left w-28">Código peça</th>
                      <th className="px-2 py-2 text-left">Descrição</th>
                      <th className="px-2 py-2 text-right w-20">Fotos</th>
                      <th className="px-2 py-2 text-right w-20">Excluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!itensFiltrados.length && (
                      <tr>
                        <td colSpan={7} className="px-3 py-3 text-center text-[11px] text-slate-400">
                          Nenhum item vinculado ainda.
                        </td>
                      </tr>
                    )}
                    {itensFiltrados.map((r, i) => {
                      const n = (itemFotos[r.rowKey] || []).length;
                      return (
                        <tr key={r.rowKey} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-2 py-2 align-middle text-[11px] text-slate-500">{i + 1}</td>
                          <td className="px-2 py-2 align-middle text-[11px] font-semibold text-slate-700">{r.tipo}</td>
                          <td className="px-2 py-2 align-middle text-[11px] text-slate-700 truncate max-w-[280px]" title={r.vinculo}>
                            {r.vinculo}
                          </td>
                          <td className="px-2 py-2 align-middle text-[11px] text-slate-800 whitespace-nowrap">{r.codigoPeca || "-"}</td>
                          <td className="px-2 py-2 align-middle text-[11px] text-slate-800">{r.descricao}</td>
                          <td className="px-2 py-2 align-middle text-right">
                            <IconBtn
                              title="Incluir/alterar fotos"
                              badge={n}
                              onClick={() =>
                                openArquivos({ kind: "item", rowKey: r.rowKey, title: `Fotos — ${r.tipo} — ${r.codigoPeca || r.descricao}` })
                              }
                            >
                              <ImageIcon size={16} />
                            </IconBtn>
                          </td>
                          <td className="px-2 py-2 align-middle text-right">
                            <IconBtn title="Excluir" variant="danger" onClick={() => excluirItemVinculado(r)}>
                              <Trash2 size={16} />
                            </IconBtn>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {mensagem && <div className="text-[12px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{mensagem}</div>}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={limpar}
                className="px-3 h-9 rounded-xl text-[11px] font-semibold border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-2"
              >
                <X size={16} />
                LIMPAR
              </button>
              <button
                type="button"
                onClick={salvar}
                className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-2"
              >
                <Plus size={16} />
                SALVAR
              </button>
            </div>
          </div>

          <ModalEanGtins
            open={mostrarLookupEAN}
            onClose={() => setMostrarLookupEAN(false)}
            eans={eansCad}
            registros={registros}
            usuarioAtual={usuarioAtual}
            onAdd={criarMasterCadastro}
            onEdit={editarMasterCadastro}
            onDelete={excluirMasterCadastro}
            onSelect={(m, options) => {
              const updateCurrentRecord = !!options?.updateCurrentRecord;
              setMaster({
                ...m,
                id: updateCurrentRecord ? m.id : undefined,
              });
              setAllowSaveIntoCurrentRecord(updateCurrentRecord);
              setMensagem("");
              if (!updateCurrentRecord) {
                setMensagem("Cadastro base carregado. Salvar criara um novo registro.");
              }
              setMostrarLookupEAN(false);
            }}
          />

          <ModalCodigosNF
            open={mostrarPopupNF}
            master={master}
            codigosNF={codigosNF}
            nfAtual={nfAtual}
            revendaAtual={revendaNFAtual}
            mensagem={mensagemNF}
            onClose={() => {
              setMostrarPopupNF(false);
              setMostrarLookupRevenda(false);
              setEditNfId(null);
              setNfAtual("");
              setRevendaNFAtual("");
              setMensagemNF("");
            }}
            onChangeNF={(value) => {
              setNfAtual(value);
              setMensagemNF("");
            }}
            onChangeRevenda={(value) => {
              setRevendaNFAtual(value);
              setMensagemNF("");
            }}
            onPesquisarRevenda={() => setMostrarLookupRevenda(true)}
            onAdd={addCodigoNF}
            onRemover={removerCodigoNF}
            onEditar={editarCodigoNF}
          />

          <ModalRevendasClientes
            open={mostrarLookupRevenda}
            onClose={() => setMostrarLookupRevenda(false)}
            options={revendasClientes}
            loading={revendasLoading}
            error={revendasErro}
            onGoToCadastroCliente={irParaCadastroCliente}
            onSelect={(nome) => {
              setRevendaNFAtual(nome);
              setMostrarLookupRevenda(false);
              setMensagemNF("");
            }}
          />

          <ModalPecas
            open={mostrarPopupEmbalagem}
            title="Cadastro de Embalagem Referente"
            master={master}
            form={formEmbalagem}
            mensagem={mensagemEmbalagem}
            emptyText="Nenhum item de embalagem cadastrado ainda."
            addLabel="INCLUIR"
            onClose={() => {
              setMostrarPopupEmbalagem(false);
              setMensagemEmbalagem("");
            }}
            onChangeCodigo={(v) => setCodigoComDescricao(setFormEmbalagem, setMensagemEmbalagem, v)}
            onChangeDescricao={(v) => {
              setFormEmbalagem((p) => ({ ...p, descricao: v }));
              setMensagemEmbalagem("");
            }}
            onAdd={() => addItemGenerico(formEmbalagem, setFormEmbalagem, setEmbalagens, setMensagemEmbalagem)}
            lista={embalagens}
            onRemover={(id) => setEmbalagens((p) => p.filter((x) => x.id !== id))}
            sugestoes={sugestoesEmbalagem}
            suggestionRows={suggestionRowsByCategory.embalagens}
            suggestionCategory="embalagens"
            onCreateSuggestion={cadastrarSugestao}
            onUpdateSuggestion={editarSugestao}
            onDeleteSuggestion={(id) => excluirSugestao(id)}
          />

          <ModalPecas
            open={mostrarPopupAcessorios}
            title="Cadastro de Acessórios Referentes"
            master={master}
            form={formAcessorio}
            mensagem={mensagemAcessorio}
            emptyText="Nenhum acessório cadastrado ainda."
            addLabel="INCLUIR"
            onClose={() => {
              setMostrarPopupAcessorios(false);
              setMensagemAcessorio("");
            }}
            onChangeCodigo={(v) => setCodigoComDescricao(setFormAcessorio, setMensagemAcessorio, v)}
            onChangeDescricao={(v) => {
              setFormAcessorio((p) => ({ ...p, descricao: v }));
              setMensagemAcessorio("");
            }}
            onAdd={() => addItemGenerico(formAcessorio, setFormAcessorio, setAcessorios, setMensagemAcessorio)}
            lista={acessorios}
            onRemover={(id) => setAcessorios((p) => p.filter((x) => x.id !== id))}
            sugestoes={sugestoesAcessorios}
            suggestionRows={suggestionRowsByCategory.acessorios}
            suggestionCategory="acessorios"
            onCreateSuggestion={cadastrarSugestao}
            onUpdateSuggestion={editarSugestao}
            onDeleteSuggestion={(id) => excluirSugestao(id)}
          />

          <ModalPecas
            open={mostrarPopupEstetica}
            title="Cadastro de Peças Estéticas Referentes"
            master={master}
            modeloFabricante={modeloSelecionado?.nome || ""}
            form={formEstetica}
            mensagem={mensagemEstetica}
            emptyText="Nenhuma peça estética cadastrada ainda."
            addLabel="INCLUIR"
            onClose={() => {
              setMostrarPopupEstetica(false);
              setMensagemEstetica("");
            }}
            onChangeCodigo={(v) => setCodigoComDescricao(setFormEstetica, setMensagemEstetica, v)}
            onChangeDescricao={(v) => {
              setFormEstetica((p) => ({ ...p, descricao: v }));
              setMensagemEstetica("");
            }}
            onAdd={() =>
              addItemGenerico(formEstetica, setFormEstetica, setEsteticas, setMensagemEstetica, { vincularModelo: true, dupWithin: esteticas })
            }
            lista={esteticas.filter((x) => (x.modeloId || 0) === (modeloSelecionadoId || 0))}
            onRemover={(id) => setEsteticas((p) => p.filter((x) => x.id !== id))}
            sugestoes={sugestoesEsteticas}
            suggestionRows={suggestionRowsByCategory.esteticas}
            suggestionCategory="esteticas"
            onCreateSuggestion={cadastrarSugestao}
            onUpdateSuggestion={editarSugestao}
            onDeleteSuggestion={(id) => excluirSugestao(id)}
          />

          <ModalPecas
            open={mostrarPopupFuncionalPeca}
            title="Cadastro de Peças Funcionais Referentes"
            master={master}
            modeloFabricante={modeloSelecionado?.nome || ""}
            form={formFuncionalPeca}
            mensagem={mensagemFuncionalPeca}
            emptyText="Nenhuma peça funcional cadastrada ainda."
            addLabel="INCLUIR"
            onClose={() => {
              setMostrarPopupFuncionalPeca(false);
              setMensagemFuncionalPeca("");
            }}
            onChangeCodigo={(v) => setCodigoComDescricao(setFormFuncionalPeca, setMensagemFuncionalPeca, v)}
            onChangeDescricao={(v) => {
              setFormFuncionalPeca((p) => ({ ...p, descricao: v }));
              setMensagemFuncionalPeca("");
            }}
            onAdd={() =>
              addItemGenerico(formFuncionalPeca, setFormFuncionalPeca, setFuncionaisPeca, setMensagemFuncionalPeca, {
                vincularModelo: true,
                dupWithin: funcionaisPeca,
              })
            }
            lista={funcionaisPeca.filter((x) => (x.modeloId || 0) === (modeloSelecionadoId || 0))}
            onRemover={(id) => setFuncionaisPeca((p) => p.filter((x) => x.id !== id))}
            sugestoes={sugestoesFuncionais}
            suggestionRows={suggestionRowsByCategory.pecas_funcionais}
            suggestionCategory="pecas_funcionais"
            onCreateSuggestion={cadastrarSugestao}
            onUpdateSuggestion={editarSugestao}
            onDeleteSuggestion={(id) => excluirSugestao(id)}
          />

          <ModalPecas
            open={mostrarPopupFuncionalidade}
            title="Cadastro de Funcionalidades"
            master={master}
            form={{ descricao: formFuncionalidade.descricao }}
            mensagem={mensagemFuncionalidade}
            emptyText="Nenhuma funcionalidade cadastrada ainda."
            addLabel="INCLUIR"
            onClose={() => {
              setMostrarPopupFuncionalidade(false);
              setMensagemFuncionalidade("");
            }}
            onChangeDescricao={(v) => {
              setFormFuncionalidade({ descricao: v });
              setMensagemFuncionalidade("");
            }}
            onAdd={addFuncionalidade}
            lista={funcionalidades}
            onRemover={(id) => setFuncionalidades((p) => p.filter((x) => x.id !== id))}
            sugestoes={sugestoesFuncionalidades}
            suggestionRows={suggestionRowsByCategory.funcionalidades}
            suggestionCategory="funcionalidades"
            onCreateSuggestion={cadastrarSugestao}
            onUpdateSuggestion={editarSugestao}
            onDeleteSuggestion={(id) => excluirSugestao(id)}
          />

          <ModalArquivos
            open={getArquivosInfo.open}
            title={getArquivosInfo.title}
            accept={getArquivosInfo.accept}
            files={getArquivosInfo.files}
            onClose={closeArquivos}
            onAdd={getArquivosInfo.onAdd}
            onRemove={getArquivosInfo.onRemove}
          />

          <ModalShell
            open={mostrarModalSucesso}
            title="Produto salvo com sucesso"
            subtitle="Cadastro concluido"
            onClose={() => {
              setMostrarModalSucesso(false);
              setResumoSucesso(null);
            }}
            maxW="max-w-md"
          >
            <div className="space-y-4">
              <div className="text-[12px] text-slate-600">O produto foi salvo no banco de dados.</div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold">EAN / GTIN:</span> {resumoSucesso?.ean || "-"}
                </div>
                <div>
                  <span className="font-semibold">Modelo Referencia:</span> {resumoSucesso?.modeloReferencia || "-"}
                </div>
                <div>
                  <span className="font-semibold">Fabricante:</span> {resumoSucesso?.fabricante || "-"}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalSucesso(false);
                    setResumoSucesso(null);
                  }}
                  className="h-9 px-3 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800"
                >
                  OK
                </button>
              </div>
            </div>
          </ModalShell>

          {/*
          TODO: CASO PRECISE voltar a usar
          <ModalShell
            open={mostrarModalAvisoNovoCadastro}
            title="Revise a NF deste novo cadastro"
            subtitle="Este EAN foi carregado como base e nao deve sobrescrever o cadastro anterior."
            onClose={() => setMostrarModalAvisoNovoCadastro(false)}
            maxW="max-w-lg"
            showCloseButton={false}
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[12px] text-slate-700 space-y-2">
                <div>
                  Para salvar como <span className="font-semibold">novo cadastro</span>, revise e altere os
                  <span className="font-semibold"> Códigos NF</span> antes de tentar salvar novamente.
                </div>
                <div>
                  Se a NF continuar igual ao cadastro-base, voce pode acabar reaproveitando informacoes que pertencem ao item anterior.
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700 space-y-2">
                <div className="font-semibold text-slate-900">NF(s) atual(is)</div>
                {codigosNfResumo.length ? (
                  <div className="space-y-1">
                    {codigosNfResumo.map((item, index) => (
                      <div key={`${item}-${index}`}>{item}</div>
                    ))}
                  </div>
                ) : (
                  <div>Nenhum Codigo NF informado no momento.</div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalAvisoNovoCadastro(false);
                    setMostrarPopupNF(true);
                  }}
                  className="h-9 px-3 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800"
                >
                  IR PARA CODIGOS NF
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarModalAvisoNovoCadastro(false)}
                  className="h-9 px-3 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                >
                  FECHAR
                </button>
              </div>
            </div>
          </ModalShell>
          */}

          <ModalAjuda open={mostrarAjuda} onClose={() => setMostrarAjuda(false)} />
        </div>
      </div>
    </div>
  );
};

export default CadastroNF_EAN_Modelo;
