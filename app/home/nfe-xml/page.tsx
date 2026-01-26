"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  FileCode,
  Trash2,
  ArrowRight,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/Button";

interface Nota {
  chave: string;
  numero: string;
  emissao: string;
  itens: number;
  status: "PENDENTE" | "PARCIAL" | "DIVERGENTE" | "CONFERIDA";
}

type ModalState =
  | { type: "none" }
  | { type: "view"; nota: Nota }
  | { type: "confirmDelete"; nota: Nota }
  | { type: "confirmPreAnalise"; notas: Nota[] }
  | { type: "filters" };

function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-[1.5rem] bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-5">{children}</div>

          {footer ? (
            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Nota["status"] }) {
  const cls =
    status === "PENDENTE"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : status === "CONFERIDA"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : status === "DIVERGENTE"
          ? "bg-red-50 text-red-700 border-red-100"
          : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${cls}`}
    >
      {status}
    </span>
  );
}

function NFeXmlContent() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  // const [query, setQuery] = useState("");
  const [usuario, setUsuario] = useState("");

  // seleção
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // modais e UX
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [busy, setBusy] = useState<null | "upload" | "delete" | "preAnalise">(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // filtros (reais e simples)
  const [statusFilter, setStatusFilter] = useState<Nota["status"] | "ALL">("ALL");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUsuario(user.full_name || user.email?.split("@")[0] || "Usuário");
    }
  }, []);

  const loadNotas = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { NfeService } = await import("@/backend/services/nfeService");
      const data = await NfeService.getNotas();
      setNotas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading notas:", error);
      setNotas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotas();
  }, []);

  const carregarXml = async (file?: File) => {
    if (!file) return;
    setBusy("upload");
    setErrorMsg(null);

    try {
      const { NfeService } = await import("@/backend/services/nfeService");
      // @ts-ignore
      const newNota = await NfeService.carregarXml(file);
      setNotas((s) => [newNota, ...s]);
    } catch (error: any) {
      console.error("Error loading XML:", error);
      setErrorMsg(error?.message || "Erro ao carregar XML");
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();

    return notas.filter((n) => {
      if (statusFilter !== "ALL" && n.status !== statusFilter) return false;

      if (!q) return true;

      const searchableText = [
        n.chave,
        n.numero,
        n.emissao,
        String(n.itens),
        n.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [notas, query, statusFilter]);

  const stats = useMemo(
    () => ({
      total: notas.length,
      pendentes: notas.filter((n) => n.status === "PENDENTE").length,
      parciais: notas.filter((n) => n.status === "PARCIAL").length,
      divergentes: notas.filter((n) => n.status === "DIVERGENTE").length,
      conferidas: notas.filter((n) => n.status === "CONFERIDA").length,
    }),
    [notas]
  );

  const selectedKeys = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  const selectedNotas = useMemo(() => {
    if (selectedKeys.length === 0) return [];
    const map = new Set(selectedKeys);
    return notas.filter((n) => map.has(n.chave));
  }, [selectedKeys, notas]);

  const toggle = (chave: string) =>
    setSelected((s) => ({ ...s, [chave]: !s[chave] }));

  const toggleAllFiltered = (checked: boolean) => {
    const next: Record<string, boolean> = { ...selected };
    filtered.forEach((n) => {
      if (checked) next[n.chave] = true;
      else delete next[n.chave];
    });
    setSelected(next);
  };

  const openView = (nota: Nota) => setModal({ type: "view", nota });
  const openDelete = (nota: Nota) => setModal({ type: "confirmDelete", nota });
  const openFilters = () => setModal({ type: "filters" });
  const openPreAnalise = () => setModal({ type: "confirmPreAnalise", notas: selectedNotas });

  const doDelete = async (nota: Nota) => {
    setBusy("delete");
    setErrorMsg(null);
    try {
      const { NfeService } = await import("@/backend/services/nfeService");

      // ✅ sem mock: só chama se existir
      // @ts-ignore
      if (typeof NfeService.deleteNota !== "function") {
        setErrorMsg("Ação de exclusão ainda não foi implementada no NfeService (deleteNota).");
        return;
      }

      // @ts-ignore
      await NfeService.deleteNota(nota.chave);

      setNotas((s) => s.filter((x) => x.chave !== nota.chave));
      setSelected((s) => {
        const next = { ...s };
        delete next[nota.chave];
        return next;
      });
      setModal({ type: "none" });
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Erro ao excluir nota.");
    } finally {
      setBusy(null);
    }
  };

  const doPreAnalise = async (list: Nota[]) => {
    setBusy("preAnalise");
    setErrorMsg(null);

    try {
      const { NfeService } = await import("@/backend/services/nfeService");

      // ✅ sem mock: só chama se existir
      // @ts-ignore
      if (typeof NfeService.enviarParaPreAnalise !== "function") {
        setErrorMsg("Ação de Pré-Análise ainda não foi implementada no NfeService (enviarParaPreAnalise).");
        return;
      }

      // @ts-ignore
      await NfeService.enviarParaPreAnalise(list.map((n) => n.chave), usuario);

      // opcional: recarrega para refletir status atualizado (real)
      await loadNotas();
      setSelected({});
      setModal({ type: "none" });
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Erro ao enviar para Pré-Análise.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((n) => !!selected[n.chave]);

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 px-6 sm:px-8 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Processamento de NF-e
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Importação, validação e conferência de notas fiscais.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Local search removed to avoid redundancy with Global Search */}

          <Button
            onClick={() => document.getElementById("xmlInput")?.click()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-full px-6 font-semibold transition-all hover:scale-105 active:scale-95"
            disabled={busy === "upload"}
          >
            {busy === "upload" ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" /> Carregando...
              </>
            ) : (
              <>
                <Upload size={18} className="mr-2" /> Carregar XML
              </>
            )}
          </Button>

          <input
            type="file"
            id="xmlInput"
            multiple
            accept=".xml"
            className="hidden"
            onChange={async (e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              for (const file of files) await carregarXml(file);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 sm:p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              Total
            </span>
            <span className="text-3xl font-black text-slate-800">
              {stats.total}
            </span>
          </div>

          <button
            onClick={() => setStatusFilter("PENDENTE")}
            className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden hover:shadow-md transition-all"
            title="Filtrar pendentes"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-full -mr-8 -mt-8" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 mb-2">
              Pendentes
            </span>
            <span className="text-3xl font-black text-amber-600">
              {stats.pendentes}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("DIVERGENTE")}
            className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden hover:shadow-md transition-all"
            title="Filtrar divergentes"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-full -mr-8 -mt-8" />
            <span className="text-xs font-black uppercase tracking-wider text-red-700 mb-2">
              Divergentes
            </span>
            <span className="text-3xl font-black text-red-600">
              {stats.divergentes}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("CONFERIDA")}
            className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden hover:shadow-md transition-all"
            title="Filtrar conferidas"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -mr-8 -mt-8" />
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 mb-2">
              Conferidas
            </span>
            <span className="text-3xl font-black text-emerald-600">
              {stats.conferidas}
            </span>
          </button>
        </div>

        {/* Main */}
        <section className="bg-white p-0 md:p-8 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="p-6 md:p-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <FileCode size={20} className="text-indigo-500" />
                Notas Fiscais Importadas
              </h3>
              <p className="text-sm text-slate-400">
                Gerencie o fluxo de entrada de documentos fiscais.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={openFilters}
                variant="outline"
                className="rounded-full border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 text-xs"
              >
                <Filter size={14} className="mr-2" /> Filtros
              </Button>

              <Button
                onClick={openPreAnalise}
                className="bg-slate-900 text-white rounded-full px-4 text-xs font-black shadow-md hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={selectedNotas.length === 0 || busy === "preAnalise"}
                title={
                  selectedNotas.length === 0
                    ? "Selecione ao menos 1 nota"
                    : "Enviar selecionadas"
                }
              >
                {busy === "preAnalise" ? (
                  <>
                    <Loader2 size={14} className="mr-2 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <ArrowRight size={14} className="mr-2" /> Enviar para Pré-Análise
                  </>
                )}
              </Button>

              {statusFilter !== "ALL" && (
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className="text-xs font-black text-slate-500 hover:text-slate-900 bg-slate-100 border border-slate-200 px-3 py-2 rounded-full"
                  title="Limpar filtro de status"
                >
                  <X size={14} className="inline mr-1" />
                  Status: {statusFilter}
                </button>
              )}
            </div>
          </div>

          {errorMsg ? (
            <div className="mx-6 md:mx-0 mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold">
              {errorMsg}
            </div>
          ) : null}

          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider">
                <tr>
                  <th className="p-4 border-b border-slate-200 w-12">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={allFilteredSelected}
                      onChange={(e) => toggleAllFiltered(e.target.checked)}
                      aria-label="Selecionar filtradas"
                    />
                  </th>
                  <th className="p-4 border-b border-slate-200">Chave</th>
                  <th className="p-4 border-b border-slate-200">Número</th>
                  <th className="p-4 border-b border-slate-200">Emissão</th>
                  <th className="p-4 border-b border-slate-200">Itens</th>
                  <th className="p-4 border-b border-slate-200">Status</th>
                  <th className="p-4 border-b border-slate-200 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((n) => (
                  <tr key={n.chave} className="group hover:bg-indigo-50/30 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={!!selected[n.chave]}
                        onChange={() => toggle(n.chave)}
                        aria-label={`Selecionar NF ${n.numero}`}
                      />
                    </td>

                    <td className="p-4 font-mono text-slate-500 max-w-[220px] truncate" title={n.chave}>
                      {n.chave}
                    </td>
                    <td className="p-4 font-black text-slate-800">{n.numero}</td>
                    <td className="p-4 text-slate-600">{n.emissao}</td>
                    <td className="p-4 text-slate-600">{n.itens}</td>
                    <td className="p-4">
                      <StatusPill status={n.status} />
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openView(n)}
                          className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Visualizar"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => openDelete(n)}
                          className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Excluir"
                          disabled={busy === "delete"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                      Nenhuma nota fiscal encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden space-y-4 px-6 md:px-0 pb-6">
            {/* Busca no mobile */}


            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                checked={allFilteredSelected}
                onChange={(e) => toggleAllFiltered(e.target.checked)}
              />
              Selecionar filtradas
            </label>

            {filtered.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                Nenhuma nota encontrada.
              </div>
            ) : (
              filtered.map((n) => (
                <div
                  key={n.chave}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative"
                >
                  <div className="absolute top-4 right-4">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                      checked={!!selected[n.chave]}
                      onChange={() => toggle(n.chave)}
                    />
                  </div>

                  <div className="flex justify-between items-start mb-3 pr-10">
                    <div>
                      <span
                        className="text-xs font-mono text-slate-400 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 block mb-1 truncate w-52"
                        title={n.chave}
                      >
                        {n.chave}
                      </span>
                      <h4 className="font-black text-slate-900 flex items-center gap-2">
                        <FileText size={16} className="text-indigo-500" /> NF-e {n.numero}
                      </h4>
                    </div>
                    <StatusPill status={n.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-4 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1">
                      <Clock size={12} /> Emissão: {n.emissao}
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={12} /> Itens: {n.itens}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openView(n)}
                      className="flex-1 h-10 rounded-full border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors"
                    >
                      Visualizar
                    </button>
                    <button
                      onClick={() => openDelete(n)}
                      className="h-10 w-10 rounded-full border border-red-200 bg-red-50 text-red-700 flex items-center justify-center hover:bg-red-100 transition-colors"
                      title="Excluir"
                      disabled={busy === "delete"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* MODAL: visualizar */}
      <Modal
        open={modal.type === "view"}
        title={modal.type === "view" ? `NF-e ${modal.nota.numero}` : "NF-e"}
        onClose={() => setModal({ type: "none" })}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setModal({ type: "none" })}
            >
              Fechar
            </Button>
          </div>
        }
      >
        {modal.type === "view" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusPill status={modal.nota.status} />
              <span className="text-xs font-mono text-slate-400">Itens: {modal.nota.itens}</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Chave de acesso
              </p>
              <p className="font-mono text-sm text-slate-700 break-all">{modal.nota.chave}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Emissão
                </p>
                <p className="text-sm font-black text-slate-900">{modal.nota.emissao}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Número
                </p>
                <p className="text-sm font-black text-slate-900">{modal.nota.numero}</p>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Se você quiser abrir uma página completa de detalhes, eu posso trocar esse modal por rota
              <span className="font-black text-slate-700"> /home/nfe-xml/[chave]</span>.
            </div>
          </div>
        ) : null}
      </Modal>

      {/* MODAL: confirmar exclusão */}
      <Modal
        open={modal.type === "confirmDelete"}
        title="Excluir NF-e"
        onClose={() => setModal({ type: "none" })}
        footer={
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setModal({ type: "none" })}
              disabled={busy === "delete"}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (modal.type === "confirmDelete") doDelete(modal.nota);
              }}
              disabled={busy === "delete"}
            >
              {busy === "delete" ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" /> Excluindo...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" /> Excluir
                </>
              )}
            </Button>
          </div>
        }
      >
        {modal.type === "confirmDelete" ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800 text-sm font-semibold">
              Tem certeza que deseja excluir a NF-e <span className="font-black">{modal.nota.numero}</span>?
              Essa ação não pode ser desfeita.
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Chave
              </p>
              <p className="font-mono text-xs text-slate-700 break-all">{modal.nota.chave}</p>
            </div>

            {errorMsg ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 text-sm font-semibold">
                {errorMsg}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* MODAL: confirmar pré-análise */}
      <Modal
        open={modal.type === "confirmPreAnalise"}
        title="Enviar para Pré-Análise"
        onClose={() => setModal({ type: "none" })}
        footer={
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setModal({ type: "none" })}
              disabled={busy === "preAnalise"}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-full bg-slate-900 hover:bg-slate-800 text-white"
              onClick={() => {
                if (modal.type === "confirmPreAnalise") doPreAnalise(modal.notas);
              }}
              disabled={busy === "preAnalise"}
            >
              {busy === "preAnalise" ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Check size={16} className="mr-2" /> Confirmar envio
                </>
              )}
            </Button>
          </div>
        }
      >
        {modal.type === "confirmPreAnalise" ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Você vai enviar <span className="font-black">{modal.notas.length}</span> nota(s) para Pré-Análise.
            </div>

            <div className="max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white">
              <ul className="divide-y divide-slate-100">
                {modal.notas.map((n) => (
                  <li key={n.chave} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">NF-e {n.numero}</p>
                      <p className="text-xs font-mono text-slate-400 truncate">{n.chave}</p>
                    </div>
                    <StatusPill status={n.status} />
                  </li>
                ))}
              </ul>
            </div>

            {errorMsg ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 text-sm font-semibold">
                {errorMsg}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* MODAL: filtros */}
      <Modal
        open={modal.type === "filters"}
        title="Filtros"
        onClose={() => setModal({ type: "none" })}
        footer={
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setStatusFilter("ALL");
                setModal({ type: "none" });
              }}
            >
              Limpar filtros
            </Button>

            <Button
              className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setModal({ type: "none" })}
            >
              Aplicar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
              Status
            </p>

            <div className="flex flex-wrap gap-2">
              {(["ALL", "PENDENTE", "PARCIAL", "DIVERGENTE", "CONFERIDA"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-full border text-xs font-black transition-colors ${statusFilter === s
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  {s === "ALL" ? "Todos" : s}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Se você quiser filtro por “período de emissão” ou “itens {'>'}= X”, eu adiciono — só precisa existir o campo (ou
            a regra) no backend/retorno.
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function NFeXmlPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
      </div>
    }>
      <NFeXmlContent />
    </Suspense>
  );
}

