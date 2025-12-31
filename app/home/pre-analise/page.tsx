"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClipboardCheck, CheckCircle2, AlertCircle, Clock, Search, Filter, History, ChevronRight, Barcode, Calendar } from "lucide-react";
import { Button } from "@/components/Button";

interface Produto {
  id: string;
  data: string;
  recebidoPor: string;
  codigoNF: string;
  modeloRef: string;
  gtin: string;
  nfReceb: string;
}

export default function PreAnalisePage() {
  const [pendentes, setPendentes] = useState<Produto[]>([]);
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { PreAnaliseService } = await import('@/backend/services/preAnaliseService');
        const [pend, res] = await Promise.all([
          PreAnaliseService.getPendentes(),
          PreAnaliseService.getResultados()
        ]);
        setPendentes(pend);
        setResultados(res);
      } catch (error) {
        console.error('Error loading pré-análise data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const efetuar = async (index: number) => {
    const item = pendentes[index];
    try {
      const { PreAnaliseService } = await import('@/backend/services/preAnaliseService');
      await PreAnaliseService.efetuarPreAnalise(item.id);
      setPendentes((p) => p.filter((_, i) => i !== index));
      setResultados((r) => [item, ...r]);
    } catch (error) {
      console.error('Error processing pré-análise:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* --- Floating Header (Glassmorphism) --- */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 px-8 py-4 flex items-center justify-between shadow-sm transition-all duration-200">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Pré-Análise Técnica</h1>
          <p className="text-slate-500 font-medium text-sm">Triagem inicial e validação de produtos recebidos.</p>
        </div>
        <div className="flex gap-3">
          <div className="hidden md:flex items-center bg-slate-100 px-3 py-2 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20">
            <Search size={16} className="text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Buscar produto..."
              className="bg-transparent border-none focus:outline-none text-sm text-slate-700 w-48 placeholder:text-slate-400"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8 space-y-8">

        {/* --- Pending Items Card --- */}
        <section className="bg-white p-0 md:p-8 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />

          <div className="p-6 md:p-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-500" />
                Aguardando Aprovação
              </h3>
              <p className="text-sm text-slate-400">Produtos na fila de triagem (FIFO).</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-mono text-slate-500">
              <Filter size={14} />
              <span>PENDENTES: <strong className="text-slate-900">{pendentes.length}</strong></span>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-100 relative z-10">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4 border-b border-slate-200">Data Rec.</th>
                  <th className="p-4 border-b border-slate-200">Recebido Por</th>
                  <th className="p-4 border-b border-slate-200">ID Produto</th>
                  <th className="p-4 border-b border-slate-200">Nota Fiscal</th>
                  <th className="p-4 border-b border-slate-200">Modelo / Ref.</th>
                  <th className="p-4 border-b border-slate-200">Status</th>
                  <th className="p-4 border-b border-slate-200 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pendentes.map((p, i) => (
                  <tr key={p.id} className="group hover:bg-amber-50/30 transition-colors">
                    <td className="p-4 font-medium text-slate-700">{p.data}</td>
                    <td className="p-4 text-slate-500">{p.recebidoPor}</td>
                    <td className="p-4 font-mono text-slate-500">{p.id}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{p.nfReceb || '-'}</span>
                        <span className="text-[10px] text-slate-400">COD: {p.codigoNF}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{p.modeloRef}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Barcode size={10} /> {p.gtin}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-100">
                        Aguardando
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        onClick={() => efetuar(i)}
                        disabled={i !== 0}
                        size="sm"
                        className={`rounded-full px-4 text-xs font-bold shadow-md transition-all ${i === 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105' : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'}`}
                      >
                        {i === 0 ? 'Iniciar Análise' : 'Aguarde'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {pendentes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                      Nenhum produto pendente de pré-análise no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4 px-6 md:px-0">
            {pendentes.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                Nenhum produto pendente.
              </div>
            ) : (
              pendentes.map((p, i) => (
                <div key={p.id} className={`p-5 rounded-2xl border relative transition-all ${i === 0 ? 'bg-white border-amber-200 shadow-md ring-1 ring-amber-100' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                  {i === 0 && (
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm animate-bounce">
                      PRÓXIMO
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">{p.id}</span>
                      <h4 className="font-bold text-slate-900 mt-1">{p.modeloRef}</h4>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">Pendente</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-4">
                    <div className="flex items-center gap-1"><Calendar size={12} /> {p.data}</div>
                    <div className="flex items-center gap-1"><Barcode size={12} /> {p.codigoNF}</div>
                  </div>

                  <Button
                    onClick={() => efetuar(i)}
                    disabled={i !== 0}
                    className={`w-full rounded-xl py-3 font-bold text-xs ${i === 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-400'}`}
                  >
                    {i === 0 ? 'INICIAR ANÁLISE' : 'AGUARDANDO VEZ'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* --- History Card --- */}
        <section className="bg-white p-0 md:p-8 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="p-6 md:p-0 mb-6">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <History size={20} className="text-emerald-500" />
              Histórico Recente
            </h3>
            <p className="text-sm text-slate-400">Últimas pré-análises realizadas.</p>
          </div>

          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4 border-b border-slate-200">Data</th>
                  <th className="p-4 border-b border-slate-200">ID Produto</th>
                  <th className="p-4 border-b border-slate-200">Nota Fiscal</th>
                  <th className="p-4 border-b border-slate-200">Modelo</th>
                  <th className="p-4 border-b border-slate-200">Status</th>
                  <th className="p-4 border-b border-slate-200 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {resultados.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum histórico disponível.</td></tr>
                ) : (
                  resultados.map((r) => (
                    <tr key={r.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-600">{r.data}</td>
                      <td className="p-4 font-mono text-slate-500">{r.id}</td>
                      <td className="p-4 font-bold text-slate-700">{r.codigoNF}</td>
                      <td className="p-4 text-slate-600">{r.modeloRef}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Concluído
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => alert(`Ver detalhes do histórico ${r.id}`)} className="text-slate-400 hover:text-indigo-600">
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile History */}
          <div className="lg:hidden px-6 md:px-0 space-y-3 pb-6">
            {resultados.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div>
                  <div className="text-xs font-mono text-slate-400 mb-1">{r.data}</div>
                  <div className="font-bold text-slate-800 text-sm">{r.modeloRef}</div>
                </div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">OK</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
