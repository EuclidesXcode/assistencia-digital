"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Barcode, CheckCircle2, ClipboardCheck, Clock, History, Search } from "lucide-react";
import { PreAnaliseProduto } from "@/backend/models/PreAnalise";
import { ModalShell } from "@/app/home/produtos/components/UIComponents";

const sectionCardClass = "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4";
const panelClass = "rounded-2xl border border-slate-200 overflow-x-auto bg-white";

function getSnapshot(item: PreAnaliseProduto) {
  const respostas = item?.respostas && typeof item.respostas === "object" ? item.respostas : {};
  const snapshot = (respostas as Record<string, unknown>)?.snapshot;
  return snapshot && typeof snapshot === "object" ? (snapshot as Record<string, unknown>) : {};
}

function countList(item: PreAnaliseProduto, key: string) {
  const value = getSnapshot(item)[key];
  return Array.isArray(value) ? value.length : 0;
}

function resumoItens(item: PreAnaliseProduto) {
  return `EMB ${countList(item, "embalagem")} · ACE ${countList(item, "acessorios")} · EST ${countList(item, "estetica")} · FUN ${countList(item, "funcional")} · FLD ${countList(item, "funcionalidade")}`;
}

function statusClass(status: PreAnaliseProduto["status"]) {
  if (status === "em_analise") return "bg-sky-50 text-sky-700 border-sky-200";
  if (status === "aprovado") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "reprovado") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function statusLabel(status: PreAnaliseProduto["status"]) {
  if (status === "em_analise") return "Em analise";
  if (status === "aprovado") return "Aprovado";
  if (status === "reprovado") return "Reprovado";
  return "Pendente";
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

function PreAnaliseContent() {
  const [fila, setFila] = useState<PreAnaliseProduto[]>([]);
  const [historico, setHistorico] = useState<PreAnaliseProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [finalizacaoPendente, setFinalizacaoPendente] = useState<{
    item: PreAnaliseProduto;
    resultado: "aprovado" | "reprovado";
  } | null>(null);
  const [observacoesModal, setObservacoesModal] = useState("");
  const usuarioAtual = useMemo(() => getUserName(), []);

  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const filteredFila = useMemo(() => {
    if (!q) return fila;
    return fila.filter((item) =>
      item.id.toLowerCase().includes(q) ||
      item.produtoId.toLowerCase().includes(q) ||
      item.codigoNF.toLowerCase().includes(q) ||
      item.modeloRef.toLowerCase().includes(q) ||
      item.gtin.toLowerCase().includes(q)
    );
  }, [fila, q]);

  const filteredHistorico = useMemo(() => {
    if (!q) return historico;
    return historico.filter((item) =>
      item.id.toLowerCase().includes(q) ||
      item.produtoId.toLowerCase().includes(q) ||
      item.codigoNF.toLowerCase().includes(q) ||
      item.modeloRef.toLowerCase().includes(q) ||
      item.gtin.toLowerCase().includes(q)
    );
  }, [historico, q]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { PreAnaliseService } = await import("@/backend/services/preAnaliseService");
        const [pendentes, resultados] = await Promise.all([
          PreAnaliseService.getPendentes(),
          PreAnaliseService.getResultados(),
        ]);
        setFila(pendentes);
        setHistorico(resultados);
      } catch (error) {
        console.error("Error loading pre-analise data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const iniciar = async (item: PreAnaliseProduto) => {
    try {
      setBusyId(item.id);
      const { PreAnaliseService } = await import("@/backend/services/preAnaliseService");
      const updated = await PreAnaliseService.iniciarPreAnalise(item.id, usuarioAtual);
      setFila((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch (error) {
      console.error("Error starting pre-analise:", error);
    } finally {
      setBusyId(null);
    }
  };

  const abrirModalFinalizacao = (item: PreAnaliseProduto, resultado: "aprovado" | "reprovado") => {
    const respostas = item?.respostas && typeof item.respostas === "object" ? item.respostas : {};
    const workflow = (respostas as Record<string, unknown>)?.workflow;
    const observacoesAtuais =
      workflow && typeof workflow === "object" ? String((workflow as Record<string, unknown>)?.observacoes || "") : "";
    setObservacoesModal(observacoesAtuais);
    setFinalizacaoPendente({ item, resultado });
  };

  const fecharModalFinalizacao = () => {
    if (finalizacaoPendente && busyId === finalizacaoPendente.item.id) return;
    setFinalizacaoPendente(null);
    setObservacoesModal("");
  };

  const confirmarFinalizacao = async () => {
    if (!finalizacaoPendente) return;
    const { item, resultado } = finalizacaoPendente;
    try {
      setBusyId(item.id);
      const { PreAnaliseService } = await import("@/backend/services/preAnaliseService");
      const updated = await PreAnaliseService.finalizarPreAnalise({
        preAnaliseId: item.id,
        usuario: usuarioAtual,
        resultado,
        respostasAdicionais: { workflow: { observacoes: observacoesModal } },
      });
      setFila((prev) => prev.filter((row) => row.id !== updated.id));
      setHistorico((prev) => [updated, ...prev]);
      setFinalizacaoPendente(null);
      setObservacoesModal("");
    } catch (error) {
      console.error("Error finishing pre-analise:", error);
    } finally {
      setBusyId(null);
    }
  };

  const renderFilaActions = (item: PreAnaliseProduto, first: boolean, fullWidth = false) => {
    if (item.status === "pendente") {
      return (
        <button
          type="button"
          onClick={() => iniciar(item)}
          disabled={!first || busyId === item.id}
          className={`inline-flex items-center justify-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold ${fullWidth ? "w-full" : ""} ${first && busyId !== item.id ? "bg-slate-900 text-white hover:bg-slate-800" : "border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"}`}
        >
          <ClipboardCheck size={16} />
          {busyId === item.id ? "PROCESSANDO" : "INICIAR"}
        </button>
      );
    }

    return (
      <div className={`${fullWidth ? "flex w-full" : "inline-flex"} gap-2`}>
        <button
          type="button"
          onClick={() => abrirModalFinalizacao(item, "reprovado")}
          disabled={!first || busyId === item.id}
          className={`inline-flex items-center justify-center px-3 h-9 rounded-xl text-[11px] font-semibold ${fullWidth ? "flex-1" : ""} ${first && busyId !== item.id ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"}`}
        >
          REPROVAR
        </button>
        <button
          type="button"
          onClick={() => abrirModalFinalizacao(item, "aprovado")}
          disabled={!first || busyId === item.id}
          className={`inline-flex items-center justify-center px-3 h-9 rounded-xl text-[11px] font-semibold ${fullWidth ? "flex-1" : ""} ${first && busyId !== item.id ? "bg-slate-900 text-white hover:bg-slate-800" : "border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"}`}
        >
          APROVAR
        </button>
      </div>
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
              <h1 className="text-lg font-bold text-slate-800">Pre-Analise Tecnica</h1>
              <p className="text-[12px] text-slate-600">Fluxo real persistido em banco, vinculado ao produto e encaminhando a Analise Tecnica.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 px-3 h-9 rounded-xl border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-700"><AlertCircle size={16} />PENDENTES: {filteredFila.filter((item) => item.status === "pendente").length}</div>
              <div className="inline-flex items-center gap-2 px-3 h-9 rounded-xl border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700"><Clock size={16} />EM ANALISE: {filteredFila.filter((item) => item.status === "em_analise").length}</div>
              <div className="inline-flex items-center gap-2 px-3 h-9 rounded-xl border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700"><History size={16} />HISTORICO: {filteredHistorico.length}</div>
              {q && <div className="inline-flex items-center gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white text-[11px] font-medium text-slate-600"><Search size={16} />{`FILTRO: ${q}`}</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4"><div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Fila Atual</div><div className="mt-1 text-2xl font-bold text-slate-800">{filteredFila.length}</div><div className="mt-1 text-[12px] text-slate-500">Itens aguardando acao desta etapa.</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4"><div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Proximo da Fila</div><div className="mt-1 text-sm font-semibold text-slate-800">{filteredFila[0]?.modeloRef || "-"}</div><div className="mt-1 text-[12px] text-slate-500">{filteredFila[0]?.codigoNF || "Nenhum item pendente."}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4"><div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Concluidos</div><div className="mt-1 text-2xl font-bold text-slate-800">{filteredHistorico.length}</div><div className="mt-1 text-[12px] text-slate-500">Registros aprovados ou reprovados.</div></div>
          </div>

          <section className={sectionCardClass}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="inline-flex items-center gap-2 text-[12px] font-semibold text-slate-800"><AlertCircle size={16} className="text-amber-500" />Fila de Pre-Analise</div><p className="mt-1 text-[11px] text-slate-500">Cadastro alimentando a etapa com `produto_id` e snapshot dos itens.</p></div>
            </div>
            <div className="space-y-3 md:hidden">
              {!filteredFila.length && (
                <div className="rounded-2xl border border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                  Nenhum item pendente de pre-analise.
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
                        <div className="text-slate-400 uppercase tracking-wide">GTIN</div>
                        <div className="inline-flex items-center gap-1 text-slate-600 font-mono break-all"><Barcode size={12} />{item.gtin || "-"}</div>
                      </div>
                      <div className="min-w-0 col-span-2">
                        <div className="text-slate-400 uppercase tracking-wide">Resumo</div>
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
              <table className="w-full border-collapse text-[11px] min-w-[1080px]">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left w-28">Codigo NF</th>
                    <th className="px-3 py-2 text-left w-[320px]">Modelo</th>
                    <th className="px-3 py-2 text-left w-36">GTIN</th>
                    <th className="px-3 py-2 text-left">Resumo</th>
                    <th className="px-3 py-2 text-left w-40">Status</th>
                    <th className="px-3 py-2 text-right w-40">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredFila.length && (
                    <tr><td colSpan={6} className="px-3 py-4 text-center text-[11px] text-slate-400">Nenhum item pendente de pre-analise.</td></tr>
                  )}
                  {filteredFila.map((item, index) => {
                    const first = filteredFila[0]?.id === item.id;
                    return (
                      <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-3 py-3 align-middle font-semibold text-slate-800 whitespace-nowrap">{item.codigoNF || "-"}</td>
                        <td className="px-3 py-3 align-middle text-slate-700">
                          <div className="font-semibold">{item.modeloRef || "-"}</div>
                          <div className="text-[10px] text-slate-500">{item.recebidoPor || "-"}</div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono whitespace-nowrap"><Barcode size={12} />{item.gtin || "-"}</div>
                        </td>
                        <td className="px-3 py-3 align-middle text-slate-600">{resumoItens(item)}</td>
                        <td className="px-3 py-3 align-middle"><span className={`inline-flex items-center px-2.5 h-7 rounded-full text-[10px] font-semibold uppercase border ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td>
                        <td className="px-3 py-3 align-middle text-right">{renderFilaActions(item, first)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className={sectionCardClass}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="inline-flex items-center gap-2 text-[12px] font-semibold text-slate-800"><CheckCircle2 size={16} className="text-emerald-500" />Historico Recente</div><p className="mt-1 text-[11px] text-slate-500">Itens finalizados com persistencia de `status`, `analisado_por`, `data_analise` e `respostas`.</p></div>
            </div>
            <div className="space-y-3 md:hidden">
              {!filteredHistorico.length && (
                <div className="rounded-2xl border border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                  Nenhum historico disponivel.
                </div>
              )}
              {filteredHistorico.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mt-1 text-[12px] font-semibold text-slate-800 break-words">{item.modeloRef || "-"}</div>
                      <div className="text-[10px] text-slate-500">{formatDateTimeBR(item.updatedAt || item.data || "")}</div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 h-7 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="min-w-0">
                      <div className="text-slate-400 uppercase tracking-wide">Codigo NF</div>
                      <div className="font-semibold text-slate-800 break-all">{item.codigoNF || "-"}</div>
                    </div>
                    <div className="min-w-0 col-span-2">
                      <div className="text-slate-400 uppercase tracking-wide">Analisado por</div>
                      <div className="text-slate-700 break-all">{item.analisadoPor || "-"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className={`${panelClass} hidden md:block`}>
              <table className="w-full border-collapse text-[11px] min-w-[920px]">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left w-44">Atualizado</th>
                    <th className="px-3 py-2 text-left w-28">Codigo NF</th>
                    <th className="px-3 py-2 text-left">Modelo</th>
                    <th className="px-3 py-2 text-left w-40">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredHistorico.length && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-[11px] text-slate-400">Nenhum historico disponivel.</td></tr>
                  )}
                  {filteredHistorico.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-3 py-3 align-middle text-slate-700 whitespace-nowrap">{formatDateTimeBR(item.updatedAt || item.data || "")}</td>
                      <td className="px-3 py-3 align-middle font-semibold text-slate-800 whitespace-nowrap">{item.codigoNF || "-"}</td>
                      <td className="px-3 py-3 align-middle text-slate-700">{item.modeloRef || "-"}</td>
                      <td className="px-3 py-3 align-middle"><span className={`inline-flex items-center px-2.5 h-7 rounded-full text-[10px] font-semibold uppercase border ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <ModalShell
        open={!!finalizacaoPendente}
        title="Observacoes da Pre-Analise"
        subtitle={finalizacaoPendente ? `${finalizacaoPendente.item.modeloRef || "-"} • ${finalizacaoPendente.resultado.toUpperCase()}` : undefined}
        onClose={fecharModalFinalizacao}
        maxW="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-slate-700">Observacoes</label>
            <textarea
              value={observacoesModal}
              onChange={(e) => setObservacoesModal(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-[12px] text-slate-700 outline-none focus:border-sky-300"
              placeholder="Descreva o resultado da Pre-Analise."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={confirmarFinalizacao}
              disabled={!finalizacaoPendente || (busyId === finalizacaoPendente.item.id)}
              className="inline-flex items-center justify-center px-6 h-11 rounded-full bg-sky-300 text-[12px] font-semibold text-slate-900 hover:bg-sky-200 disabled:opacity-60"
            >
              OK
            </button>
            <button
              type="button"
              onClick={fecharModalFinalizacao}
              disabled={!finalizacaoPendente || (busyId === finalizacaoPendente.item.id)}
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

export default function PreAnalisePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="h-12 w-12 rounded-full border-2 border-slate-200 border-t-sky-600 animate-spin" /></div>}>
      <PreAnaliseContent />
    </Suspense>
  );
}
