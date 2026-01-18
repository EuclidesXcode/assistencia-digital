"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Upload, CheckCircle2, AlertTriangle, Clock, Search, Filter, ChevronRight, FileCode, Check, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/Button";

interface Nota {
  chave: string;
  numero: string;
  emissao: string;
  itens: number;
  status: "PENDENTE" | "PARCIAL" | "DIVERGENTE" | "CONFERIDA";
}

export default function NFeXmlPage() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [usuario, setUsuario] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUsuario(user.full_name || user.email?.split('@')[0] || "Usuário");
    }
  }, []);

  useEffect(() => {
    const loadNotas = async () => {
      try {
        const { NfeService } = await import('@/backend/services/nfeService');
        const data = await NfeService.getNotas();
        setNotas(data);
      } catch (error) {
        console.error('Error loading notas:', error);
      } finally {
        setLoading(false);
      }
    };
    loadNotas();
  }, []);

  const carregarMock = async (file?: File) => {
    try {
      const { NfeService } = await import('@/backend/services/nfeService');
      // @ts-ignore
      const newNota = await NfeService.carregarXml(file);
      setNotas((s) => [newNota, ...s]);
    } catch (error: any) {
      console.error('Error loading XML:', error);
      alert(error.message || 'Erro ao carregar XML');
    }
  };

  const filtered = useMemo(() => {
    if (!query) return notas;
    return notas.filter(n => n.chave.includes(query) || n.numero.includes(query));
  }, [notas, query]);

  const stats = useMemo(() => ({
    total: notas.length,
    pendentes: notas.filter(n => n.status === "PENDENTE").length,
    parciais: notas.filter(n => n.status === "PARCIAL").length,
    divergentes: notas.filter(n => n.status === "DIVERGENTE").length,
    conferidas: notas.filter(n => n.status === "CONFERIDA").length,
  }), [notas]);

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
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Processamento de NF-e</h1>
          <p className="text-slate-500 font-medium text-sm">Importação, validação e conferência de notas fiscais.</p>
        </div>
        <div className="flex gap-3">
          <div className="hidden md:flex items-center bg-slate-100 px-3 py-2 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20">
            <Search size={16} className="text-slate-400 mr-2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar chave ou Nº..."
              className="bg-transparent border-none focus:outline-none text-sm text-slate-700 w-48 placeholder:text-slate-400"
            />
          </div>
          <Button onClick={() => document.getElementById('xmlInput')?.click()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-full px-6 font-semibold transition-all hover:scale-105 active:scale-95">
            <Upload size={18} className="mr-2" /> Carregar XML
          </Button>
          <input
            type="file"
            id="xmlInput"
            multiple
            accept=".xml"
            className="hidden"
            onChange={async (e) => {
              if (e.target.files) {
                const files = Array.from(e.target.files);
                for (const file of files) {
                  await carregarMock(file);
                }
              }
            }}
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8 space-y-8">

        {/* --- Stats Grid --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Total</span>
            <span className="text-3xl font-black text-slate-800">{stats.total}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-full -mr-8 -mt-8" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Pendentes</span>
            <span className="text-3xl font-black text-amber-500">{stats.pendentes}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-full -mr-8 -mt-8" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">Divergentes</span>
            <span className="text-3xl font-black text-red-500">{stats.divergentes}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -mr-8 -mt-8" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Conferidas</span>
            <span className="text-3xl font-black text-emerald-500">{stats.conferidas}</span>
          </div>
        </div>

        {/* --- Main Content Card --- */}
        <section className="bg-white p-0 md:p-8 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="p-6 md:p-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FileCode size={20} className="text-indigo-500" />
                Notas Fiscais Importadas
              </h3>
              <p className="text-sm text-slate-400">Gerencie o fluxo de entrada de documentos fiscais.</p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => alert("Abrir filtros avançados")} variant="outline" className="rounded-full border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 text-xs">
                <Filter size={14} className="mr-2" /> Filtros
              </Button>
              <Button onClick={() => alert(" Enviando notas selecionadas para Pré-Análise...")} className="bg-slate-900 text-white rounded-full px-4 text-xs font-bold shadow-md hover:bg-slate-800">
                <ArrowRight size={14} className="mr-2" /> Enviar para Pré-Análise
              </Button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4 border-b border-slate-200">Chave de Acesso</th>
                  <th className="p-4 border-b border-slate-200">Número</th>
                  <th className="p-4 border-b border-slate-200">Emissão</th>
                  <th className="p-4 border-b border-slate-200">Qtd. Itens</th>
                  <th className="p-4 border-b border-slate-200">Status</th>
                  <th className="p-4 border-b border-slate-200 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((n) => (
                  <tr key={n.chave} className="group hover:bg-indigo-50/30 transition-colors">
                    <td className="p-4 font-mono text-slate-500 max-w-[200px] truncate" title={n.chave}>{n.chave}</td>
                    <td className="p-4 font-bold text-slate-700">{n.numero}</td>
                    <td className="p-4 text-slate-600">{n.emissao}</td>
                    <td className="p-4 text-slate-600">{n.itens}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${n.status === 'PENDENTE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        n.status === 'CONFERIDA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          n.status === 'DIVERGENTE' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        {n.status}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button onClick={() => alert(`Visualizar nota ${n.numero}`)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                        <FileText size={16} />
                      </button>
                      <button onClick={() => alert(`Excluir nota ${n.numero}`)} className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 italic">
                      Nenhuma nota fiscal encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4 px-6 md:px-0">
            {filtered.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                Nenhuma nota encontrada.
              </div>
            ) : (
              filtered.map((n) => (
                <div key={n.chave} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 block mb-1 truncate w-48">{n.chave}</span>
                      <h4 className="font-bold text-slate-900 flex items-center gap-2"><FileText size={16} className="text-indigo-500" /> NF-e {n.numero}</h4>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${n.status === 'PENDENTE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      n.status === 'CONFERIDA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                      {n.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-4 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1"><Clock size={12} /> Emissão: {n.emissao}</div>
                    <div className="flex items-center gap-1"><CheckCircle2 size={12} /> Itens: {n.itens}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
