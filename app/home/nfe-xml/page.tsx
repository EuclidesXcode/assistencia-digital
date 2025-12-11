"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface Nota {
  chave: string;
  numero: string;
  emissao: string;
  itens: number;
  status: "PENDENTE" | "PARCIAL" | "DIVERGENTE" | "CONFERIDA";
}

export default function NFeXmlPage() {
  const [notas, setNotas] = useState<Nota[]>([
    { chave: 'ABCD1234EFGH5678', numero: '000123', emissao: '01/12/2025', itens: 3, status: 'PENDENTE' },
    { chave: 'XYZT9876UVWX5432', numero: '000124', emissao: '02/12/2025', itens: 2, status: 'PARCIAL' },
    { chave: 'MNOP4567QRST8901', numero: '000125', emissao: '03/12/2025', itens: 1, status: 'CONFERIDA' },
  ]);
  const [query, setQuery] = useState("");
  const [usuario] = useState("eduardo");

  const carregarMock = () => {
    const n: Nota = {
      chave: Math.random().toString(36).slice(2, 18).toUpperCase(),
      numero: String(100000 + notas.length + 1),
      emissao: "10/12/2025",
      itens: Math.floor(Math.random() * 5) + 1,
      status: ["PENDENTE", "PARCIAL", "DIVERGENTE", "CONFERIDA"][Math.floor(Math.random() * 4)] as Nota["status"]
    };
    setNotas((s) => [n, ...s]);
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

  const destinoCount = stats.pendentes; // demo: pendentes destinam à pré-análise

  return (
    <div className="space-y-6 min-w-0">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-slate-800">Recebimento de NF-e (XML)</h1>
          <p className="text-sm text-slate-500">Notas pendentes, conferência, OCR e pré-análise</p>
        </div>
        <div className="flex flex-col lg:flex-row lg:flex-nowrap items-stretch lg:items-center gap-2 w-full lg:w-auto">
          <button onClick={carregarMock} className="bg-blue-600 text-white px-3 py-2 rounded-md w-full lg:w-auto">CARREGAR XML(S)</button>
          <input placeholder="Buscar por chave, N.º NF, código ou descrição" value={query} onChange={(e) => setQuery(e.target.value)} className="border border-slate-200 rounded-full px-3 py-2 w-full lg:w-40 text-sm" />
          <div className="text-sm flex items-center gap-2 w-full lg:w-auto justify-end">
            <div className="hidden lg:flex items-center gap-3">
              <div>
                <div className="text-xs text-slate-400">USUÁRIO</div>
                <div className="border border-slate-200 rounded-full px-3 py-1 text-sm">{usuario}</div>
              </div>
            </div>
            <button className="bg-blue-600 text-white px-3 py-2 rounded-md w-full lg:w-auto">DESTINO: PRÉ-ANÁLISE ({destinoCount})</button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
          <div className="text-xs text-slate-400">TOTAL</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
          <div className="text-xs text-slate-400">PENDENTES</div>
          <div className="text-2xl font-bold">{stats.pendentes}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
          <div className="text-xs text-slate-400">PARCIAIS</div>
          <div className="text-2xl font-bold">{stats.parciais}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
          <div className="text-xs text-slate-400">DIVERGENTES</div>
          <div className="text-2xl font-bold">{stats.divergentes}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
          <div className="text-xs text-slate-400">CONFERIDAS</div>
          <div className="text-2xl font-bold">{stats.conferidas}</div>
        </div>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-4">
        {/* Mobile: stacked cards (prevent overflow when sidebar opens) */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-400">Nenhuma nota carregada.</div>
          ) : (
            filtered.map((n, i) => (
              <div key={n.chave} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border border-slate-100 rounded-lg p-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">CHAVE</div>
                    <div className="font-mono text-sm text-slate-700 truncate max-w-full">{n.chave}</div>
                    <div className="text-xs text-slate-500 mt-2">N.º NF</div>
                    <div className="text-sm text-slate-700">{n.numero}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">STATUS</div>
                    <div className="text-sm mt-1"><span className={`inline-block px-2 py-1 rounded-full text-xs ${n.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' : n.status === 'CONFERIDA' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{n.status}</span></div>
                    <div className="mt-2"><button className="text-blue-600 text-sm">Detalhes</button></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tablet+ / Desktop: table view (reduce columns on tablet to avoid overflow) */}
        <div className="hidden md:block overflow-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="text-slate-600 bg-slate-50">
                <th className="p-3 text-left">CHAVE</th>
                <th className="p-3 text-left">N.º NF</th>
                <th className="p-3 text-left hidden lg:table-cell">EMISSÃO</th>
                <th className="p-3 text-left hidden lg:table-cell">ITENS</th>
                <th className="p-3 text-left">STATUS</th>
                <th className="p-3 text-left">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma nota carregada.</td>
                </tr>
              ) : (
                filtered.map((n, i) => (
                  <tr key={n.chave} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="p-3 font-mono break-words max-w-[14rem] whitespace-normal">{n.chave}</td>
                    <td className="p-3">{n.numero}</td>
                    <td className="p-3 hidden lg:table-cell">{n.emissao}</td>
                    <td className="p-3 hidden lg:table-cell">{n.itens}</td>
                    <td className="p-3"><span className={`inline-block px-3 py-1 rounded-full text-xs ${n.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' : n.status === 'CONFERIDA' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{n.status}</span></td>
                    <td className="p-3"><button className="text-blue-600 text-sm">Detalhes</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>


    </div>
  );
}
