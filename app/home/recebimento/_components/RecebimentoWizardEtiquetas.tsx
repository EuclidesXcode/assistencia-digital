"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = { withNf: boolean };
type LoteStatus = "ABERTO" | "FINALIZADO";
type LabelKey = "CODIGO_UNICO" | "VISTORIA_REVENDA" | "SAT";

type LabelData = { file?: File | null; previewUrl?: string; missing?: boolean; pendencias: string[] };
type FotoSnapshot = { key: LabelKey; title: string; previewUrl?: string; missing?: boolean };
type Row = {
  numero: number;
  recebidoPor: string;
  dataHoraIso: string;
  dataHoraLabel: string;
  codigoUnico: string;
  codigoNf: string;
  ns: string;
  fotos: FotoSnapshot[];
};

const LABELS: { key: LabelKey; title: string; hint: string }[] = [
  { key: "CODIGO_UNICO", title: "Etiqueta CÓDIGO ÚNICO", hint: "Centralize o CÓDIGO ÚNICO na moldura." },
  { key: "VISTORIA_REVENDA", title: "Etiqueta de Vistoria da Revenda", hint: "Capture filial/UF, data e carimbo." },
  { key: "SAT", title: "Etiqueta SAT", hint: "Registre nº/OS/Carimbo quando houver." },
];

const RX = {
  CODIGO_UNICO: /^[A-Z][A-Z0-9]{7}$/,
  CODIGO_NF: /^[0-9]{6,10}$/,
  NS: /^[A-Z0-9]{6,20}$/i,
};

const STEP_TITLES = [
  "Etiqueta CÓDIGO ÚNICO",
  "Etiqueta de Vistoria da Revenda",
  "Etiqueta SAT",
  "Recebimento do Produto",
];

const initialDados: Record<LabelKey, LabelData> = {
  CODIGO_UNICO: { missing: false, pendencias: [] },
  VISTORIA_REVENDA: { missing: false, pendencias: [] },
  SAT: { missing: false, pendencias: [] },
};

const CAD_NF = new Map<string, { modeloReferencia: string }>([
  ["3551512", { modeloReferencia: 'TV 32"PHILCO LED PH32E53SG HD/DTV/USB/NET' }],
  ["1234567", { modeloReferencia: "TV 50 HISENSE 50A6K UHD SMART WIFI BT HDMI" }],
  ["9876543", { modeloReferencia: "TV 40 BRITÂNIA BTV40G7FSA" }],
]);

const stripWS = (s: string) => (s || "").replace(/\s+/g, "");
const sanitize = (raw: string, kind: "CODIGO_UNICO" | "CODIGO_NF" | "NS") => {
  let s = stripWS(raw).replace(/^0+/, "");
  if (kind !== "CODIGO_NF") s = s.toUpperCase();
  return s;
};

const toDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(new Error("Falha ao ler imagem"));
    fr.readAsDataURL(file);
  });

