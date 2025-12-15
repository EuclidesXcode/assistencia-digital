"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800">PRODUTOS AGUARDANDO PRÉ-ANÁLISE <span className="text-sm text-slate-600">(SOMENTE O MAIS ANTIGO HABILITADO)</span></h2>

        {/* Mobile+Tablet: stacked cards (show until lg) */}
        <div className="lg:hidden mt-4 space-y-3">
          {pendentes.length === 0 ? (
            <div className="p-4 text-center text-slate-600">Nenhum produto aguardando pré-análise.</div>
          ) : (
            pendentes.map((p, i) => (
              <div key={p.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border border-slate-100 rounded-lg p-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-600">ID PRODUTO</div>
                    <div className="font-mono text-sm truncate" style={{ color: '#6b7280' }}>{p.id}</div>
                    <div className="text-xs text-slate-600 mt-2">MODELO</div>
                    <div className="text-sm truncate" style={{ color: '#6b7280' }}>{p.modeloRef}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-600">DATA</div>
                    <div className="text-sm" style={{ color: '#6b7280' }}>{p.data}</div>
                    <div className="mt-2">
                      <button onClick={() => efetuar(i)} className={`px-3 py-1 rounded-md text-sm ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>EFETUAR</button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-600">RECEBIDO POR • {p.recebidoPor}</div>
              </div>
            ))
          )}
        </div>

        {/* Desktop (lg)+ : table view with some columns hidden until lg */}
        <div className="hidden lg:block mt-4 overflow-auto">
          <table className="w-full text-sm table-fixed border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="p-3 text-left">DATA RECEBIMENTO</th>
                <th className="p-3 text-left">RECEBIDO POR</th>
                <th className="p-3 text-left">ID PRODUTO</th>
                <th className="p-3 text-left">CÓDIGO NF</th>
                <th className="p-3 text-left">MODELO REFERÊNCIA</th>
                <th className="p-3 text-left hidden lg:table-cell">GTIN/EAN</th>
                <th className="p-3 text-left hidden lg:table-cell">Nº NF RECEB.</th>
                <th className="p-3 text-left">PRÉ-ANÁLISE</th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((p, i) => (
                <tr key={p.id} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                  <td className="p-3 text-slate-700">{p.data}</td>
                  <td className="p-3 text-slate-700">{p.recebidoPor}</td>
                  <td className="p-3 font-mono text-slate-700">{p.id}</td>
                  <td className="p-3 text-slate-700">{p.codigoNF}</td>
                  <td className="p-3 max-w-xs truncate text-slate-700">{p.modeloRef}</td>
                  <td className="p-3 hidden lg:table-cell text-slate-700">{p.gtin}</td>
                  <td className="p-3 hidden lg:table-cell text-slate-700">{p.nfReceb}</td>
                  <td className="p-3">
                    <button onClick={() => efetuar(i)} className={`px-3 py-1 rounded-md text-sm ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      EFETUAR
                    </button>
                  </td>
                </tr>
              ))}
              {pendentes.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-600">Nenhum produto aguardando pré-análise.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800">DADOS — RESULTADO PRÉ-ANÁLISE</h3>

        {/* Mobile+Tablet: stacked cards for resultados (show until lg) */}
        <div className="lg:hidden mt-4 space-y-3">
          {resultados.length === 0 ? (
            <div className="p-4 text-center text-slate-600">NENHUM PRODUTO AVALIADO</div>
          ) : (
            resultados.map((r, idx) => (
              <div key={r.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border border-slate-100 rounded-lg p-3`}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-600">DATA</div>
                    <div className="text-sm" style={{ color: '#6b7280' }}>{r.data}</div>
                    <div className="text-xs text-slate-600 mt-2">ID PRODUTO</div>
                    <div className="font-mono text-sm truncate" style={{ color: '#6b7280' }}>{r.id}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop (lg)+ : table view for resultados */}
        <div className="hidden lg:block mt-4 overflow-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="p-3 text-left">DATA</th>
                <th className="p-3 text-left">ID PRODUTO</th>
                <th className="p-3 text-left">CÓDIGO NF</th>
                <th className="p-3 text-left">Nº SÉRIE</th>
                <th className="p-3 text-left">MODELO REF</th>
                <th className="p-3 text-left hidden lg:table-cell">MODELO FABRICANTE</th>
                <th className="p-3 text-left hidden lg:table-cell">PRÉ-ANALISADO POR</th>
                <th className="p-3 text-left hidden lg:table-cell">DESTINO</th>
                <th className="p-3 text-left">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {resultados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-600">NENHUM PRODUTO AVALIADO</td>
                </tr>
              ) : (
                resultados.map((r, idx) => (
                  <tr key={r.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                    <td className="p-3 text-slate-700">{r.data}</td>
                    <td className="p-3 font-mono text-slate-700">{r.id}</td>
                    <td className="p-3 text-slate-700">{r.codigoNF}</td>
                    <td className="p-3 text-slate-700">—</td>
                    <td className="p-3 text-slate-700">{r.modeloRef}</td>
                    <td className="p-3 hidden lg:table-cell text-slate-700">—</td>
                    <td className="p-3 hidden lg:table-cell text-slate-700">—</td>
                    <td className="p-3 hidden lg:table-cell text-slate-700">—</td>
                    <td className="p-3 text-slate-700">—</td>
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
