"use client";

import { useState } from "react";

export default function CadastroPage() {
  const [form, setForm] = useState({ codigo: "", ean: "", modeloRef: "", modeloFabricante: "" });
  const [modelos, setModelos] = useState<string[]>([]);
  const [itens, setItens] = useState<string[]>([]);
  const [acessorioInput, setAcessorioInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const adicionarModelo = () => {
    if (!form.modeloFabricante) return;
    setModelos((m) => [...m, form.modeloFabricante]);
    setForm({ ...form, modeloFabricante: "" });
    setErrors((e) => ({ ...e, modeloFabricante: "" }));
  };

  const adicionarAcessorio = () => {
    if (!acessorioInput.trim()) return;
    setItens((i) => [...i, acessorioInput.trim()]);
    setAcessorioInput("");
    setErrors((e) => ({ ...e, itens: "" }));
  };

  const limpar = () => {
    setForm({ codigo: "", ean: "", modeloRef: "", modeloFabricante: "" });
    setModelos([]);
    setItens([]);
    setAcessorioInput("");
    setErrors({});
  };

  const validar = () => {
    const err: Record<string, string> = {};
    if (!form.codigo.trim()) err.codigo = 'Obrigatório';
    if (!form.ean.trim()) err.ean = 'Obrigatório';
    if (!form.modeloRef.trim()) err.modeloRef = 'Obrigatório';
    if (modelos.length < 1) err.modelos = 'Adicione pelo menos 1 Modelo Fabricante';
    if (itens.length < 1) err.itens = 'Adicione pelo menos 1 Acessório Referente';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const salvar = async () => {
    if (!validar()) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const { ProductService } = await import('@/backend/services/productService');

      const productData = {
        codigo: form.codigo,
        ean: form.ean,
        modeloRef: form.modeloRef,
        modelosFabricante: modelos,
        acessorios: itens
      };

      await ProductService.createProduct(productData);
      alert('Produto salvo com sucesso!');
      limpar();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Erro ao salvar produto');
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <header>
        <h1 className="text-2xl font-semibold text-slate-800">Cadastro de produtos</h1>
        <p className="text-sm text-slate-600 mt-1">Um Código NF, EAN e Modelo Referência pode estar vinculado a vários Modelos Fabricante e exige cadastro de Acessórios Referentes.</p>
      </header>

      {/* Dados principais */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="font-medium text-slate-700 mb-4">Dados principais</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-600 mb-2">CÓDIGO NF</label>
            <input name="codigo" value={form.codigo} onChange={onChange} className={`w-full rounded-md px-3 py-2 text-sm ${errors.codigo ? 'border-red-500' : 'border-slate-200 border'}`} />
            {errors.codigo && <p className="text-xs text-red-500 mt-1">{errors.codigo}</p>}
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-2">EAN / GTIN</label>
            <input name="ean" value={form.ean} onChange={onChange} className={`w-full rounded-md px-3 py-2 text-sm ${errors.ean ? 'border-red-500' : 'border-slate-200 border'}`} />
            {errors.ean && <p className="text-xs text-red-500 mt-1">{errors.ean}</p>}
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-2">MODELO REFERÊNCIA</label>
            <input name="modeloRef" value={form.modeloRef} onChange={onChange} className={`w-full rounded-md px-3 py-2 text-sm ${errors.modeloRef ? 'border-red-500' : 'border-slate-200 border'}`} />
            {errors.modeloRef && <p className="text-xs text-red-500 mt-1">{errors.modeloRef}</p>}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button className="px-3 py-1.5 rounded-full border border-slate-200 text-sm text-primary-600 bg-primary-50">EMBALAGEM</button>
          <button className="px-3 py-1.5 rounded-full border border-slate-200 text-sm text-slate-600">ACESSÓRIOS</button>
        </div>
      </section>

      {/* Modelos Fabricante vinculados */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="font-medium text-slate-700 mb-3">Modelos Fabricante vinculados</h3>
        <p className="text-sm text-slate-600 mb-4">Clique em um modelo para selecioná-lo e vincular peças estéticas e funcionalidades.</p>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <input name="modeloFabricante" value={form.modeloFabricante} onChange={onChange} placeholder="EX.: 50UT8050PSA.BWZQLL" className={`flex-1 rounded-md px-3 py-2 text-sm placeholder:text-slate-600 ${errors.modelos ? 'border-red-500' : 'border-slate-200 border'}`} />
          <button onClick={adicionarModelo} className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm w-full sm:w-auto">+ ADICIONAR MODELO</button>
        </div>
        {errors.modelos && <p className="text-xs text-red-500 mt-2">{errors.modelos}</p>}

        <div className="mt-4 overflow-auto">
          <table className="w-full table-fixed text-left text-sm">
            <thead>
              <tr className="text-slate-600">
                <th className="py-2">#</th>
                <th className="py-2">MODELO FABRICANTE</th>
                <th className="py-2">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {modelos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-600">Nenhum modelo fabricante incluído.</td>
                </tr>
              ) : (
                modelos.map((m, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="py-3 text-slate-600 w-12">{idx + 1}</td>
                    <td className="py-3 text-slate-700">{m}</td>
                    <td className="py-3 text-sm text-slate-600">—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Itens vinculados ao produto */}
      <section className="bg-white rounded-lg border border-dashed border-slate-200 p-6">
        <h4 className="font-medium text-slate-700 mb-3">Itens vinculados ao produto</h4>
        <p className="text-sm text-slate-600 mb-4">Lista unificada de embalagem, acessórios, peças estéticas e funcionalidades associados a este Código NF / EAN / Modelo Referência.</p>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={acessorioInput}
              onChange={(e) => setAcessorioInput(e.target.value)}
              placeholder="Adicionar acessório (ex.: cabo, controle)"
              className={`flex-1 rounded-md px-3 py-2 text-sm placeholder:text-slate-600 ${errors.itens ? 'border-red-500' : 'border-slate-200 border'}`}
            />
            <button onClick={adicionarAcessorio} className="bg-sky-600 text-white px-4 py-2 rounded-md text-sm w-full sm:w-auto">Adicionar Acessório</button>
          </div>

          <div className="overflow-auto">
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="py-2 w-12">#</th>
                  <th className="py-2">TIPO</th>
                  <th className="py-2">MODELO</th>
                  <th className="py-2">CÓDIGO</th>
                  <th className="py-2">DESCRIÇÃO</th>
                  <th className="py-2">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-600">Nenhuma peça vinculada ainda.</td>
                  </tr>
                ) : (
                  itens.map((it, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-3 text-slate-600">{i + 1}</td>
                      <td className="py-3 text-slate-700">Acessório</td>
                      <td className="py-3 text-slate-700">—</td>
                      <td className="py-3 text-slate-700">—</td>
                      <td className="py-3 text-slate-700">{it}</td>
                      <td className="py-3 text-slate-600">—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer actions */}
      <footer className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <p className="text-xs text-slate-600">Campos obrigatórios: Código NF, EAN, Modelo Referência, pelo menos 1 Modelo Fabricante e ao menos 1 Acessório Referente.</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button className="px-4 py-2 border border-primary-600 text-primary-600 rounded-md text-sm bg-white w-full sm:w-auto">SIMULAR CADASTRO</button>
          <button onClick={limpar} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-sm bg-white w-full sm:w-auto">LIMPAR</button>
          <button onClick={salvar} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm w-full sm:w-auto">SALVAR</button>
        </div>
      </footer>

      {/* Voltar link removed per request */}
    </div>
  );
}
