"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Check, Truck, Box, FileText, Package, Search, Printer, Filter, ChevronRight, Inbox, Clock, User, Barcode } from "lucide-react";
import { Button } from "@/components/Button"; // Assuming Button component exists as in Cadastro

interface Registro {
  id: string;
  data: string;
  analisadoPor: string;
  codigoNF: string;
  modeloFabricante: string;
  ean: string;
  nf: string;
}

export default function RecebimentoPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadRegistros = async () => {
      try {
        const { RecebimentoService } = await import('@/backend/services/recebimentoService');
        const data = await RecebimentoService.getRegistros();
        setRegistros(data);
      } catch (error) {
        console.error('Error loading recebimentos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRegistros();
  }, []);

  const toggle = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const allSelectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const efetuarRecebimento = () => {
    alert('Fluxo de recebimento iniciado (demo)');
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
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Recebimento de Produto</h1>
          <p className="text-slate-500 font-medium text-sm">Gestão de Check-in, Vistoria e Entrada de NFs.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={efetuarRecebimento} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-full px-6 font-semibold transition-all hover:scale-105 active:scale-95">
            <Inbox size={18} className="mr-2" /> Efetuar Recebimento
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8 space-y-8">

        {/* --- Workflow Status Card --- */}
        <section className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex-1">
              <h2 className="font-bold text-xl text-slate-900 mb-2">Fluxo de Entrada</h2>
              <p className="text-slate-500 text-sm max-w-2xl">
                Acompanhe as 4 etapas essenciais do processo de recebimento: LPN, Vistoria Revenda, SAT e Recebimento Físico.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {['LPN', 'Vistoria', 'SAT', 'Recebimento'].map((step, i) => (
                  <div key={step} className="flex items-center">
                    <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${i === 3 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${i === 3 ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>
                      {step}
                    </span>
                    {i < 3 && <div className="w-8 h-px bg-slate-200 mx-2 hidden sm:block" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:block opacity-10">
              <Truck size={120} className="text-indigo-900" />
            </div>
          </div>
        </section>

        {/* --- Data Table Section --- */}
        <section className="bg-white p-0 md:p-8 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="p-6 md:p-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Clock size={20} className="text-indigo-500" />
                Aguardando Orçamento
              </h3>
              <p className="text-sm text-slate-400">Produtos analisados, pendentes de elaboração.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-mono text-slate-500">
                <Filter size={14} />
                <span>TOTAL: <strong className="text-slate-900">{registros.length}</strong></span>
              </div>
              <Button variant="outline" onClick={() => window.print()} className="rounded-full border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">
                <Printer size={16} className="mr-2" /> Imprimir
              </Button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-12 border-b border-slate-200">
                    <input type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const map: Record<string, boolean> = {};
                        registros.forEach(r => map[r.id] = checked);
                        setSelected(map);
                      }} checked={allSelectedCount === registros.length && registros.length > 0}
                    />
                  </th>
                  <th className="p-4 border-b border-slate-200">Data Receb.</th>
                  <th className="p-4 border-b border-slate-200">Analisado Por</th>
                  <th className="p-4 border-b border-slate-200">ID Produto</th>
                  <th className="p-4 border-b border-slate-200">Nota Fiscal</th>
                  <th className="p-4 border-b border-slate-200">Modelo / EAN</th>
                  <th className="p-4 border-b border-slate-200">Status</th>
                  <th className="p-4 border-b border-slate-200 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {registros.map((r) => (
                  <tr key={r.id} className="group hover:bg-indigo-50/30 transition-colors">
                    <td className="p-4">
                      <input type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={!!selected[r.id]} onChange={() => toggle(r.id)}
                      />
                    </td>
                    <td className="p-4 font-medium text-slate-700">{r.data}</td>
                    <td className="p-4 text-slate-500 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {r.analisadoPor.charAt(0)}
                      </div>
                      {r.analisadoPor}
                    </td>
                    <td className="p-4 font-mono text-slate-500">{r.id}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{r.nf}</span>
                        <span className="text-[10px] text-slate-400">COD: {r.codigoNF}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-indigo-600">{r.modeloFabricante}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Barcode size={10} /> {r.ean}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-100">
                        Pendente
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => alert(`Detalhes do recebimento ${r.id}`)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4 px-6 md:px-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <input type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const map: Record<string, boolean> = {};
                    registros.forEach(r => map[r.id] = checked);
                    setSelected(map);
                  }} checked={allSelectedCount === registros.length && registros.length > 0}
                />
                <span className="text-sm font-medium text-slate-600">Selecionar Todos</span>
              </div>
            </div>

            {registros.map((r) => (
              <div key={r.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative group active:scale-[0.98] transition-all">
                <div className="absolute top-4 right-4">
                  <input type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                    checked={!!selected[r.id]} onChange={() => toggle(r.id)}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200 mb-2">
                      Pendente
                    </span>
                    <h4 className="font-bold text-slate-900 text-lg leading-tight mb-1">{r.modeloFabricante}</h4>
                    <span className="text-xs text-slate-500 font-mono bg-white px-1 rounded border border-slate-100">ID: {r.id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm bg-white p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Nota Fiscal</span>
                      <span className="font-semibold text-slate-700">{r.nf}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Analista</span>
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-indigo-500" />
                        <span className="font-medium text-slate-700 truncate">{r.analisadoPor}</span>
                      </div>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-xs text-slate-400">{r.data}</span>
                      <span className="text-xs font-mono text-slate-500">{r.ean}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </section>

      </div>
    </div>
  );
}
