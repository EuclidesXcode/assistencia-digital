"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, ClipboardCheck, Clock, History, Search, Wrench } from "lucide-react";
import { AnaliseTecnicaRegistro } from "@/backend/models/AnaliseTecnica";
import { ModalShell } from "@/app/home/produtos/components/UIComponents";

const sectionCardClass = "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4";
const panelClass = "rounded-2xl border border-slate-200 overflow-x-auto bg-white";

function getUserName() {
  if (typeof window === "undefined") return "SISTEMA";
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "SISTEMA";
    const user = JSON.parse(raw);
    return String(user?.name || user?.email || "SISTEMA").trim().toUpperCase() || "SISTEMA";
  } catch {
    return "SISTEMA";
  }
}

function getSnapshot(item: AnaliseTecnicaRegistro) {
  const dados = item?.dadosPreAnalise && typeof item.dadosPreAnalise === "object" ? item.dadosPreAnalise : {};
  const snapshot = (dados as Record<string, unknown>)?.snapshot;
  return snapshot && typeof snapshot === "object" ? (snapshot as Record<string, unknown>) : {};
}

function countList(item: AnaliseTecnicaRegistro, key: string) {
  const value = getSnapshot(item)[key];
  return Array.isArray(value) ? value.length : 0;
}

function resumoItens(item: AnaliseTecnicaRegistro) {
  return `EMB ${countList(item, "embalagem")} · ACE ${countList(item, "acessorios")} · EST ${countList(item, "estetica")} · FUN ${countList(item, "funcional")} · FLD ${countList(item, "funcionalidade")}`;
}

