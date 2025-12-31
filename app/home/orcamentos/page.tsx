"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { DollarSign, Printer, Filter, ChevronRight, Calculator, FileText, CheckCircle2, User, Calendar, Barcode, Search } from "lucide-react";
import { Button } from "@/components/Button";

interface Registro {
  id: string;
  data: string;
  analisadoPor: string;
  codigoNF: string;
  modeloFabricante: string;
  ean: string;
  nf: string;
}

export default function OrcamentosPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadRegistros = async () => {
      try {
        const { OrcamentoService } = await import('@/backend/services/orcamentoService');
        const data = await OrcamentoService.getRegistros();
        setRegistros(data);
      } catch (error) {
        console.error('Error loading orçamentos:', error);
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

  const abrirPecasPendentes = () => {
    alert(`${registros.length} peças pendentes de orçamento`);
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
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Gestão de Orçamentos</h1>
          <p className="text-slate-500 font-medium text-sm">Elaboração, aprovação e envio de propostas.</p>
        </div>
        <div className="flex gap-3">
          <div className="hidden md:flex items-center bg-slate-100 px-3 py-2 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20">
            <Search size={16} className="text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Buscar orçamento..."
              className="bg-transparent border-none focus:outline-none text-sm text-slate-700 w-48 placeholder:text-slate-400"
            />
          </div>
          <Button onClick={() => alert("Abrir modal de Novo Orçamento")} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-full px-6 font-semibold transition-all hover:scale-105 active:scale-95">
            <Calculator size={18} className="mr-2" /> Novo Orçamento
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8 space-y-8">

        {/* --- Main Data Card --- */}
        <section className="bg-white p-0 md:p-8 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-24 -mt-24 pointer-events-none" />

          <div className="p-6 md:p-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                Peças Aguardando Orçamento
              </h3>
              <p className="text-sm text-slate-400">Produtos analisados tecnicamente, pendentes de valor.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-mono text-slate-500">
                <Filter size={14} />
                <span>TOTAL: <strong className="text-slate-900">{registros.length}</strong></span>
              </div>
              <Button variant="outline" onClick={abrirPecasPendentes} className="rounded-full border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                Pendentes ({registros.length})
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="rounded-full border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                <Printer size={16} className="mr-2" /> Imprimir
              </Button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-100 relative z-10">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-12 border-b border-slate-200">
                    <input type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const map: Record<string, boolean> = {};
                        registros.forEach(r => map[r.id] = checked);
                        setSelected(map);
                      }} checked={allSelectedCount === registros.length && registros.length > 0}
                    />
                  </th>
                  <th className="p-4 border-b border-slate-200">Data Análise</th>
                  <th className="p-4 border-b border-slate-200">Analista</th>
                  <th className="p-4 border-b border-slate-200">ID Produto</th>
                  <th className="p-4 border-b border-slate-200">Nota Fiscal</th>
                  <th className="p-4 border-b border-slate-200">Modelo / EAN</th>
                  <th className="p-4 border-b border-slate-200">Status</th>
                  <th className="p-4 border-b border-slate-200 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {registros.map((r) => (
                  <tr key={r.id} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="p-4">
                      <input type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
                        <span className="font-medium text-slate-800">{r.modeloFabricante}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Barcode size={10} /> {r.ean}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-yellow-50 text-yellow-600 border border-yellow-100">
                        Pendente
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => alert(`Detalhes do orçamento ${r.id}`)} className="text-slate-400 hover:text-blue-600 transition-colors">
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
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
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
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                    checked={!!selected[r.id]} onChange={() => toggle(r.id)}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-100 text-yellow-700 border border-yellow-200 mb-2">
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
                        <User size={12} className="text-blue-500" />
                        <span className="font-medium text-slate-700 truncate">{r.analisadoPor}</span>
                      </div>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10} /> {r.data}</span>
                      <span className="text-xs font-mono text-slate-500 flex items-center gap-1"><Barcode size={10} /> {r.ean}</span>
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