export default function RecebimentoWizardEtiquetas({ withNf }: Props) {
  const storage = withNf ? "COM_NF" : "SEM_NF";
  const [usuarioLogado, setUsuarioLogado] = useState("EDUARDO");
  const [loteId, setLoteId] = useState(0);
  const [loteStatus, setLoteStatus] = useState<LoteStatus>("ABERTO");
  const [step, setStep] = useState(0);
  const [dados, setDados] = useState<Record<LabelKey, LabelData>>(initialDados);
  const [form, setForm] = useState({ codigoUnico: "", codigoNf: "", ns: "" });
  const [simAlt, setSimAlt] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({ codigoUnico: "", codigoNf: "", ns: "" });
  const [fotoModal, setFotoModal] = useState<{ rowNumero: number; fotoKey: LabelKey; title: string; previewUrl?: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "info" | "success" | "warn" | "danger" } | null>(null);

  const fileInputs = {
    CODIGO_UNICO: useRef<HTMLInputElement>(null),
    VISTORIA_REVENDA: useRef<HTMLInputElement>(null),
    SAT: useRef<HTMLInputElement>(null),
  };
  const fotoPickerRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  const notify = (msg: string, kind: "info" | "success" | "warn" | "danger" = "info") => setToast({ msg, kind });

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const resetFlow = () => {
    setStep(0);
    setForm({ codigoUnico: "", codigoNf: "", ns: "" });
    setDados({
      CODIGO_UNICO: { missing: false, pendencias: [] },
      VISTORIA_REVENDA: { missing: false, pendencias: [] },
      SAT: { missing: false, pendencias: [] },
    });
  };

  const iniciarNovoLote = () => {
    const key = `ETCH_RECEB_LOTE_SEQ_${storage}`;
    const next = Number(localStorage.getItem(key) || "0") + 1;
    localStorage.setItem(key, String(next));
    setLoteId(next);
    setLoteStatus("ABERTO");
    setRows([]);
    setEdit(null);
    setFotoModal(null);
    resetFlow();
    notify(`Novo lote iniciado: Lote ${next}`, "success");
  };

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      iniciarNovoLote();
    } catch {
      setLoteId(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFile = async (k: LabelKey, file: File) => {
    const url = await toDataURL(file);
    setDados((p) => ({ ...p, [k]: { ...p[k], file, previewUrl: url, missing: false } }));
  };

  const markMissing = (k: LabelKey) => {
    if (loteStatus === "FINALIZADO") return;
    const pend = k === "CODIGO_UNICO" ? "Coletar foto da etiqueta CÓDIGO ÚNICO (Recebimento)" : k === "VISTORIA_REVENDA" ? "Coletar foto Vistoria Revenda" : "Coletar foto etiqueta SAT";
    setDados((p) => {
      const pendencias = [...(p[k]?.pendencias || [])];
      if (!pendencias.includes(pend)) pendencias.push(pend);
      return { ...p, [k]: { ...p[k], file: null, previewUrl: undefined, missing: true, pendencias } };
    });
  };

  const bloqueado = loteStatus === "FINALIZADO";
  const codigoUnicoVal = sanitize(form.codigoUnico, "CODIGO_UNICO");
  const nfVal = sanitize(form.codigoNf, "CODIGO_NF");
  const nsVal = sanitize(form.ns, "NS");
  const codigoUnicoOk = !codigoUnicoVal || RX.CODIGO_UNICO.test(codigoUnicoVal);
  const nfOk = !nfVal || RX.CODIGO_NF.test(nfVal);
  const nsOk = !nsVal || RX.NS.test(nsVal);
  const nfCadastro = useMemo(() => (withNf && nfOk && nfVal ? CAD_NF.get(nfVal) || null : null), [withNf, nfOk, nfVal]);
  const ordered = useMemo(() => [...rows].sort((a, b) => a.numero - b.numero), [rows]);

  const nextNumero = () => rows.reduce((m, r) => Math.max(m, r.numero), 0) + 1;
  const snapshotFotos = (): FotoSnapshot[] => LABELS.map((l) => ({ key: l.key, title: l.title, previewUrl: dados[l.key]?.previewUrl, missing: !!dados[l.key]?.missing }));

  const simularEtapa4 = () => {
    const next = !simAlt;
    setSimAlt(next);
    setUsuarioLogado(next ? "EDUARDO" : "FERNANDA");
    setForm({
      codigoUnico: next ? "A1234567" : "B2345678",
      codigoNf: withNf ? (next ? "3551512" : "7777777") : "",
      ns: next ? "ZX9K88" : "",
    });
  };

  const salvarFinalizar = () => {
    if (bloqueado) return notify(`O Lote ${loteId} está finalizado. Inicie um novo lote.`, "warn");
    const errs: string[] = [];
    if (!usuarioLogado.trim()) errs.push("Usuário logado inválido.");
    if (!codigoUnicoVal) errs.push("CÓDIGO ÚNICO é obrigatório");
    if (!RX.CODIGO_UNICO.test(codigoUnicoVal)) errs.push("CÓDIGO ÚNICO inválido (ex.: A1234567)");
    if (withNf && !nfVal) errs.push("CÓDIGO NF é obrigatório");
    if (withNf && nfVal && !RX.CODIGO_NF.test(nfVal)) errs.push("CÓDIGO NF inválido (6-10 dígitos)");
    if (errs.length) return notify(errs.join(" • "), "danger");
    const now = new Date();
    setRows((p) => [
      ...p,
      {
        numero: nextNumero(),
        recebidoPor: usuarioLogado.trim(),
        dataHoraIso: now.toISOString(),
        dataHoraLabel: now.toLocaleDateString("pt-BR", { dateStyle: "short" }),
        codigoUnico: codigoUnicoVal,
        codigoNf: withNf ? nfVal : "SEM NF",
        ns: nsVal || "—",
        fotos: snapshotFotos(),
      },
    ]);
    resetFlow();
    notify("Recebimento salvo.", "success");
  };

  const abrirEdicao = (r: Row) => {
    if (bloqueado) return notify("Lote finalizado: não é possível alterar.", "warn");
    setEdit(r);
    setEditForm({ codigoUnico: r.codigoUnico, codigoNf: withNf ? r.codigoNf : "", ns: r.ns === "—" ? "" : r.ns });
  };

  const salvarEdicao = () => {
    if (!edit) return;
    if (bloqueado) return notify("Lote finalizado: não é possível salvar.", "warn");
    const codigoUnico = sanitize(editForm.codigoUnico, "CODIGO_UNICO");
    const codigoNf = sanitize(editForm.codigoNf, "CODIGO_NF");
    const ns = sanitize(editForm.ns, "NS");
    const errs: string[] = [];
    if (!codigoUnico || !RX.CODIGO_UNICO.test(codigoUnico)) errs.push("CÓDIGO ÚNICO inválido.");
    if (withNf && (!codigoNf || !RX.CODIGO_NF.test(codigoNf))) errs.push("CÓDIGO NF inválido.");
    if (errs.length) return notify(errs.join(" "), "danger");
    setRows((p) =>
      p.map((x) =>
        x.numero === edit.numero
          ? { ...x, codigoUnico, codigoNf: withNf ? codigoNf : "SEM NF", ns: ns || "—" }
          : x
      )
    );
    setEdit(null);
    notify("Alterações salvas.", "success");
  };

  const excluirRecebimento = (r: Row) => {
    if (bloqueado) return notify("Lote finalizado: não é possível excluir.", "warn");
    if (!window.confirm(`Excluir o recebimento Nº ${r.numero}?`)) return;
    setRows((p) => p.filter((x) => x.numero !== r.numero));
    if (edit?.numero === r.numero) setEdit(null);
    if (fotoModal?.rowNumero === r.numero) setFotoModal(null);
    notify(`Recebimento Nº ${r.numero} excluído.`, "success");
  };

  const applyFotoToRow = async (file: File) => {
    if (!fotoModal || bloqueado) return;
    const url = await toDataURL(file);
    const { rowNumero, fotoKey, title } = fotoModal;
    setRows((p) =>
      p.map((r) => {
        if (r.numero !== rowNumero) return r;
        return { ...r, fotos: r.fotos.map((f) => (f.key === fotoKey ? { ...f, title, previewUrl: url, missing: false } : f)) };
      })
    );
    setFotoModal((m) => (m ? { ...m, previewUrl: url } : m));
    notify("Foto atualizada.", "success");
  };

  const excluirFotoAtual = () => {
    if (!fotoModal?.previewUrl || bloqueado) return;
    if (!window.confirm("Excluir esta foto?")) return;
    const { rowNumero, fotoKey, title } = fotoModal;
    setRows((p) =>
      p.map((r) => {
        if (r.numero !== rowNumero) return r;
        return { ...r, fotos: r.fotos.map((f) => (f.key === fotoKey ? { ...f, title, previewUrl: undefined, missing: false } : f)) };
      })
    );
    setFotoModal((m) => (m ? { ...m, previewUrl: undefined } : m));
    notify("Foto excluída.", "success");
  };

  const finalizarLote = () => {
    if (!rows.length) return notify("Não há recebimentos neste lote.", "warn");
    if (!window.confirm(`Finalizar Lote ${loteId}? Depois não será possível alterar.`)) return;
    setLoteStatus("FINALIZADO");
    notify(`Lote ${loteId} finalizado.`, "success");
  };

  const curLabel = step >= 1 && step <= 3 ? LABELS[step - 1] : null;
  const curDados = curLabel ? dados[curLabel.key] : null;
  const getModelo = (codigoNf: string) => (withNf ? CAD_NF.get(codigoNf)?.modeloReferencia || "Aguardando cadastro" : "Não se aplica");
  const hasModelo = (codigoNf: string) => (withNf ? !!CAD_NF.get(codigoNf)?.modeloReferencia : false);
  const emptyCols = withNf ? 10 : 8;

  const iconBtn = "inline-flex items-center justify-center w-7 h-7 rounded-xl border";

  return (
    <div className="min-h-screen w-full bg-slate-100 p-4">
      <div className="max-w-6xl mx-auto text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">RECEBIMENTO DE PRODUTO</h1>
            <span className="inline-flex items-center px-3 py-1 rounded-2xl bg-slate-100 text-slate-800 text-xs font-semibold">Lote {loteId || "—"}</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-2xl text-xs font-semibold border ${loteStatus === "ABERTO" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>{loteStatus}</span>
            {!withNf ? <span className="inline-flex items-center px-3 py-1 rounded-2xl text-xs font-semibold border bg-sky-50 text-sky-800 border-sky-200">SEM NF</span> : null}
          </div>
        </div>

        {step === 0 ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-lg mb-1">Fluxo guiado de 4 etapas</div>
              <div className="text-sm text-slate-600">CÓDIGO ÚNICO → Vistoria Revenda → SAT → Recebimento do Produto.</div>
              <div className="text-xs text-slate-500 mt-2">Etapas: {STEP_TITLES.join(" → ")}</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className={`px-5 py-3 rounded-2xl border text-white ${loteStatus === "ABERTO" ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed"}`} onClick={() => (bloqueado ? notify(`O Lote ${loteId} está finalizado. Inicie um novo lote.`, "warn") : setStep(1))} disabled={bloqueado}>Efetuar Recebimento</button>
              {bloqueado ? <button type="button" className="px-5 py-3 rounded-2xl border hover:bg-slate-50" onClick={iniciarNovoLote}>Novo Lote</button> : null}
            </div>
          </div>
        ) : null}

        {step >= 1 && step <= 3 && curLabel && curDados ? (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-slate-500">Passo {step} de 4</div>
            <div className="text-xl font-bold mb-2">{curLabel.title}</div>
            <div className="border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-white shadow-sm">
              <div className="w-full max-w-md aspect-[4/3] bg-slate-50 rounded-xl flex items-center justify-center mb-3">
                {curDados.previewUrl ? <img src={curDados.previewUrl} alt="Preview" className="w-full h-full object-contain rounded-xl" /> : <div className="text-slate-400 text-sm px-6"><div className="font-semibold mb-1">Mantenha a etiqueta centralizada e legível</div><div className="opacity-80">Use boa iluminação, evite reflexos e tremores.</div></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-blue-600 text-white hover:bg-blue-700" onClick={() => fileInputs[curLabel.key].current?.click()}>Abrir Câmera</button>
                <input ref={fileInputs[curLabel.key]} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(curLabel.key, f); }} />
                <button type="button" className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${curDados.missing ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700" : "hover:bg-slate-50"}`} onClick={() => markMissing(curLabel.key)}>Etiqueta não disponível</button>
              </div>
              <div className="mt-3 text-left w-full max-w-md text-sm text-slate-600"><div className="font-semibold">Dica:</div><div className="opacity-90">{curLabel.hint}</div></div>
              <div className="mt-4 w-full max-w-md flex items-center justify-between gap-2">
                <button type="button" className="px-4 py-2 rounded-xl border hover:bg-slate-50" onClick={() => setStep((s) => Math.max(0, s - 1))}>Voltar</button>
                <button type="button" className="px-4 py-2 rounded-xl border bg-blue-600 text-white hover:bg-blue-700" onClick={() => setStep((s) => Math.min(4, s + 1))}>{step < 3 ? "Avançar" : "Ir para Recebimento"}</button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="text-xl font-bold">Recebimento do Produto</div>
              <div className="flex items-center gap-2">
                <button type="button" className="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm" onClick={() => setStep(3)}>Voltar</button>
                <button type="button" className="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm" onClick={simularEtapa4}>Simular</button>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${withNf ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">CÓDIGO ÚNICO<span className="text-red-600"> *</span></label>
                <input
                  className={`px-3 py-2 rounded-lg border ${form.codigoUnico && !codigoUnicoOk ? "border-red-500" : "border-slate-300"}`}
                  placeholder="Digite o CÓDIGO ÚNICO (ex.: A1234567)"
                  value={form.codigoUnico}
                  onChange={(e) => setForm({ ...form, codigoUnico: sanitize(e.target.value, "CODIGO_UNICO") })}
                />
                {form.codigoUnico && !codigoUnicoOk ? <div className="text-xs text-red-600">Formato inválido (8 caracteres, começa com letra).</div> : null}
              </div>

              {withNf ? (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">CÓDIGO NF<span className="text-red-600"> *</span></label>
                  <input
                    className={`px-3 py-2 rounded-lg border ${form.codigoNf && !nfOk ? "border-red-500" : "border-slate-300"}`}
                    placeholder="Digite o Código NF"
                    value={form.codigoNf}
                    onChange={(e) => setForm({ ...form, codigoNf: sanitize(e.target.value, "CODIGO_NF") })}
                  />
                  {form.codigoNf && !nfOk ? <div className="text-xs text-red-600">Somente números (6-10 dígitos).</div> : null}
                  {nfVal && nfOk ? (
                    nfCadastro?.modeloReferencia ? (
                      <div className="text-xs mt-1 text-green-700">Modelo Referência: <b>{nfCadastro.modeloReferencia}</b></div>
                    ) : (
                      <div className="text-xs mt-1 text-amber-700"><b>Modelo Referência não cadastrado</b> • Aguardando cadastro.</div>
                    )
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Número de Série</label>
                <input
                  className={`px-3 py-2 rounded-lg border ${form.ns && !nsOk ? "border-amber-500" : "border-slate-300"}`}
                  placeholder="Digite o Número de Série"
                  value={form.ns}
                  onChange={(e) => setForm({ ...form, ns: sanitize(e.target.value, "NS") })}
                />
                {form.ns && !nsOk ? <div className="text-xs text-amber-700">Formato incomum (alfa-numérico 6-20). Não bloqueia.</div> : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button type="button" className="px-4 py-2 rounded-xl border hover:bg-slate-50" onClick={() => setStep(3)}>Voltar</button>
              <button type="button" className="px-5 py-3 rounded-2xl border bg-blue-600 text-white hover:bg-blue-700" onClick={salvarFinalizar}>Salvar e Finalizar Recebimento</button>
            </div>
          </div>
        ) : null}

        {step > 0 ? <div className="mt-4 text-xs text-slate-500">Etapas: {STEP_TITLES.join(" → ")}</div> : null}

        <div className="mt-6 rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-lg font-bold">Recebimentos do Lote {loteId}</div>
              <div className="text-sm text-slate-600">Lista dos produtos que já tiveram o recebimento finalizado.</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-500">Total: <b>{rows.length}</b></div>
              {loteStatus === "ABERTO" ? (
                <button
                  type="button"
                  className={`px-3 py-2 rounded-xl border text-sm ${rows.length ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                  onClick={finalizarLote}
                  disabled={!rows.length}
                >
                  Finalizar Lote
                </button>
              ) : (
                <button type="button" className="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm" onClick={iniciarNovoLote}>Novo Lote</button>
              )}
            </div>
          </div>

          <div className="hidden md:block px-2 pb-2">
            <table className="w-full table-fixed">
              <thead>
                <tr className="text-center text-[11px] font-semibold uppercase text-slate-600 bg-slate-50">
                  <th className="px-2 py-2 border-b">Alterar</th>
                  <th className="px-2 py-2 border-b">Nº</th>
                  <th className="px-2 py-2 border-b">Recebido por</th>
                  <th className="px-2 py-2 border-b">Data</th>
                  <th className="px-2 py-2 border-b">CD. ÚNICO</th>
                  {withNf ? <th className="px-2 py-2 border-b">CÓDIGO NF</th> : null}
                  <th className="px-2 py-2 border-b">Nº SÉRIE</th>
                  {withNf ? <th className="px-2 py-2 border-b">MODELO REFERÊNCIA</th> : null}
                  <th className="px-2 py-2 border-b">FOTOS</th>
                  <th className="px-2 py-2 border-b">EXCLUIR</th>
                </tr>
              </thead>
              <tbody>
                {!ordered.length ? (
                  <tr><td className="px-3 py-6 text-sm text-slate-500" colSpan={emptyCols}>Nenhum recebimento finalizado ainda.</td></tr>
                ) : (
                  ordered.map((r) => {
                    const modelo = getModelo(r.codigoNf);
                    const modeloOk = hasModelo(r.codigoNf);
                    return (
                      <tr key={`${r.numero}-${r.dataHoraIso}`} className="hover:bg-slate-50/60 text-center text-[11px]">
                        <td className="px-2 py-2 border-b">
                          <button type="button" className={`${iconBtn} ${bloqueado ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "hover:bg-slate-50"}`} onClick={() => (bloqueado ? notify("Lote finalizado: alterações bloqueadas.", "warn") : abrirEdicao(r))} disabled={bloqueado}>Alt</button>
                        </td>
                        <td className="px-2 py-2 border-b"><span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 font-semibold">{r.numero}</span></td>
                        <td className="px-2 py-2 border-b font-semibold">{r.recebidoPor}</td>
                        <td className="px-2 py-2 border-b">{r.dataHoraLabel}</td>
                        <td className="px-2 py-2 border-b font-mono">{r.codigoUnico}</td>
                        {withNf ? <td className="px-2 py-2 border-b font-mono">{r.codigoNf}</td> : null}
                        <td className="px-2 py-2 border-b font-mono">{r.ns}</td>
                        {withNf ? <td className={`px-2 py-2 border-b ${modeloOk ? "text-slate-800" : "text-amber-700"}`}>{modelo}</td> : null}
                        <td className="px-2 py-2 border-b">
                          <div className="flex items-center justify-center gap-1">
                            {r.fotos.map((f) => (
                              <button
                                key={f.key}
                                type="button"
                                className={`rounded-lg border overflow-hidden w-6 h-6 ${bloqueado ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "hover:ring-2 hover:ring-blue-300"} ${f.previewUrl ? "bg-slate-100" : f.missing ? "bg-amber-50 border-amber-200" : "bg-slate-50"}`}
                                onClick={() => (bloqueado ? notify("Lote finalizado: alterações bloqueadas.", "warn") : setFotoModal({ rowNumero: r.numero, fotoKey: f.key, title: f.title, previewUrl: f.previewUrl }))}
                                disabled={bloqueado}
                              >
                                {f.previewUrl ? <img src={f.previewUrl} alt={f.title} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-[9px] font-semibold ${f.missing ? "text-amber-800" : "text-slate-400"}`}>{f.missing ? "N/D" : "—"}</div>}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-2 py-2 border-b">
                          <button type="button" className={`${iconBtn} ${bloqueado ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed" : "hover:bg-rose-50 text-rose-700 border-rose-200"}`} onClick={() => excluirRecebimento(r)} disabled={bloqueado}>Del</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y">
            {!ordered.length ? (
              <div className="px-4 py-6 text-sm text-slate-500">Nenhum recebimento finalizado ainda.</div>
            ) : (
              ordered.map((r) => {
                const modelo = getModelo(r.codigoNf);
                const modeloOk = hasModelo(r.codigoNf);
                return (
                  <div key={`${r.numero}-${r.dataHoraIso}`} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-[11px] font-semibold">{r.numero}</span>
                          <div className="font-mono text-slate-800 truncate">{r.codigoUnico}</div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          <span className="font-semibold text-slate-700">{r.recebidoPor}</span> • {r.dataHoraLabel}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" className={`${iconBtn} ${bloqueado ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "hover:bg-slate-50"}`} onClick={() => (bloqueado ? notify("Lote finalizado: alterações bloqueadas.", "warn") : abrirEdicao(r))} disabled={bloqueado}>Alt</button>
                        <button type="button" className={`${iconBtn} ${bloqueado ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed" : "hover:bg-rose-50 text-rose-700 border-rose-200"}`} onClick={() => excluirRecebimento(r)} disabled={bloqueado}>Del</button>
                      </div>
                    </div>

                    <div className={`mt-3 grid ${withNf ? "grid-cols-2" : "grid-cols-1"} gap-3 text-sm`}>
                      {withNf ? (
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">CÓDIGO NF</div>
                          <div className="font-mono text-slate-800">{r.codigoNf}</div>
                        </div>
                      ) : null}
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Número de Série</div>
                        <div className="font-mono text-slate-800">{r.ns}</div>
                      </div>
                      {withNf ? (
                        <div className="col-span-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">Modelo Referência</div>
                          <div className={`text-sm ${modeloOk ? "text-slate-800" : "text-amber-700"}`}>{modelo}</div>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Fotos (toque para incluir/alterar)</div>
                      <div className="flex flex-wrap gap-2">
                        {r.fotos.map((f) => (
                          <button
                            key={f.key}
                            type="button"
                            className={`rounded-lg border overflow-hidden w-9 h-9 ${bloqueado ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "hover:ring-2 hover:ring-blue-300"} ${f.previewUrl ? "bg-slate-100" : f.missing ? "bg-amber-50 border-amber-200" : "bg-slate-50"}`}
                            onClick={() => (bloqueado ? notify("Lote finalizado: alterações bloqueadas.", "warn") : setFotoModal({ rowNumero: r.numero, fotoKey: f.key, title: f.title, previewUrl: f.previewUrl }))}
                            disabled={bloqueado}
                          >
                            {f.previewUrl ? <img src={f.previewUrl} alt={f.title} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-[10px] font-semibold ${f.missing ? "text-amber-800" : "text-slate-400"}`}>{f.missing ? "N/D" : "—"}</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {fotoModal ? (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setFotoModal(null)}>
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800">{fotoModal.title}</div>
                  <div className="text-xs text-slate-500 mt-1">Recebimento Nº <b>{fotoModal.rowNumero}</b></div>
                </div>
                <button type="button" className="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm" onClick={() => setFotoModal(null)}>Fechar</button>
              </div>
              <div className="p-4">
                <div className="bg-slate-50 rounded-2xl border overflow-hidden">
                  <div className="w-full max-h-[55vh] flex items-center justify-center p-3">
                    {fotoModal.previewUrl ? <img src={fotoModal.previewUrl} alt={fotoModal.title} className="w-full max-h-[52vh] object-contain rounded-xl" /> : <div className="w-full h-[240px] flex items-center justify-center text-slate-400 text-sm">Sem foto</div>}
                  </div>
                </div>
                <input ref={fotoPickerRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; applyFotoToRow(f); e.currentTarget.value = ""; }} />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-500">Clique em <b>{fotoModal.previewUrl ? "Alterar" : "Incluir"}</b> para enviar uma nova foto.</div>
                  <div className="flex items-center gap-2">
                    {fotoModal.previewUrl ? <button type="button" className="px-3 py-2 rounded-xl border hover:bg-rose-50 text-sm text-rose-700 border-rose-200" onClick={excluirFotoAtual}>Excluir</button> : null}
                    <button type="button" className="px-4 py-2 rounded-xl border bg-blue-600 text-white hover:bg-blue-700 text-sm" onClick={() => fotoPickerRef.current?.click()}>{fotoModal.previewUrl ? "Alterar" : "Incluir"}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {edit ? (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEdit(null)}>
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-800">Alterar recebimento</div>
                  <div className="text-xs text-slate-500">Nº {edit.numero} • {edit.dataHoraLabel}</div>
                </div>
                <button type="button" className="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm" onClick={() => setEdit(null)}>Fechar</button>
              </div>
              <div className="p-4">
                <div className={`grid grid-cols-1 ${withNf ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">CÓDIGO ÚNICO<span className="text-red-600"> *</span></label>
                    <input className={`px-3 py-2 rounded-lg border ${editForm.codigoUnico && !RX.CODIGO_UNICO.test(sanitize(editForm.codigoUnico, "CODIGO_UNICO")) ? "border-red-500" : "border-slate-300"}`} value={editForm.codigoUnico} onChange={(e) => setEditForm({ ...editForm, codigoUnico: sanitize(e.target.value, "CODIGO_UNICO") })} placeholder="Ex.: A1234567" />
                  </div>
                  {withNf ? (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">CÓDIGO NF<span className="text-red-600"> *</span></label>
                      <input className={`px-3 py-2 rounded-lg border ${editForm.codigoNf && !RX.CODIGO_NF.test(sanitize(editForm.codigoNf, "CODIGO_NF")) ? "border-red-500" : "border-slate-300"}`} value={editForm.codigoNf} onChange={(e) => setEditForm({ ...editForm, codigoNf: sanitize(e.target.value, "CODIGO_NF") })} placeholder="Somente números" />
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Número de Série</label>
                    <input className={`px-3 py-2 rounded-lg border ${editForm.ns && !RX.NS.test(sanitize(editForm.ns, "NS")) ? "border-amber-500" : "border-slate-300"}`} value={editForm.ns} onChange={(e) => setEditForm({ ...editForm, ns: sanitize(e.target.value, "NS") })} placeholder="Opcional" />
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button type="button" className="px-4 py-2 rounded-xl border hover:bg-slate-50" onClick={() => setEdit(null)}>Cancelar</button>
                  <button type="button" className="px-5 py-2 rounded-xl border bg-blue-600 text-white hover:bg-blue-700" onClick={salvarEdicao}>Salvar alterações</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {toast ? (
          <div className="fixed bottom-4 right-4 z-[70]">
            <div className={`rounded-2xl shadow-lg border px-4 py-3 text-sm max-w-[340px] ${toast.kind === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : toast.kind === "warn" ? "bg-amber-50 border-amber-200 text-amber-900" : toast.kind === "danger" ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-white border-slate-200 text-slate-900"}`}>
              {toast.msg}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
