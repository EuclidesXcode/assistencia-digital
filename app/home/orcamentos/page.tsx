"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";

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
  const [marcaFilter, setMarcaFilter] = useState<string>("TODAS");

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

  const imprimir = () => {
    window.print();
  };

  const abrirPecasPendentes = () => {
    alert(`${registros.length} peças pendentes de orçamento`);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <section className="bg-white rounded-lg border border-slate-200 p-4">
        <header className="flex flex-col gap-4 mb-4">
          <div className="min-w-0">
            <h3 className="text-sm text-slate-600">PRODUTOS AGUARDANDO ELABORAÇÃO DE ORÇAMENTO</h3>
            <p className="text-xs text-slate-600">Produtos analisados, pendentes de elaboração de orçamento.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="text-sm text-slate-600">TOTAL <strong className="text-slate-800">{registros.length}</strong> REGISTROS</div>
              <div className="text-sm text-slate-600">FILTRO <strong className="text-slate-800">{registros.length}</strong> VISÍVEIS</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={abrirPecasPendentes} className="bg-white border border-primary-600 text-primary-600 px-3 py-1.5 rounded-full text-sm hover:bg-primary-50 transition-colors">PEÇAS PENDENTES DE ORÇAMENTO ({registros.length})</button>
              <button onClick={imprimir} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-sm hover:bg-slate-200 transition-colors">IMPRIMIR</button>
            </div>
          </div>
        </header>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-600 bg-slate-50">
                <th className="p-3 w-12"><input type="checkbox" onChange={(e) => {
                  const checked = e.target.checked;
                  const map: Record<string, boolean> = {};
                  registros.forEach(r => map[r.id] = checked);
                  setSelected(map);
                }} checked={allSelectedCount === registros.length && registros.length > 0} /></th>
                <th className="p-3 text-left">DATA ANÁLISE</th>
                <th className="p-3 text-left">ANALISADO POR</th>
                <th className="p-3 text-left">ID PRODUTO</th>
                <th className="p-3 text-left">CÓDIGO NF</th>
                <th className="p-3 text-left">MODELO FABRICANTE</th>
                <th className="p-3 text-left">EAN / GTIN</th>
                <th className="p-3 text-left">NF</th>
                <th className="p-3 text-left">INFORMATIVO</th>
                <th className="p-3 text-left">VALOR TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r, idx) => (
                <tr key={r.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-primary-50 transition-colors`}>
                  <td className="p-3"><input type="checkbox" checked={!!selected[r.id]} onChange={() => toggle(r.id)} /></td>
                  <td className="p-3 text-slate-700">{r.data}</td>
                  <td className="p-3 text-slate-700">{r.analisadoPor}</td>
                  <td className="p-3 font-mono text-slate-700">{r.id}</td>
                  <td className="p-3 text-slate-700">{r.codigoNF}</td>
                  <td className="p-3 text-slate-700">{r.modeloFabricante}</td>
                  <td className="p-3 text-slate-700">{r.ean}</td>
                  <td className="p-3 text-slate-700">{r.nf}</td>
                  <td className="p-3"><span className="inline-block bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs font-medium">PENDENTE</span></td>
                  <td className="p-3 text-slate-700">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              className="w-5 h-5"
              onChange={(e) => {
                const checked = e.target.checked;
                const map: Record<string, boolean> = {};
                registros.forEach(r => map[r.id] = checked);
                setSelected(map);
              }}
              checked={allSelectedCount === registros.length && registros.length > 0}
            />
            <span className="text-sm font-medium text-slate-700">Selecionar Todos</span>
          </div>

          {/* Cards */}
          {registros.map((r, idx) => (
            <div key={r.id} className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5 flex-shrink-0"
                  checked={!!selected[r.id]}
                  onChange={() => toggle(r.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-sm font-semibold" style={{ color: '#6b7280' }}>{r.id}</span>
                    <span className="inline-block bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0">PENDENTE</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-600 text-xs block mb-1">DATA ANÁLISE</span>
                      <span className="font-medium" style={{ color: '#6b7280' }}>{r.data}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 text-xs block mb-1">ANALISADO POR</span>
                      <span className="font-medium" style={{ color: '#6b7280' }}>{r.analisadoPor}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 text-xs block mb-1">CÓDIGO NF</span>
                      <span className="font-medium" style={{ color: '#6b7280' }}>{r.codigoNF}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 text-xs block mb-1">NF</span>
                      <span className="font-medium" style={{ color: '#6b7280' }}>{r.nf}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-slate-600 text-xs block mb-1">MODELO FABRICANTE</span>
                    <span className="font-medium text-sm break-words" style={{ color: '#6b7280' }}>{r.modeloFabricante}</span>
                  </div>

                  <div className="mt-3">
                    <span className="text-slate-600 text-xs block mb-1">EAN / GTIN</span>
                    <span className="font-medium text-sm font-mono" style={{ color: '#6b7280' }}>{r.ean}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
