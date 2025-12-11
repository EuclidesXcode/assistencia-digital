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

export default function RecebimentoPage() {
  const [registros] = useState<Registro[]>([
    { id: "A1234567", data: "25/09/2025", analisadoPor: "EDUARDO", codigoNF: "5313546", modeloFabricante: "50UT8050PSA.BWZJ LZ", ean: "7893299951862", nf: "000123" },
    { id: "B7654321", data: "26/09/2025", analisadoPor: "FERNANDA", codigoNF: "5331250", modeloFabricante: "PTV32M9GACGB V.A", ean: "7899466423456", nf: "000456" },
    { id: "C9876543", data: "27/09/2025", analisadoPor: "JOÃO", codigoNF: "5412801", modeloFabricante: "65A6N", ean: "7891234567890", nf: "000789" },
    { id: "D1122334", data: "28/09/2025", analisadoPor: "CARLA", codigoNF: "5412805", modeloFabricante: "55QNED80SRA.AWZFLSZ", ean: "7893299951999", nf: "000990" },
    { id: "E5566778", data: "29/09/2025", analisadoPor: "MARCOS", codigoNF: "5412333", modeloFabricante: "PTV50VA4REGB V.A", ean: "7899466423999", nf: "001010" },
    { id: "F9988776", data: "30/09/2025", analisadoPor: "ANA", codigoNF: "5412555", modeloFabricante: "T65A6N", ean: "7891234567999", nf: "001050" },
    { id: "G4455667", data: "01/10/2025", analisadoPor: "RAFAEL", codigoNF: "5420001", modeloFabricante: "MODEL X1", ean: "7890001112223", nf: "001100" },
    { id: "H9988112", data: "02/10/2025", analisadoPor: "LUCAS", codigoNF: "5420002", modeloFabricante: "MODEL Y2", ean: "7890001113334", nf: "001101" },
  ]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const allSelectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const efetuarRecebimento = () => {
    alert('Fluxo de recebimento iniciado (demo)');
  };

  return (
    <div className="space-y-6 min-w-0">
      <section className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-800">RECEBIMENTO DE PRODUTO</h2>
            <p className="text-sm text-slate-500 mt-1">Fluxo guiado de <strong>4 etapas</strong> — LPN, Vistoria Revenda, SAT e Recebimento do Produto.</p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-full text-slate-600">1 • LPN</span>
              <span className="inline-flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-full text-slate-600">2 • Vistoria</span>
              <span className="inline-flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-full text-slate-600">3 • SAT</span>
              <span className="inline-flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-full text-slate-600">4 • Recebimento</span>
            </div>
          </div>

          <div className="w-full sm:w-auto mt-2 sm:mt-0">
            <button onClick={efetuarRecebimento} className="bg-blue-600 text-white px-4 py-2 rounded-md w-full sm:w-auto hover:bg-blue-700 transition-colors">Efetuar Recebimento</button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-4">
        <header className="flex flex-col gap-4 mb-4">
          <div className="min-w-0">
            <h3 className="text-sm text-slate-600">PRODUTOS AGUARDANDO ELABORAÇÃO DE ORÇAMENTO</h3>
            <p className="text-xs text-slate-400">Produtos analisados, pendentes de elaboração de orçamento.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="text-sm text-slate-600">TOTAL <strong className="text-slate-800">{registros.length}</strong> REGISTROS</div>
              <div className="text-sm text-slate-600">FILTRO <strong className="text-slate-800">{registros.length}</strong> VISÍVEIS</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="bg-white border border-primary-600 text-primary-600 px-3 py-1.5 rounded-full text-sm hover:bg-primary-50 transition-colors">PEÇAS PENDENTES DE ORÇAMENTO ({registros.length})</button>
              <button onClick={() => window.print()} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-sm hover:bg-slate-200 transition-colors">IMPRIMIR</button>
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
                  <td className="p-3">{r.data}</td>
                  <td className="p-3">{r.analisadoPor}</td>
                  <td className="p-3 font-mono">{r.id}</td>
                  <td className="p-3">{r.codigoNF}</td>
                  <td className="p-3">{r.modeloFabricante}</td>
                  <td className="p-3">{r.ean}</td>
                  <td className="p-3">{r.nf}</td>
                  <td className="p-3"><span className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-medium">PENDENTE</span></td>
                  <td className="p-3">-</td>
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
                    <span className="font-mono text-sm font-semibold text-slate-900">{r.id}</span>
                    <span className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0">PENDENTE</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs block mb-1">DATA RECEB.</span>
                      <span className="text-slate-900 font-medium">{r.data}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block mb-1">ANALISADO POR</span>
                      <span className="text-slate-900 font-medium">{r.analisadoPor}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block mb-1">CÓDIGO NF</span>
                      <span className="text-slate-900 font-medium">{r.codigoNF}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block mb-1">NF</span>
                      <span className="text-slate-900 font-medium">{r.nf}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-slate-500 text-xs block mb-1">MODELO FABRICANTE</span>
                    <span className="text-slate-900 font-medium text-sm break-words">{r.modeloFabricante}</span>
                  </div>

                  <div className="mt-3">
                    <span className="text-slate-500 text-xs block mb-1">EAN / GTIN</span>
                    <span className="text-slate-900 font-medium text-sm font-mono">{r.ean}</span>
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
