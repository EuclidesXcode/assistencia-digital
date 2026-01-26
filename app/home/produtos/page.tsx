"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import {
  Plus,
  Search,
  Box,
  Package,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Filter,
  ArrowUpDown,
  Laptop,
  Tv,
  Speaker,
  Grid,
  FileText,
  ShieldCheck,
  Zap,
  Eye,
  Trash2,
  ExternalLink,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { ProductService } from "@/backend/services/productService";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Product, ItemVinculado } from "@/backend/models/Product";
import ProdutoCadastroForm from "./components/ProdutoCadastroForm";

function ProdutosContent() {
  const [showCadastro, setShowCadastro] = useState(false);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedEan, setExpandedEan] = useState<string | null>(null);

  const loadProdutos = async () => {
    setIsLoading(true);
    try {
      const data = await ProductService.getLatestProducts();
      setProdutos(data as Product[]);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  const filteredProdutos = useMemo(() => {
    if (!searchTerm) return produtos;
    const s = searchTerm.toLowerCase();
    return produtos.filter(p =>
      p.ean.toLowerCase().includes(s) ||
      p.modeloRef.toLowerCase().includes(s) ||
      p.marca.toLowerCase().includes(s)
    );
  }, [produtos, searchTerm]);

  const toggleExpand = (ean: string) => {
    setExpandedEan(expandedEan === ean ? null : ean);
  };

  if (showCadastro) {
    return (
      <div className="p-8">
        <ProdutoCadastroForm
          onBack={() => setShowCadastro(false)}
          onSuccess={() => {
            setShowCadastro(false);
            loadProdutos();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Produtos</h1>
            <p className="text-slate-500 font-medium mt-1">Gerencie o catálogo de produtos e componentes técnicos.</p>
          </div>
          <Button
            onClick={() => setShowCadastro(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus size={20} strokeWidth={3} />
            CADASTRAR PRODUTO
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total de Produtos" value={produtos.length} icon={Box} color="bg-indigo-500" />
          <StatCard title="Total de EANs" value={new Set(produtos.map(p => p.ean)).size} icon={Package} color="bg-emerald-500" />
          <StatCard title="Marcas Ativas" value={new Set(produtos.map(p => p.marca)).size} icon={Grid} color="bg-amber-500" />
          <StatCard title="Itens Técnicos" value={produtos.reduce((acc, p) => acc + (p.modelos?.length || 0), 0)} icon={Laptop} color="bg-slate-800" />
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Controls Bar */}
          <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquise por EAN, Modelo ou Marca..."
                className="pl-12 h-12 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
                <Filter size={18} className="mr-2" /> Filtros
              </Button>
              <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
                <ArrowUpDown size={18} className="mr-2" /> Ordenar
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Produto</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Identificação</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={3} className="px-8 py-10"><div className="h-4 bg-slate-100 rounded-full w-full"></div></td>
                    </tr>
                  ))
                ) : filteredProdutos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-20 text-center">
                      <div className="max-w-xs mx-auto space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                          <Search size={32} className="text-slate-300" />
                        </div>
                        <div>
                          <p className="text-slate-900 font-black">Nenhum produto encontrado</p>
                          <p className="text-slate-500 text-sm">Tente ajustar seus filtros ou cadastre um novo produto.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProdutos.map((produto) => (
                    <React.Fragment key={produto.ean}>
                      <tr
                        onClick={() => toggleExpand(produto.ean)}
                        className={`group cursor-pointer transition-all duration-300 ${expandedEan === produto.ean ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ${getBrandColor(produto.marca)}`}>
                              {getBrandIcon(produto.marca)}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 leading-none mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{produto.modeloRef}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full bg-slate-800 uppercase tracking-tighter">{produto.marca}</span>
                                {produto.modelos?.length > 0 && (
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                    {produto.modelos.length} variantes
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-sm font-black text-slate-700 font-mono tracking-tight">{produto.ean}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-3.5">EAN PRINCIPAL</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpand(produto.ean); }}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${expandedEan === produto.ean ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'} shadow-sm`}
                            >
                              {expandedEan === produto.ean ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); }}
                              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm"
                            >
                              <MoreVertical size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {expandedEan === produto.ean && (
                        <tr>
                          <td colSpan={3} className="px-8 py-0 bg-slate-50/30 border-b border-slate-100">
                            <div className="py-8 animate-in slide-in-from-top-4 duration-300">
                              <ProductDetails produto={produto} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Exibindo <span className="font-black text-slate-900">{filteredProdutos.length}</span> produtos</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-xl border-slate-200 bg-white" disabled>Anterior</Button>
              <Button size="sm" variant="outline" className="rounded-xl border-slate-200 bg-white" disabled>Próximo</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetails({ produto }: { produto: Product }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Col 1: Summary & Main Items */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Layers size={14} className="text-indigo-500" /> RESUMO TÉCNICO
          </h5>
          <div className="space-y-4">
            <DetailItem icon={Box} label="Embalagem" count={produto.embalagem?.length} active={produto.embalagem?.length > 0} />
            <DetailItem icon={Package} label="Acessórios" count={produto.acessorios?.length} active={produto.acessorios?.length > 0} />
            <DetailItem icon={ShieldCheck} label="Vistoria Estética" count={produto.estetica?.length} active={produto.estetica?.length > 0} />
            <DetailItem icon={Zap} label="Funcional / SAT" count={produto.funcional?.length} active={produto.funcional?.length > 0} />
            <DetailItem icon={FileText} label="Notas Fiscais" count={produto.nfs?.length} active={produto.nfs?.length > 0} color="blue" />
          </div>
        </div>

        {produto.manualUrl && (
          <a
            href={produto.manualUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 hover:bg-indigo-100 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-tight">Manual Técnico</p>
                <p className="text-[10px] font-medium opacity-70 italic">Abrir documentação PDF</p>
              </div>
            </div>
            <ExternalLink size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
        )}
      </div>

      {/* Col 2 & 3: Variants / Models Linked */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm min-h-full">
          <div className="flex items-center justify-between mb-6">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Laptop size={14} className="text-indigo-500" /> VARIANTES DE FABRICAÇÃO ({produto.modelos?.length || 0})
            </h5>
            <button className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest">
              Ver todos os itens vinculados
            </button>
          </div>

          {produto.modelos?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {produto.modelos.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 hover:bg-white transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{m.nome}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{m.categoria} • {m.linha || 'GERAL'}</p>
                    </div>
                    <div className="flex gap-1">
                      {m.estetica?.length > 0 && <span title="Estética" className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      {m.funcional?.length > 0 && <span title="Funcional" className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {/* Fake avatars for "pieces" or "parts" */}
                      <div className="w-5 h-5 rounded-full border border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold">P1</div>
                      <div className="w-5 h-5 rounded-full border border-white bg-slate-300 flex items-center justify-center text-[8px] font-bold">P2</div>
                      <div className="w-5 h-5 rounded-full border border-white bg-indigo-100 text-indigo-600 flex items-center justify-center text-[8px] font-bold">+</div>
                    </div>
                    <button className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase">Gerenciar</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
                <Grid size={20} className="text-slate-300" />
              </div>
              <p className="text-xs font-bold text-slate-400">Nenhuma variante vinculada a este EAN.</p>
              <button className="mt-2 text-xs font-black text-indigo-600 hover:text-indigo-700">VINCULAR MODELO AGORA</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, count, active, color = "indigo" }: any) {
  const colors: any = {
    indigo: "text-indigo-600",
    blue: "text-blue-600",
    emerald: "text-emerald-600"
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${active ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50/50 border-transparent opacity-60'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-slate-50 ' + colors[color] : 'bg-transparent text-slate-300'}`}>
          <Icon size={16} />
        </div>
        <span className={`text-xs font-bold ${active ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
      </div>
      {active ? (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-50 ${colors[color]}`}>
          {count} itens
        </span>
      ) : (
        <span className="text-[10px] font-black text-slate-300">—</span>
      )}
    </div>
  );
}

export default function ProdutosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
      </div>
    }>
      <ProdutosContent />
    </Suspense>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 translate-y-0 hover:-translate-y-1 transition-all">
      <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function getBrandColor(brand: string) {
  const b = brand.toUpperCase();
  if (b.includes('PHILCO')) return 'bg-red-500';
  if (b.includes('LG')) return 'bg-rose-600';
  if (b.includes('SONY')) return 'bg-slate-900';
  if (b.includes('SAMSUNG')) return 'bg-blue-600';
  return 'bg-indigo-500';
}

function getBrandIcon(brand: string) {
  const b = brand.toUpperCase();
  if (b.includes('TV')) return <Tv size={24} />;
  if (b.includes('AUDIO')) return <Speaker size={24} />;
  return <Box size={24} />;
}
