
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2, Pencil, Check } from "lucide-react";
import { ModalShell, IconBtn } from "./UIComponents";
import { ProductApiService } from "@/lib/productApiService";
import { ClientService } from "@/backend/services/clientService";

export const ModalBuscaProduto: React.FC<{
    open: boolean;
    onClose: () => void;
    onSelect: (ean: string) => void;
}> = ({ open, onClose, onSelect }) => {
    const [q, setQ] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalResults, setTotalResults] = useState(0);
    const [pageSize] = useState(20);

    useEffect(() => {
        if (!open) {
            setQ("");
            setResults([]);
            setCurrentPage(1);
            setTotalPages(0);
            setTotalResults(0);
        } else {
            // Load latest products immediately when opening
            loadLatest();
        }
    }, [open]);

    // Live Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (q.length >= 3) {
                setCurrentPage(1); // Reset to page 1 on new search
                handleSearch(1);
            } else if (q.length === 0 && open) {
                loadLatest();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [q, open]);

    const loadLatest = async () => {
        setLoading(true);
        try {
            console.log('[Modal] Fetching latest products...');
            const data = await ProductApiService.getLatestProducts();
            setResults(data);
            setTotalResults(data.length);
            setTotalPages(1);
            setCurrentPage(1);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (page: number = currentPage) => {
        console.log(`[Modal] Starting search for: "${q}" - Page ${page}`);
        setLoading(true);
        try {
            console.log('[Modal] Calling ProductApiService...');
            const response = await ProductApiService.searchProducts(q, page, pageSize);
            console.log(`[Modal] Received ${response.data.length} results of ${response.total} total.`);
            setResults(response.data);
            setTotalResults(response.total);
            setTotalPages(response.totalPages);
            setCurrentPage(response.page);
        } catch (e) {
            console.error('[Modal] Search error:', e);
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        setCurrentPage(page);
        handleSearch(page);
    };

    const startResult = totalResults > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endResult = Math.min(currentPage * pageSize, totalResults);

    return (
        <ModalShell open={open} title="Pesquisar Produto" onClose={onClose} maxW="max-w-2xl">
            <div className="flex gap-2">
                <input
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2 font-bold text-slate-700 uppercase"
                    placeholder="Digite EAN, Modelo ou Marca..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    autoFocus
                />
                <button
                    onClick={() => handleSearch(1)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
                    disabled={loading}
                >
                    <Search size={20} />
                </button>
            </div>

            {/* Results Info */}
            {totalResults > 0 && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold">
                        Mostrando {startResult}-{endResult} de {totalResults} resultados
                    </span>
                    <span className="text-slate-500">
                        Página {currentPage} de {totalPages}
                    </span>
                </div>
            )}

            <div className="mt-4 max-h-[400px] overflow-y-auto border border-slate-200 rounded-lg bg-slate-50">
                {results.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        {loading ? "Buscando..." : "Nenhum resultado encontrado."}
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-xs sticky top-0">
                            <tr>
                                <th className="p-3">Marca</th>
                                <th className="p-3">Modelo</th>
                                <th className="p-3">EAN</th>
                                <th className="p-3 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {results.map((r) => (
                                <tr key={r.ean} className="hover:bg-indigo-50 transition-colors">
                                    <td className="p-3 font-bold text-slate-700">{r.marca}</td>
                                    <td className="p-3 text-slate-600">{r.modeloRef}</td>
                                    <td className="p-3 font-mono text-slate-500 text-xs">{r.ean}</td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => { onSelect(r.ean); onClose(); }}
                                            className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center justify-end gap-1 ml-auto"
                                        >
                                            <Check size={14} /> SELECIONAR
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        ← Anterior
                    </button>

                    <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => goToPage(pageNum)}
                                    disabled={loading}
                                    className={`w-10 h-10 text-sm font-semibold rounded-lg transition-colors ${currentPage === pageNum
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Próximo →
                    </button>
                </div>
            )}
        </ModalShell>
    );
};

// --- Types ---
export interface Master {
    ean: string;
    modeloReferencia: string;
    fabricante: string;
    createdAt?: string;
    createdBy?: string;
}

export interface PecaBase {
    id: number;
    descricao: string;
    codigoPeca?: string;
    modeloId?: number;
    createdAt: string;
    createdBy: string;
}

export interface CodigoNF {
    id: number;
    codigo: string;
    revenda: string;
    createdAt: string;
    createdBy: string;
}

export interface ModeloFabricante {
    id: number;
    nome: string;
    codigoProduto: string;
    linha: string;
    createdAt: string;
    createdBy: string;
}

const norm = (s: any) => String(s || "").trim();
const upper = (s: any) => norm(s).toUpperCase();

// --- Modals ---

export const ModalEanGtins: React.FC<{
    open: boolean;
    onClose: () => void;
    eans: Master[];
    onAdd: (m: Master) => void;
    onSelect: (m: Master) => void;
}> = ({ open, onClose, eans, onAdd, onSelect }) => {
    const [q, setQ] = useState("");
    const [novoEan, setNovoEan] = useState("");
    const [novoModelo, setNovoModelo] = useState("");
    const [novoFab, setNovoFab] = useState("");
    const [msgAdd, setMsgAdd] = useState("");

    const lista = useMemo(() => {
        const qq = upper(q);
        return eans.filter((x) => {
            if (!qq) return true;
            return upper(x.ean).includes(qq) || upper(x.modeloReferencia).includes(qq);
        });
    }, [eans, q]);

    const incluir = () => {
        // Basic validation
        if (!novoEan || !novoModelo) return setMsgAdd("Preencha campos.");
        onAdd({ ean: novoEan, modeloReferencia: novoModelo, fabricante: novoFab, createdAt: new Date().toLocaleDateString(), createdBy: 'USER' });
        setMsgAdd("Incluído localmente (simulação).");
    };

    return (
        <ModalShell open={open} title="Selecionar EAN/GTIN" onClose={onClose} maxW="max-w-4xl">
            {/* Simplified implementation for brevity, assuming standard inputs */}
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input className="border p-2 rounded flex-1" placeholder="Novo EAN" value={novoEan} onChange={e => setNovoEan(e.target.value)} />
                    <input className="border p-2 rounded flex-1" placeholder="Modelo Ref" value={novoModelo} onChange={e => setNovoModelo(e.target.value)} />
                    <button onClick={incluir} className="bg-black text-white px-4 rounded">Incluir</button>
                </div>
                {msgAdd && <div className="text-amber-600 text-xs">{msgAdd}</div>}
                <input className="border p-2 rounded w-full" placeholder="Pesquisar..." value={q} onChange={e => setQ(e.target.value)} />
                <div className="max-h-60 overflow-auto border rounded">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 border-b"><tr><th className="p-2">EAN</th><th className="p-2">Modelo</th><th className="p-2">Ação</th></tr></thead>
                        <tbody>
                            {lista.map((x, i) => (
                                <tr key={i} className="border-b">
                                    <td className="p-2">{x.ean}</td>
                                    <td className="p-2">{x.modeloReferencia}</td>
                                    <td className="p-2"><button onClick={() => onSelect(x)} className="text-blue-600 font-bold">CARREGAR</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ModalShell>
    );
};

export const ModalCodigosNF: React.FC<{
    open: boolean;
    master: Master;
    codigosNF: CodigoNF[];
    nfAtual: string;
    revendaAtual: string;
    mensagem: string;
    onClose: () => void;
    onChangeNF: (v: string) => void;
    onPesquisarRevenda: () => void;
    onAdd: () => void;
    onRemover: (id: number) => void;
    onEditar: (id: number) => void;
}> = ({ open, master, codigosNF, nfAtual, revendaAtual, mensagem, onClose, onChangeNF, onPesquisarRevenda, onAdd, onRemover, onEditar }) => {
    return (
        <ModalShell open={open} title="Cadastro de Códigos NF" subtitle={`EAN: ${master.ean}`} onClose={onClose}>
            <div className="space-y-4">
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500">REVENDA</label>
                        <div className="flex gap-2">
                            <input readOnly value={revendaAtual} className="border p-2 rounded w-full bg-gray-50" />
                            <button onClick={onPesquisarRevenda} className="border p-2 rounded hover:bg-gray-100"><Search size={16} /></button>
                        </div>
                    </div>
                    <div className="w-40">
                        <label className="text-xs font-bold text-gray-500">CÓDIGO</label>
                        <input value={nfAtual} onChange={e => onChangeNF(e.target.value)} className="border p-2 rounded w-full" />
                    </div>
                    <button onClick={onAdd} className="bg-sky-600 text-white px-4 py-2 rounded h-[42px]"><Plus size={16} /></button>
                </div>
                {mensagem && <div className="p-2 bg-amber-50 text-amber-700 rounded text-xs">{mensagem}</div>}

                <div className="border rounded max-h-60 overflow-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b">
                            <tr><th className="p-2 text-left">Revenda</th><th className="p-2 text-left">Código</th><th className="p-2 text-right">Ações</th></tr>
                        </thead>
                        <tbody>
                            {codigosNF.map(c => (
                                <tr key={c.id} className="border-b">
                                    <td className="p-2">{c.revenda}</td>
                                    <td className="p-2">{c.codigo}</td>
                                    <td className="p-2 text-right space-x-2">
                                        <IconBtn title="Editar" onClick={() => onEditar(c.id)}><Pencil size={14} /></IconBtn>
                                        <IconBtn title="Excluir" variant="danger" onClick={() => onRemover(c.id)}><Trash2 size={14} /></IconBtn>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ModalShell>
    );
};

export const ModalRevendasClientes: React.FC<{
    open: boolean;
    onClose: () => void;
    onSelect: (nome: string) => void;
}> = ({ open, onClose, onSelect }) => {
    const [q, setQ] = useState("");
    const [lista, setLista] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            if (!q || q.length < 2) {
                setLista([]);
                return;
            }
            setLoading(true);
            try {
                const results = await ClientService.search(q);
                setLista(results);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        const timer = setTimeout(fetchClients, 500);
        return () => clearTimeout(timer);
    }, [q]);

    return (
        <ModalShell open={open} title="Selecionar Revenda" onClose={onClose}>
            <input
                placeholder="Pesquisar..."
                value={q}
                onChange={e => setQ(e.target.value)}
                className="w-full border p-2 rounded mb-2 font-bold uppercase"
                autoFocus
            />
            <div className="border rounded max-h-60 overflow-auto bg-slate-50">
                {lista.map((x, i) => (
                    <div
                        key={i}
                        onClick={() => onSelect(x.trade_name || x.legal_name || x.full_name || "")}
                        className="p-3 hover:bg-slate-100 cursor-pointer border-b text-xs flex justify-between items-center transition-colors"
                    >
                        <span className="font-bold text-slate-700 uppercase">{x.trade_name || x.legal_name || x.full_name || "SEM NOME"}</span>
                        <Plus size={14} className="text-slate-400" />
                    </div>
                ))}
                {lista.length === 0 && q.length >= 2 && !loading && (
                    <div className="p-4 text-center text-slate-400 text-xs">Nenhum cliente encontrado.</div>
                )}
                {loading && (
                    <div className="p-4 text-center text-slate-400 text-xs">Buscando...</div>
                )}
            </div>
        </ModalShell>
    );
};

export const ModalPecas: React.FC<{
    open: boolean;
    title: string;
    master: Master;
    form: { codigoPeca?: string; descricao: string };
    mensagem: string;
    onClose: () => void;
    onChangeCodigo?: (v: string) => void;
    onChangeDescricao: (v: string) => void;
    onAdd: () => void;
    lista: PecaBase[];
    onRemover: (id: number) => void;
}> = ({ open, title, master, form, mensagem, onClose, onChangeCodigo, onChangeDescricao, onAdd, lista, onRemover }) => {
    return (
        <ModalShell open={open} title={title} subtitle={`EAN: ${master.ean}`} onClose={onClose} maxW="max-w-4xl">
            <div className="flex gap-2 items-end">
                {onChangeCodigo && (
                    <div className="w-32">
                        <label className="text-xs font-bold text-gray-500">CÓD PEÇA</label>
                        <input value={form.codigoPeca} onChange={e => onChangeCodigo(e.target.value)} className="border p-2 rounded w-full" />
                    </div>
                )}
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">DESCRIÇÃO</label>
                    <input value={form.descricao} onChange={e => onChangeDescricao(e.target.value)} className="border p-2 rounded w-full" />
                </div>
                <button onClick={onAdd} className="bg-sky-600 text-white px-4 py-2 rounded h-[42px]"><Plus size={16} /></button>
            </div>
            {mensagem && <div className="p-2 bg-amber-50 text-amber-700 rounded text-xs">{mensagem}</div>}
            <div className="border rounded max-h-60 overflow-auto mt-2">
                <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            {onChangeCodigo && <th className="p-2 text-left">Código</th>}
                            <th className="p-2 text-left">Descrição</th>
                            <th className="p-2 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lista.map(c => (
                            <tr key={c.id} className="border-b">
                                {onChangeCodigo && <td className="p-2">{c.codigoPeca}</td>}
                                <td className="p-2">{c.descricao}</td>
                                <td className="p-2 text-right">
                                    <IconBtn title="Excluir" variant="danger" onClick={() => onRemover(c.id)}><Trash2 size={14} /></IconBtn>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ModalShell>
    );
};
