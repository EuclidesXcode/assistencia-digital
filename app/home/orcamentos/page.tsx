"use client";

import { useMemo, useState } from "react";
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
  const [registros, setRegistros] = useState<Registro[]>([
    { id: "A1234567", data: "25/09/2025", analisadoPor: "EDUARDO", codigoNF: "5313546", modeloFabricante: "50UT8050PSA.BWZJ LZ", ean: "7893299951862", nf: "000123" },
    { id: "B7654321", data: "26/09/2025", analisadoPor: "FERNANDA", codigoNF: "5331250", modeloFabricante: "PTV32M9GACGB V.A", ean: "7899466423456", nf: "000456" },
    { id: "C9876543", data: "27/09/2025", analisadoPor: "JOÃO", codigoNF: "5412801", modeloFabricante: "65A6N", ean: "7891234567890", nf: "000789" },
    { id: "D1122334", data: "28/09/2025", analisadoPor: "CARLA", codigoNF: "5412805", modeloFabricante: "55QNED80SRA.AWZFLSZ", ean: "7893299951999", nf: "000990" },
    { id: "E5566778", data: "29/09/2025", analisadoPor: "MARCOS", codigoNF: "5412333", modeloFabricante: "PTV50VA4REGB V.A", ean: "7899466423999", nf: "001010" },
    { id: "F9988776", data: "30/09/2025", analisadoPor: "ANA", codigoNF: "5412555", modeloFabricante: "T65A6N", ean: "7891234567999", nf: "001050" },
  ]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [marcaFilter, setMarcaFilter] = useState<string>("TODAS");

  const toggle = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const allSelectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const imprimir = () => {
    window.print();
  };

  const abrirPecasPendentes = () => {
    alert(`Peças pendentes de orçamento (${registros.length})`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">PRODUTOS AGUARDANDO ELABORAÇÃO DE ORÇAMENTO</h1>
          <p className="text-sm text-slate-600">Produtos analisados, pendentes de elaboração de orçamento.</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="text-sm text-slate-600">TOTAL <strong className="text-slate-800">{registros.length}</strong> REGISTROS</div>
            <div className="text-sm text-slate-600">FILTRO <strong className="text-slate-800">{registros.length}</strong> VISÍVEIS</div>
            <label className="text-sm flex items-center gap-2">
              MARCA:
              <select value={marcaFilter} onChange={(e) => setMarcaFilter(e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-sm">
                <option>TODAS</option>
                <option>LG</option>
                <option>PHILCO</option>
                <option>HISENSE</option>
              </select>
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={abrirPecasPendentes} className="bg-white border border-primary-600 text-primary-600 px-3 py-1.5 rounded-full text-sm hover:bg-primary-50 transition-colors">PEÇAS PENDENTES DE ORÇAMENTO ({registros.length})</button>
            <button onClick={imprimir} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-sm hover:bg-slate-200 transition-colors">IMPRIMIR</button>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-lg border border-slate-200 p-4">
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
                <th className="p-3 text-left">DATA RECEB.</th>
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
                  <td className="p-3"><span className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-medium">PENDENTE</span></td>
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
                    <span className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0">PENDENTE</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-600 text-xs block mb-1">DATA RECEB.</span>
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
