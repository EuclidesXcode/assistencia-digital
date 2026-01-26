"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Search,
  Box,
  Package,
  ChevronRight,
  MoreVertical,
  Filter,
  ArrowUpDown,
  Laptop,
  Tv,
  Speaker,
  Grid,
} from "lucide-react";
import { ProductService } from "@/backend/services/productService";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import ProdutoCadastroForm from "./components/ProdutoCadastroForm";

export default function ProdutosPage() {
  const [showCadastro, setShowCadastro] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadProdutos = async () => {
    setIsLoading(true);
    try {
      const data = await ProductService.getLatestProducts();
      setProdutos(data);
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
    return produtos.filter(p =>
      p.ean.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.modeloRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.marca.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [produtos, searchTerm]);

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
          <StatCard title="Itens Técnicos" value="---" icon={Laptop} color="bg-slate-800" />
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
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
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
                    <tr key={produto.ean} className="group hover:bg-slate-50/50 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 ${getBrandColor(produto.marca)}`}>
                            {getBrandIcon(produto.marca)}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 leading-none mb-1 group-hover:text-indigo-600 transition-colors uppercase">{produto.modeloRef}</h4>
                            <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full bg-slate-800 uppercase">{produto.marca}</span>
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
                          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all">
                            <ChevronRight size={20} />
                          </button>
                          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 hover:shadow-sm transition-all">
                            <MoreVertical size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
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