function statusClass(status: AnaliseTecnicaRegistro["status"]) {
  if (status === "em_analise") return "bg-sky-50 text-sky-700 border-sky-200";
  if (status === "concluido") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function statusLabel(status: AnaliseTecnicaRegistro["status"]) {
  if (status === "em_analise") return "Em analise";
  if (status === "concluido") return "Concluido";
  return "Aguardando";
}

function formatDateTimeBR(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "-";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function AnaliseTecnicaContent() {
  const [fila, setFila] = useState<AnaliseTecnicaRegistro[]>([]);
  const [historico, setHistorico] = useState<AnaliseTecnicaRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [conclusaoPendente, setConclusaoPendente] = useState<AnaliseTecnicaRegistro | null>(null);
  const [laudoModal, setLaudoModal] = useState("");
  const [observacoesModal, setObservacoesModal] = useState("");
  const usuarioAtual = useMemo(() => getUserName(), []);

  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const filteredFila = useMemo(() => {
    if (!q) return fila;
    return fila.filter((item) =>
      item.id.toLowerCase().includes(q) ||
      item.produtoId.toLowerCase().includes(q) ||
      item.preAnaliseId.toLowerCase().includes(q) ||
      item.codigoNF.toLowerCase().includes(q) ||
      item.modeloRef.toLowerCase().includes(q)
    );
  }, [fila, q]);

  const filteredHistorico = useMemo(() => {
    if (!q) return historico;
    return historico.filter((item) =>
      item.id.toLowerCase().includes(q) ||
      item.produtoId.toLowerCase().includes(q) ||
      item.preAnaliseId.toLowerCase().includes(q) ||
      item.codigoNF.toLowerCase().includes(q) ||
      item.modeloRef.toLowerCase().includes(q)
    );
  }, [historico, q]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { AnaliseTecnicaService } = await import("@/backend/services/analiseTecnicaService");
        const [filaData, historicoData] = await Promise.all([
          AnaliseTecnicaService.getFila(),
          AnaliseTecnicaService.getHistorico(),
        ]);
        setFila(filaData);
        setHistorico(historicoData);
      } catch (error) {
        console.error("Error loading analise tecnica data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const iniciar = async (item: AnaliseTecnicaRegistro) => {
    try {
      setBusyId(item.id);
      const { AnaliseTecnicaService } = await import("@/backend/services/analiseTecnicaService");
      const updated = await AnaliseTecnicaService.iniciarAnalise(item.id, usuarioAtual);
      setFila((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch (error) {
      console.error("Error starting analise tecnica:", error);
    } finally {
      setBusyId(null);
    }
  };

  const abrirModalConclusao = (item: AnaliseTecnicaRegistro) => {
    setLaudoModal(item.laudoTecnico || "");
    setObservacoesModal(item.observacoes || "");
    setConclusaoPendente(item);
  };

  const fecharModalConclusao = () => {
    if (conclusaoPendente && busyId === conclusaoPendente.id) return;
    setConclusaoPendente(null);
    setLaudoModal("");
    setObservacoesModal("");
  };

  const confirmarConclusao = async () => {
    if (!conclusaoPendente) return;
    const item = conclusaoPendente;
    if (!laudoModal.trim()) return;
    try {
      setBusyId(item.id);
      const { AnaliseTecnicaService } = await import("@/backend/services/analiseTecnicaService");
      const updated = await AnaliseTecnicaService.finalizarAnalise({
        analiseTecnicaId: item.id,
        usuario: usuarioAtual,
        laudoTecnico: laudoModal,
        observacoes: observacoesModal,
      });
      setFila((prev) => prev.filter((row) => row.id !== updated.id));
      setHistorico((prev) => [updated, ...prev]);
      setConclusaoPendente(null);
      setLaudoModal("");
      setObservacoesModal("");
    } catch (error) {
      console.error("Error finishing analise tecnica:", error);
    } finally {
      setBusyId(null);
    }
  };

  const renderFilaActions = (item: AnaliseTecnicaRegistro, first: boolean, fullWidth = false) => {
    const className = `inline-flex items-center justify-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold ${fullWidth ? "w-full" : ""} ${first && busyId !== item.id ? "bg-slate-900 text-white hover:bg-slate-800" : "border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"}`;

    if (item.status === "aguardando") {
      return (
        <button
          type="button"
          onClick={() => iniciar(item)}
          disabled={!first || busyId === item.id}
          className={className}
        >
          <ClipboardCheck size={16} />
          {busyId === item.id ? "PROCESSANDO" : "INICIAR"}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => abrirModalConclusao(item)}
        disabled={!first || busyId === item.id}
        className={className}
      >
        <ClipboardCheck size={16} />
        CONCLUIR
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-2 border-slate-200 border-t-sky-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full min-w-0 px-4 md:px-6 py-4">
        <div className="mx-auto w-full max-w-[1400px] min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800">Analise Tecnica</h1>
              <p className="text-[12px] text-slate-600">Etapa vinculada a `pre_analise_id`, com persistencia real de `laudo_tecnico` e `observacoes`.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 px-3 h-9 rounded-xl border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-700"><AlertCircle size={16} />AGUARDANDO: {filteredFila.filter((item) => item.status === "aguardando").length}</div>
              <div className="inline-flex items-center gap-2 px-3 h-9 rounded-xl border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700"><Clock size={16} />EM ANALISE: {filteredFila.filter((item) => item.status === "em_analise").length}</div>
              <div className="inline-flex items-center gap-2 px-3 h-9 rounded-xl border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700"><History size={16} />HISTORICO: {filteredHistorico.length}</div>
              {q && <div className="inline-flex items-center gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white text-[11px] font-medium text-slate-600"><Search size={16} />{`FILTRO: ${q}`}</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4"><div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Fila Tecnica</div><div className="mt-1 text-2xl font-bold text-slate-800">{filteredFila.length}</div><div className="mt-1 text-[12px] text-slate-500">Itens aguardando avaliacao tecnica detalhada.</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4"><div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Proximo Item</div><div className="mt-1 text-sm font-semibold text-slate-800">{filteredFila[0]?.modeloRef || "-"}</div><div className="mt-1 text-[12px] text-slate-500">{filteredFila[0]?.codigoNF || "Nenhum item na fila."}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4"><div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Concluidos</div><div className="mt-1 text-2xl font-bold text-slate-800">{filteredHistorico.length}</div><div className="mt-1 text-[12px] text-slate-500">Registros finalizados pela analise tecnica.</div></div>
          </div>

          <section className={sectionCardClass}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="inline-flex items-center gap-2 text-[12px] font-semibold text-slate-800"><Wrench size={16} className="text-sky-500" />Fila de Analise</div><p className="mt-1 text-[11px] text-slate-500">Dados herdados da Pre-Analise visiveis e vinculados ao mesmo produto.</p></div>
            </div>
            <div className="space-y-3 md:hidden">
              {!filteredFila.length && (
                <div className="rounded-2xl border border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                  Nenhum item disponivel para analise tecnica.
                </div>
              )}
              {filteredFila.map((item, index) => {
                const first = filteredFila[0]?.id === item.id;
                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mt-1 text-[12px] font-semibold text-slate-800 break-words">{item.modeloRef || "-"}</div>
                        <div className="text-[10px] text-slate-500 break-all">{item.recebidoPor || "-"}</div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 h-7 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="min-w-0">
                        <div className="text-slate-400 uppercase tracking-wide">Codigo NF</div>
                        <div className="font-semibold text-slate-800 break-all">{item.codigoNF || "-"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-slate-400 uppercase tracking-wide">Status</div>
                        <div className="text-slate-700">{statusLabel(item.status)}</div>
                      </div>
                      <div className="min-w-0 col-span-2">
                        <div className="text-slate-400 uppercase tracking-wide">Resumo herdado</div>
                        <div className="text-slate-700">{resumoItens(item)}</div>
                      </div>
                    </div>
                    {!first && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
                        Somente o primeiro item da fila pode ser processado.
                      </div>
                    )}
                    {renderFilaActions(item, first, true)}
                  </div>
                );
              })}
            </div>
            <div className={`${panelClass} hidden md:block`}>
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[110px_minmax(0,240px)_minmax(0,1fr)_140px_130px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500 lg:grid-cols-[120px_minmax(0,280px)_minmax(0,1fr)_150px_140px]">
                  <div>Codigo NF</div>
                  <div>Modelo</div>
                  <div>Resumo Herdado</div>
                  <div>Status</div>
                  <div className="text-right">Acao</div>
                </div>

                {!filteredFila.length && (
                  <div className="px-4 py-4 text-center text-[11px] text-slate-400">
                    Nenhum item disponivel para analise tecnica.
                  </div>
                )}

                {filteredFila.map((item, index) => {
                  const first = filteredFila[0]?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[110px_minmax(0,240px)_minmax(0,1fr)_140px_130px] gap-4 px-4 py-4 items-center lg:grid-cols-[120px_minmax(0,280px)_minmax(0,1fr)_150px_140px] ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                    >
                      <div className="font-semibold text-slate-800 whitespace-nowrap">{item.codigoNF || "-"}</div>
                      <div className="min-w-0 text-slate-700">
                        <div className="font-semibold break-words">{item.modeloRef || "-"}</div>
                        <div className="text-[10px] text-slate-500 break-all">{item.recebidoPor || "-"}</div>
                      </div>
                      <div className="min-w-0 text-slate-600 leading-5">{resumoItens(item)}</div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 h-7 rounded-full text-[10px] font-semibold uppercase border ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                      </div>
                      <div className="flex justify-end">{renderFilaActions(item, first)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={sectionCardClass}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="inline-flex items-center gap-2 text-[12px] font-semibold text-slate-800"><CheckCircle2 size={16} className="text-emerald-500" />Historico Tecnico</div><p className="mt-1 text-[11px] text-slate-500">Itens concluidos com `laudo_tecnico`, `observacoes`, `status` e `updated_at`.</p></div>
            </div>
            <div className="space-y-3 md:hidden">
              {!filteredHistorico.length && (
                <div className="rounded-2xl border border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                  Nenhum historico tecnico disponivel.
                </div>
              )}
              {filteredHistorico.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mt-1 text-[12px] font-semibold text-slate-800 break-words">{item.modeloRef || "-"}</div>
                      <div className="text-[10px] text-slate-500">{formatDateTimeBR(item.updatedAt || item.dataEntrada || "")}</div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 h-7 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="min-w-0">
                      <div className="text-slate-400 uppercase tracking-wide">Codigo NF</div>
                      <div className="font-semibold text-slate-800 break-all">{item.codigoNF || "-"}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-slate-400 uppercase tracking-wide">Status</div>
                      <div className="text-slate-700">{statusLabel(item.status)}</div>
                    </div>
                    <div className="min-w-0 col-span-2">
                      <div className="text-slate-400 uppercase tracking-wide">Laudo</div>
                      <div className="text-slate-700 break-words">{item.laudoTecnico || "-"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className={`${panelClass} hidden md:block`}>
              <table className="w-full border-collapse text-[11px] min-w-[1080px]">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left w-44">Atualizado</th>
                    <th className="px-3 py-2 text-left w-28">Codigo NF</th>
                    <th className="px-3 py-2 text-left">Modelo</th>
                    <th className="px-3 py-2 text-left w-[360px]">Laudo</th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredHistorico.length && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-[11px] text-slate-400">Nenhum historico tecnico disponivel.</td></tr>
                  )}
                  {filteredHistorico.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-3 py-3 align-middle text-slate-700 whitespace-nowrap">{formatDateTimeBR(item.updatedAt || item.dataEntrada || "")}</td>
                      <td className="px-3 py-3 align-middle font-semibold text-slate-800 whitespace-nowrap">{item.codigoNF || "-"}</td>
                      <td className="px-3 py-3 align-middle text-slate-700">{item.modeloRef || "-"}</td>
                      <td className="px-3 py-3 align-middle text-slate-700">{item.laudoTecnico || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <ModalShell
        open={!!conclusaoPendente}
        title="Conclusao da Analise Tecnica"
        subtitle={conclusaoPendente ? `${conclusaoPendente.modeloRef || "-"} • ${conclusaoPendente.codigoNF || "-"}` : undefined}
        onClose={fecharModalConclusao}
        maxW="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-slate-700">Laudo tecnico</label>
            <textarea
              value={laudoModal}
              onChange={(e) => setLaudoModal(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-[12px] text-slate-700 outline-none focus:border-sky-300"
              placeholder="Informe o laudo tecnico."
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-slate-700">Observacoes</label>
            <textarea
              value={observacoesModal}
              onChange={(e) => setObservacoesModal(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-700 outline-none focus:border-sky-300"
              placeholder="Observacoes adicionais."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={confirmarConclusao}
              disabled={!conclusaoPendente || !laudoModal.trim() || (busyId === conclusaoPendente.id)}
              className="inline-flex items-center justify-center px-6 h-11 rounded-full bg-sky-300 text-[12px] font-semibold text-slate-900 hover:bg-sky-200 disabled:opacity-60"
            >
              OK
            </button>
            <button
              type="button"
              onClick={fecharModalConclusao}
              disabled={!conclusaoPendente || (busyId === conclusaoPendente.id)}
              className="inline-flex items-center justify-center px-6 h-11 rounded-full bg-cyan-800 text-[12px] font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}

export default function AnaliseTecnicaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="h-12 w-12 rounded-full border-2 border-slate-200 border-t-sky-600 animate-spin" /></div>}>
      <AnaliseTecnicaContent />
    </Suspense>
  );
}
