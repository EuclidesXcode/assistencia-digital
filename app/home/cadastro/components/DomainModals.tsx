
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { ModalShell, IconBtn } from "./UIComponents";

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
    // Mock list or fetch from API if we want full refinement
    const [q, setQ] = useState("");
    const lista = [{ nome: "CASAS BAHIA" }, { nome: "MAGAZINE LUIZA" }, { nome: "MERCADO LIVRE" }].filter(x => x.nome.includes(upper(q)));

    return (
        <ModalShell open={open} title="Selecionar Revenda" onClose={onClose}>
            <input placeholder="Pesquisar..." value={q} onChange={e => setQ(e.target.value)} className="w-full border p-2 rounded mb-2" />
            <div className="border rounded max-h-60 overflow-auto">
                {lista.map((x, i) => (
                    <div key={i} onClick={() => onSelect(x.nome)} className="p-2 hover:bg-gray-100 cursor-pointer border-b text-xs flex justify-between">
                        <span>{x.nome}</span>
                        <Plus size={14} />
                    </div>
                ))}
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
