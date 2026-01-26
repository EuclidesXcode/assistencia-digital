"use client";

import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
    Plus,
    Trash2,
    FileText,
    Upload,
    Box,
    Settings,
    Check,
    X,
    Image as ImageIcon,
    Play,
    RotateCcw,
    Package,
    Tag,
    FileJson,
    Camera,
    Search,
    Wrench,
    Info,
    ArrowLeft,
    Settings2,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { ProductService } from "@/backend/services/productService";
import { CreateProductDTO, ModeloFabricante, ProdutoNF, ItemVinculado } from "@/backend/models/Product";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { CameraModal } from "./UIComponents";
import { ModalBuscaProduto } from "./DomainModals";

/** =========================
 *  Types
 *  ========================= */

type ImageField = "fotoProduto" | "etiquetaProcel" | "fotoKitAcessorio";

type AnexoTipo = "vistaExplodida" | "boletimTecnico" | "manualTecnico";

type ModalType =
    | "NF"
    | "MODELO_FABRICANTE"
    | "ESTETICA"
    | "FUNCIONAL"
    | "FUNCIONALIDADE_MODELO"
    | "EMBALAGEM"
    | "ACESSORIOS"
    | "FUNCIONALIDADE_MASTER"
    | "SEARCH_PRODUCT"
    | "ITEM_FOTOS"
    | "MODELO_ANEXOS"
    | "HELP"
    | "EDIT_TEXT"
    | "CONFIRM"
    | null;

type ToastType = "success" | "error" | "info";

type Toast = { id: string; type: ToastType; message: string };

type ConfirmPayload = {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
};

type EditTextPayload = {
    title: string;
    label: string;
    initialValue: string;
    placeholder?: string;
    confirmLabel?: string;
    onConfirm: (value: string) => void;
};

type ModelAttachmentsPayload = {
    modeloId: string;
    tipo?: AnexoTipo;
};

type ItemFotosPayload = {
    itemId: string;
    itemName: string;
};

type ModalDataMap = {
    CONFIRM: ConfirmPayload;
    EDIT_TEXT: EditTextPayload;
    MODELO_ANEXOS: ModelAttachmentsPayload;
    ITEM_FOTOS: ItemFotosPayload;
};

type ModalData = Partial<ModalDataMap[keyof ModalDataMap]>;

type ImageState = {
    url: string | null;
    file: File | null;
};

interface State {
    ean: string;
    modeloRef: string;
    marca: string;
    fotos: string[];
    manualUrl: string;
    embalagem: ItemVinculado[];
    acessorios: ItemVinculado[];
    funcionalidade: ItemVinculado[];
    nfs: ProdutoNF[];
    modelos: ModeloFabricante[];
    activeModeloId: string | null;
    activeModal: ModalType;
    modalData: ModalData;
    filterMode: "MODELO_REF" | "MODELO_FABRICANTE";
    filtroModeloSelecionado: string | null;
    errors: Record<string, string>;
    isLoading: boolean;
    newModel: { nome: string; categoria: string; codigo: string; linha: string };
    imagens: Record<ImageField, ImageState>;
    toasts: Toast[];
}

const initialState: State = {
    ean: "",
    modeloRef: "",
    marca: "",
    fotos: [],
    manualUrl: "",
    embalagem: [],
    acessorios: [],
    funcionalidade: [],
    nfs: [],
    modelos: [],
    activeModeloId: null,
    activeModal: null,
    modalData: {},
    filterMode: "MODELO_REF",
    filtroModeloSelecionado: null,
    errors: {},
    isLoading: false,
    newModel: { nome: "", categoria: "", codigo: "", linha: "" },
    imagens: {
        fotoProduto: { url: null, file: null },
        etiquetaProcel: { url: null, file: null },
        fotoKitAcessorio: { url: null, file: null },
    },
    toasts: [],
};

/** =========================
 *  Reducer
 *  ========================= */

type Action =
    | { type: "SET_FIELD"; field: keyof State; value: any }
    | { type: "SET_ERRORS"; value: Record<string, string> }
    | { type: "ADD_NF"; nf: ProdutoNF }
    | { type: "REMOVE_NF"; index: number }
    | { type: "ADD_MODELO"; modelo: ModeloFabricante }
    | { type: "REMOVE_MODELO"; id: string }
    | { type: "UPDATE_MODELO"; id: string; field: keyof ModeloFabricante; value: any }
    | { type: "SET_ACTIVE_MODELO"; id: string | null }
    | { type: "ADD_ITEM_MASTER"; itemType: "embalagem" | "acessorios" | "funcionalidade"; item: ItemVinculado }
    | { type: "REMOVE_ITEM_MASTER"; itemType: "embalagem" | "acessorios" | "funcionalidade"; index: number }
    | { type: "ADD_ITEM_MODELO"; modeloId: string; itemType: "estetica" | "funcional" | "funcionalidades"; item: ItemVinculado }
    | { type: "REMOVE_ITEM_MODELO"; modeloId: string; itemType: "estetica" | "funcional" | "funcionalidades"; index: number }
    | { type: "UPDATE_ITEM_MODELO"; modeloId: string; itemType: "estetica" | "funcional" | "funcionalidades"; index: number; newName: string }
    | { type: "OPEN_MODAL"; modal: ModalType; data?: ModalData }
    | { type: "CLOSE_MODAL" }
    | { type: "SET_NEW_MODEL_FIELD"; field: "nome" | "categoria" | "codigo" | "linha"; value: string }
    | { type: "ADD_NEW_MODEL" }
    | { type: "RESET" }
    | { type: "SET_IMAGE"; field: ImageField; value: ImageState }
    | { type: "CLEAR_IMAGE"; field: ImageField }
    | { type: "SET_FILTER_MODE"; value: State["filterMode"] }
    | { type: "SET_FILTRO_MODELO_SELECIONADO"; value: string | null }
    | { type: "LOAD_FROM_DB"; data: any }
    | { type: "LOAD_TEMPLATE_DATA"; data: any }
    | { type: "ADD_TOAST"; toast: Toast }
    | { type: "REMOVE_TOAST"; id: string };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "SET_FIELD": return { ...state, [action.field]: action.value };
        case "SET_ERRORS": return { ...state, errors: action.value };
        case "ADD_NF": return { ...state, nfs: [...state.nfs, action.nf] };
        case "REMOVE_NF": return { ...state, nfs: state.nfs.filter((_, i) => i !== action.index) };
        case "ADD_MODELO": return { ...state, modelos: [...state.modelos, action.modelo], activeModeloId: action.modelo.id };
        case "REMOVE_MODELO": {
            const newModelos = state.modelos.filter((m) => m.id !== action.id);
            return { ...state, modelos: newModelos, activeModeloId: state.activeModeloId === action.id ? newModelos[0]?.id || null : state.activeModeloId };
        }
        case "UPDATE_MODELO": return { ...state, modelos: state.modelos.map((m) => (m.id === action.id ? { ...m, [action.field]: action.value } : m)) };
        case "SET_ACTIVE_MODELO": return { ...state, activeModeloId: action.id };
        case "ADD_ITEM_MASTER": return { ...state, [action.itemType]: [...state[action.itemType], action.item] };
        case "REMOVE_ITEM_MASTER": return { ...state, [action.itemType]: state[action.itemType].filter((_, i) => i !== action.index) };
        case "ADD_ITEM_MODELO": return { ...state, modelos: state.modelos.map((m) => m.id !== action.modeloId ? m : { ...m, [action.itemType]: [...m[action.itemType], action.item] }) };
        case "REMOVE_ITEM_MODELO": return { ...state, modelos: state.modelos.map((m) => m.id !== action.modeloId ? m : { ...m, [action.itemType]: m[action.itemType].filter((_, i) => i !== action.index) }) };
        case "UPDATE_ITEM_MODELO": return { ...state, modelos: state.modelos.map((m) => { if (m.id !== action.modeloId) return m; const newList = [...m[action.itemType]]; if (newList[action.index]) newList[action.index] = { ...newList[action.index], nome: action.newName }; return { ...m, [action.itemType]: newList }; }) };
        case "OPEN_MODAL": return { ...state, activeModal: action.modal, modalData: action.data || {} };
        case "CLOSE_MODAL": return { ...state, activeModal: null, modalData: {} };
        case "SET_NEW_MODEL_FIELD": return { ...state, newModel: { ...state.newModel, [action.field]: action.value } };
        case "ADD_NEW_MODEL": {
            const nome = state.newModel.nome?.trim(); if (!nome) return state;
            const newModelo: ModeloFabricante = { id: uuidv4(), nome, categoria: state.newModel.categoria?.trim() || "GERAL", codigoTipo: state.newModel.codigo?.trim(), estetica: [], funcional: [], funcionalidades: [], ...(state.newModel.linha?.trim() ? ({ linha: state.newModel.linha.trim() } as any) : {}) };
            return { ...state, modelos: [...state.modelos, newModelo], activeModeloId: newModelo.id, newModel: { nome: "", categoria: "", codigo: "", linha: "" } };
        }
        case "RESET": return initialState;
        case "SET_IMAGE": return { ...state, imagens: { ...state.imagens, [action.field]: action.value } };
        case "CLEAR_IMAGE": return { ...state, imagens: { ...state.imagens, [action.field]: { url: null, file: null } } };
        case "SET_FILTER_MODE": return { ...state, filterMode: action.value, filtroModeloSelecionado: action.value === "MODELO_REF" ? null : state.filtroModeloSelecionado };
        case "SET_FILTRO_MODELO_SELECIONADO": return { ...state, filtroModeloSelecionado: action.value };
        case "LOAD_TEMPLATE_DATA": {
            const modelos = action.data.modelos || [];
            return {
                ...state,
                modeloRef: action.data.modeloRef || "",
                marca: action.data.marca || "",
                manualUrl: action.data.manualUrl || "",
                modelos,
                activeModeloId: modelos[0]?.id ?? null,
                errors: {}
            };
        }
        case "LOAD_FROM_DB": {
            const modelos = action.data.modelos || [];
            return { ...state, ean: action.data.ean || "", modeloRef: action.data.modeloRef || "", marca: action.data.marca || "", manualUrl: action.data.manualUrl || "", fotos: action.data.fotos || [], nfs: action.data.nfs || [], modelos, embalagem: action.data.embalagem || [], acessorios: action.data.acessorios || [], funcionalidade: action.data.funcionalidade || [], activeModeloId: modelos[0]?.id ?? null, errors: {} };
        }
        case "ADD_TOAST": return { ...state, toasts: [...state.toasts, action.toast] };
        case "REMOVE_TOAST": return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
        default: return state;
    }
}

/** =========================
 *  Component
 *  ========================= */

export default function ProdutoCadastroForm({ onBack, onSuccess, initialEan }: { onBack: () => void, onSuccess?: () => void, initialEan?: string }) {
    const [state, dispatch] = useReducer(reducer, { ...initialState, ean: initialEan || "" });

    const [showCamera, setShowCamera] = useState(false);
    const [cameraTarget, setCameraTarget] = useState<ImageField | null>(null);

    const fileInputProduto = useRef<HTMLInputElement>(null);
    const fileInputProcel = useRef<HTMLInputElement>(null);
    const fileInputKit = useRef<HTMLInputElement>(null);
    const fileInputManual = useRef<HTMLInputElement>(null);

    const autoLoadRef = useRef("");
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const manualObjectUrlRef = useRef<string | null>(null);

    const toast = (type: ToastType, message: string) => {
        const id = uuidv4();
        dispatch({ type: "ADD_TOAST", toast: { id, type, message } });
        setTimeout(() => dispatch({ type: "REMOVE_TOAST", id }), 2800);
    };

    const getActiveModel = () => state.modelos.find((m) => m.id === state.activeModeloId);

    const validate = () => {
        const errors: Record<string, string> = {};
        if (!state.ean?.trim()) errors.ean = "EAN é obrigatório";
        if (!state.modeloRef?.trim()) errors.modeloRef = "Modelo Referência é obrigatório";
        if (state.modelos.length === 0) errors.modelos = "Cadastre pelo menos 1 Modelo Fabricante";
        return errors;
    };

    const isValid = useMemo(() => Object.keys(validate()).length === 0, [state.ean, state.modeloRef, state.modelos.length]);

    const setImageFromFile = (field: ImageField, file: File) => {
        const prev = state.imagens[field]?.url;
        if (prev) URL.revokeObjectURL(prev);
        const url = URL.createObjectURL(file);
        dispatch({ type: "SET_IMAGE", field, value: { url, file } });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: ImageField) => {
        const file = e.target.files?.[0];
        if (file) setImageFromFile(field, file);
    };

    const clearImage = (field: ImageField) => {
        const prev = state.imagens[field]?.url;
        if (prev) URL.revokeObjectURL(prev);
        dispatch({ type: "CLEAR_IMAGE", field });
    };

    const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (manualObjectUrlRef.current) URL.revokeObjectURL(manualObjectUrlRef.current);
        const url = URL.createObjectURL(file);
        manualObjectUrlRef.current = url;
        dispatch({ type: "SET_FIELD", field: "manualUrl", value: url });
        toast("success", "Manual PDF anexado.");
    };

    const clearManual = () => {
        if (manualObjectUrlRef.current) URL.revokeObjectURL(manualObjectUrlRef.current);
        dispatch({ type: "SET_FIELD", field: "manualUrl", value: "" });
    };

    useEffect(() => {
        const ean = state.ean?.trim().toUpperCase();
        if (!ean || autoLoadRef.current === ean) return;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(async () => {
            autoLoadRef.current = ean;
            try {
                const data = await ProductService.findByEan(ean);
                if (data) {
                    dispatch({ type: "LOAD_TEMPLATE_DATA", data });
                    toast("info", "Template de produto carregado para este EAN.");
                }
            } catch (err) { console.error(err); }
        }, 1000);
        return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
    }, [state.ean]);

    const totalItems = useMemo(() => {
        const modelCount = state.modelos.reduce((acc, m) => acc + m.estetica.length + m.funcional.length + m.funcionalidades.length, 0);
        return state.embalagem.length + state.acessorios.length + (state.funcionalidade?.length || 0) + modelCount;
    }, [state.embalagem.length, state.acessorios.length, state.funcionalidade, state.modelos]);

    const allItems = useMemo(() => {
        const items: any[] = [];
        let count = 0;
        state.embalagem.forEach((item, i) => items.push({ id: `emb-${i}`, count: ++count, type: "PACKAGING", badgeColor: "bg-amber-50 text-amber-700 border-amber-100", model: "-", code: "-", name: item.nome, icon: Box, origin: "embalagem", index: i }));
        state.acessorios.forEach((item, i) => items.push({ id: `acc-${i}`, count: ++count, type: "ACCESSORY", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", model: "-", code: "-", name: item.nome, icon: Package, origin: "acessorios", index: i }));
        state.funcionalidade?.forEach((item, i) => items.push({ id: `fun-${i}`, count: ++count, type: "FEATURE", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100", model: "-", code: "-", name: item.nome, icon: Wrench, origin: "funcionalidade", index: i }));
        state.modelos.forEach((m) => {
            if (state.filterMode === "MODELO_FABRICANTE" && state.filtroModeloSelecionado && state.filtroModeloSelecionado !== m.id) return;
            [{ list: m.estetica, type: "ESTÉTICA", b: "bg-indigo-50 text-indigo-700 border-indigo-100", k: "estetica", i: ImageIcon },
            { list: m.funcional, type: "FUNCIONAL", b: "bg-amber-50 text-amber-700 border-amber-100", k: "funcional", i: Wrench },
            { list: m.funcionalidades, type: "RECURSO", b: "bg-slate-100 text-slate-700 border-slate-200", k: "funcionalidades", i: Tag }].forEach((g) => {
                g.list.forEach((item, i) => items.push({ id: `${m.id}-${g.k}-${i}`, count: ++count, type: g.type, badgeColor: g.b, model: m.nome, code: m.codigoTipo || "-", name: item.nome, icon: g.i, origin: "modelo", modelId: m.id, itemKey: g.k, index: i }));
            });
        });
        return items;
    }, [state.embalagem, state.acessorios, state.funcionalidade, state.modelos, state.filterMode, state.filtroModeloSelecionado]);

    const handleSave = async () => {
        const errors = validate(); dispatch({ type: "SET_ERRORS", value: errors });
        if (Object.keys(errors).length > 0) { toast("error", "Faltam dados obrigatórios."); return; }
        dispatch({ type: "SET_FIELD", field: "isLoading", value: true });
        try {
            const payload: CreateProductDTO = { ean: state.ean.trim(), modeloRef: state.modeloRef.trim(), marca: state.marca, nfs: state.nfs, modelos: state.modelos, embalagem: state.embalagem, acessorios: state.acessorios, estetica: state.modelos.flatMap(m => m.estetica), funcional: state.modelos.flatMap(m => m.funcional), funcionalidade: [...(state.funcionalidade || []), ...state.modelos.flatMap(m => m.funcionalidades)], fotos: state.fotos, manualUrl: state.manualUrl };
            await ProductService.createProduct(payload); toast("success", "Produto salvo!"); if (onSuccess) onSuccess(); onBack();
        } catch (err: any) { console.error(err); toast("error", err?.message || "Erro ao salvar."); } finally { dispatch({ type: "SET_FIELD", field: "isLoading", value: false }); }
    };

    const closeModal = () => dispatch({ type: "CLOSE_MODAL" });

    const renderModal = () => {
        if (!state.activeModal) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-300 border border-white/20">
                    <button onClick={closeModal} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
                    {state.activeModal === "NF" && <NFForm onSave={(nf: ProdutoNF) => { if (state.nfs.some((n: ProdutoNF) => n.codigo === nf.codigo && n.revenda === nf.revenda)) return toast("error", "NF já existe."); dispatch({ type: "ADD_NF", nf }); toast("success", "NF adicionada."); closeModal(); }} />}
                    {state.activeModal === "MODELO_FABRICANTE" && <ModelForm onSave={(modelo: ModeloFabricante) => { dispatch({ type: "ADD_MODELO", modelo }); toast("success", "Modelo criado."); closeModal(); }} />}
                    {["ESTETICA", "FUNCIONAL", "FUNCIONALIDADE_MODELO"].includes(state.activeModal as string) && (
                        <ItemVinculadoForm type={state.activeModal as any} onSave={(item: ItemVinculado) => {
                            if (!state.activeModeloId) return;
                            const propMap: any = { ESTETICA: "estetica", FUNCIONAL: "funcional", FUNCIONALIDADE_MODELO: "funcionalidades" };
                            const prop = propMap[state.activeModal!] as keyof ModeloFabricante;
                            const existingList = getActiveModel()?.[prop] as ItemVinculado[];
                            if (existingList?.some((i: ItemVinculado) => i.nome.toLowerCase() === item.nome.toLowerCase())) return toast("error", "Duplicado.");
                            dispatch({ type: "ADD_ITEM_MODELO", modeloId: state.activeModeloId, itemType: prop as any, item });
                            toast("success", "Item adicionado."); closeModal();
                        }} />
                    )}
                    {["EMBALAGEM", "ACESSORIOS", "FUNCIONALIDADE_MASTER"].includes(state.activeModal as string) && (
                        <GenericItemForm title={state.activeModal === "EMBALAGEM" ? "Adicionar Embalagem" : state.activeModal === "ACESSORIOS" ? "Adicionar Acessório" : "Adicionar Recurso"} label="Descrição do item" onSave={(nome: string) => {
                            const typeMap: any = { EMBALAGEM: "embalagem", ACESSORIOS: "acessorios", FUNCIONALIDADE_MASTER: "funcionalidade" };
                            const field = typeMap[state.activeModal!];
                            dispatch({ type: "ADD_ITEM_MASTER", itemType: field, item: { tipo: field === "acessorios" ? "acessorio" : field, nome } });
                            toast("success", "Adicionado."); closeModal();
                        }} />
                    )}
                    {state.activeModal === "HELP" && <div className="space-y-4"><div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2"><Info size={24} /></div><h3 className="font-black text-xl text-slate-900">Guia Rápido</h3><p className="text-slate-500 text-sm">O sistema vincula um EAN master a múltiplas variações de fabricante. Adicione as peças específicas em cada modelo.</p><Button onClick={closeModal} className="w-full rounded-2xl h-12 font-bold bg-indigo-600 text-white">Entendi</Button></div>}
                    {state.activeModal === "CONFIRM" && <ConfirmModal payload={state.modalData as any} onClose={closeModal} />}
                    {state.activeModal === "EDIT_TEXT" && <EditTextModal payload={state.modalData as any} onClose={closeModal} />}
                </div>
            </div>
        );
    };

    /** ---------- UI Render ---------- */
    return (
        <div className="min-h-screen bg-slate-50 relative">
            <ToastStack toasts={state.toasts} />
            {renderModal()}

            <CameraModal
                open={showCamera}
                onClose={() => setShowCamera(false)}
                onCapture={(file) => { if (cameraTarget) setImageFromFile(cameraTarget, file); toast("success", "Foto capturada."); }}
            />

            {/* Premium Header Container */}
            <header className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="w-14 h-14 rounded-[1.25rem] bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all hover:shadow-xl active:scale-95"
                    >
                        <ArrowLeft size={24} strokeWidth={3} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Novo Produto</h1>
                        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Sincronizado com Supabase
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <Button
                        variant="ghost"
                        onClick={() => dispatch({ type: "OPEN_MODAL", modal: "HELP" })}
                        className="h-14 w-14 rounded-[1.25rem] bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all"
                    >
                        <Info size={22} />
                    </Button>
                    <Button
                        onClick={handleSave}
                        isLoading={state.isLoading}
                        disabled={!isValid}
                        className="flex-1 md:flex-none h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white shadow-2xl shadow-indigo-200 rounded-[1.25rem] px-8 font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <Check size={24} strokeWidth={3} /> SALVAR PRODUTO
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pb-24 space-y-8">

                {/* Validation Error Banner */}
                {Object.keys(state.errors).length > 0 && (
                    <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] flex items-start gap-4 animate-in shake duration-500">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-red-500 shadow-sm"><X size={24} strokeWidth={3} /></div>
                        <div>
                            <h3 className="font-black text-red-900">Campos obrigatórios pendentes</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(state.errors).map(([k, v]) => <span key={k} className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase">{v}</span>)}
                            </div>
                        </div>
                    </div>
                )}

                <section className="grid grid-cols-12 gap-8">
                    {/* Main Data Card */}
                    <div className="col-span-12 lg:col-span-8 bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-white relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-3 h-full bg-indigo-600" />

                        <div className="mb-10 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dados de Identificação</h2>
                                <p className="text-slate-400 font-medium">Informações globais do produto referência.</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400"><Settings2 size={24} /></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">EAN / GTIN Principal</label>
                                <div className="relative group">
                                    <Input
                                        value={state.ean}
                                        onChange={(e) => dispatch({ type: "SET_FIELD", field: "ean", value: e.target.value })}
                                        placeholder="0000000000000"
                                        tabIndex={1}
                                        className={`h-14 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white transition-all text-lg font-mono tracking-wider ${state.errors.ean ? 'border-red-500 bg-red-50' : 'focus:ring-indigo-500/20'}`}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-indigo-400 transition-colors"><Search size={22} /></div>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Marca / Fabricante</label>
                                <Input
                                    value={state.marca}
                                    onChange={(e) => dispatch({ type: "SET_FIELD", field: "marca", value: e.target.value.toUpperCase() })}
                                    placeholder="Ex: PHILCO, LG, SONY"
                                    tabIndex={3}
                                    className="h-14 rounded-2xl border-slate-200 bg-slate-100 font-bold text-slate-900 uppercase tracking-wide cursor-text"
                                />
                            </div>

                            <div className="col-span-full space-y-2.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Modelo Referência (Base)</label>
                                <Input
                                    value={state.modeloRef}
                                    onChange={(e) => {
                                        const v = e.target.value; dispatch({ type: "SET_FIELD", field: "modeloRef", value: v });
                                        const found = ["PHILCO", "LG", "SONY", "SAMSUNG", "PANASONIC", "TCL", "AOC", "BRITÂNIA", "BRITANIA", "HISENSE"].find(b => v.toUpperCase().includes(b));
                                        if (found && !state.marca) dispatch({ type: "SET_FIELD", field: "marca", value: found });
                                    }}
                                    placeholder="Digite a descrição master do produto..."
                                    tabIndex={2}
                                    className={`h-16 rounded-2xl border-slate-200 bg-slate-50 focus:bg-white text-xl font-black text-slate-800 transition-all ${state.errors.modeloRef ? 'border-red-500' : 'focus:ring-indigo-500/20'}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Central de Arquivos Column */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white h-full border border-slate-800">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Arquivos Master</h3>
                                    <p className="text-slate-400 text-xs font-medium mt-1">Componentes de logística.</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-400"><FileJson size={20} /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FileActionBtn icon={FileJson} label="Notas NF" count={state.nfs.length} color="text-indigo-400" onClick={() => dispatch({ type: "OPEN_MODAL", modal: "NF" })} />
                                <FileActionBtn icon={Box} label="Embalagem" count={state.embalagem.length} color="text-amber-400" onClick={() => dispatch({ type: "OPEN_MODAL", modal: "EMBALAGEM" })} />
                                <FileActionBtn icon={Package} label="Acessórios" count={state.acessorios.length} color="text-emerald-400" onClick={() => dispatch({ type: "OPEN_MODAL", modal: "ACESSORIOS" })} />
                                <FileActionBtn icon={Wrench} label="Recursos" count={state.funcionalidade?.length || 0} color="text-sky-400" onClick={() => dispatch({ type: "OPEN_MODAL", modal: "FUNCIONALIDADE_MASTER" })} />

                                <button
                                    onClick={() => fileInputManual.current?.click()}
                                    className={`col-span-2 group flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all ${state.manualUrl ? 'bg-indigo-600 border-indigo-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${state.manualUrl ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-white'}`}>
                                        {state.manualUrl ? <Check size={24} strokeWidth={3} /> : <FileText size={24} />}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Manual do Usuário</div>
                                        <div className="text-sm font-black tracking-tight">{state.manualUrl ? 'PDF VINCULADO' : 'ANEXAR MANUAL PDF'}</div>
                                    </div>
                                    <input type="file" ref={fileInputManual} className="hidden" accept="application/pdf" onChange={handleManualUpload} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Media Preview Section */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: "Foto Principal", field: "fotoProduto" as const, ref: fileInputProduto, icon: ImageIcon, b: "ring-indigo-500", bg: "bg-indigo-500" },
                        { label: "Etiqueta / Série", field: "etiquetaProcel" as const, ref: fileInputProcel, icon: Tag, b: "ring-emerald-500", bg: "bg-emerald-500" },
                        { label: "Kit Completo", field: "fotoKitAcessorio" as const, ref: fileInputKit, icon: Package, b: "ring-amber-500", bg: "bg-amber-500" },
                    ].map(item => {
                        const img = state.imagens[item.field];
                        const Icon = item.icon;
                        return (
                            <div key={item.field} className="group bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.label}</span>
                                    <div className="flex gap-2">
                                        {img.url && <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Check size={16} strokeWidth={3} /></div>}
                                        <button onClick={() => { setCameraTarget(item.field); setShowCamera(true); }} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white transition-all"><Camera size={18} /></button>
                                    </div>
                                </div>

                                <div
                                    onClick={() => !img.url && item.ref.current?.click()}
                                    className={`relative aspect-[16/10] rounded-[2rem] overflow-hidden transition-all duration-500 cursor-pointer ${img.url ? `ring-4 ${item.b} ring-offset-8` : 'bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-white'}`}
                                >
                                    {img.url ? (
                                        <>
                                            <img src={img.url} className="w-full h-full object-cover" alt={item.label} />
                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 backdrop-blur-sm">
                                                <button onClick={(e) => { e.stopPropagation(); item.ref.current?.click(); }} className="w-12 h-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center hover:scale-110 transition-transform shadow-xl"><Settings size={20} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); clearImage(item.field); }} className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-xl"><Trash2 size={20} /></button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-300 group-hover:text-indigo-400 transition-colors gap-3">
                                            <div className={`w-14 h-14 rounded-2xl ${item.bg}/10 flex items-center justify-center ${item.bg.replace('bg-', 'text-')}`}><Upload size={28} /></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Enviar Arquivo</span>
                                            <input type="file" ref={item.ref} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, item.field)} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* Model and Variant Section */}
                <section className="bg-white p-10 rounded-[3rem] shadow-2xl border border-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Variantes de Fabricação</h2>
                            <p className="text-slate-400 font-medium">Modelos cadastrados sob este EAN de referência.</p>
                        </div>

                        {/* Inline Quick Add */}
                        <div className="flex gap-2 bg-slate-50 p-2.5 rounded-[1.5rem] border border-slate-100 flex-wrap items-center">
                            <Input
                                value={state.newModel.nome}
                                onChange={(e) => dispatch({ type: "SET_NEW_MODEL_FIELD", field: "nome", value: e.target.value })}
                                placeholder="NOME DO MODELO"
                                className="bg-white border-none rounded-xl h-11 text-[11px] font-black w-40 focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <select
                                value={state.newModel.categoria}
                                onChange={(e) => dispatch({ type: "SET_NEW_MODEL_FIELD", field: "categoria", value: e.target.value })}
                                className="bg-white border-none rounded-xl h-11 text-[11px] font-black px-4 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">CATEGORIA</option>
                                <option value="TV">TV</option>
                                <option value="AUDIO">ÁUDIO</option>
                                <option value="SMARTPHONE">SMARTPHONE</option>
                                <option value="COZINHA">COZINHA</option>
                            </select>
                            <Button onClick={() => dispatch({ type: "ADD_NEW_MODEL" })} className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-200">
                                <Plus size={22} strokeWidth={3} />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {state.modelos.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm"><Package size={32} /></div>
                                <p className="text-slate-400 font-bold">Nenhum modelo vinculado ainda.</p>
                                <p className="text-slate-300 text-xs mt-1">Use a barra de adição rápida acima.</p>
                            </div>
                        ) : (
                            state.modelos.map(m => {
                                const active = state.activeModeloId === m.id;
                                return (
                                    <div
                                        key={m.id}
                                        onClick={() => dispatch({ type: "SET_ACTIVE_MODELO", id: m.id })}
                                        className={`group p-6 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer flex flex-col justify-between min-h-[200px] hover:-translate-y-1 ${active ? 'bg-white border-indigo-500 shadow-2xl shadow-indigo-100 ring-4 ring-indigo-500/5' : 'bg-slate-50/30 border-slate-100 hover:border-indigo-200 hover:bg-white'}`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{m.categoria || 'GERAL'}</span>
                                                {active && <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />}
                                            </div>
                                            <h4 className={`text-lg font-black tracking-tight leading-tight ${active ? 'text-slate-900' : 'text-slate-600'}`}>{m.nome}</h4>
                                            <p className="text-[10px] font-mono text-slate-400 mt-2 tracking-tighter">{m.id.split('-')[0].toUpperCase()} • {m.codigoTipo || 'S/ RED.'}</p>
                                        </div>

                                        <div className="mt-6 flex items-center gap-2 pt-4 border-t border-slate-100/60">
                                            <button onClick={(e) => { e.stopPropagation(); dispatch({ type: "OPEN_MODAL", modal: "ESTETICA" }); }} className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><ImageIcon size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); dispatch({ type: "OPEN_MODAL", modal: "FUNCIONAL" }); }} className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all"><Wrench size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); dispatch({ type: "OPEN_MODAL", modal: "FUNCIONALIDADE_MODELO" }); }} className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"><Tag size={16} /></button>
                                            <div className="flex-1" />
                                            <button onClick={(e) => { e.stopPropagation(); dispatch({ type: "REMOVE_MODELO", id: m.id }); }} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-300 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* Linked Items List Table */}
                <section className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
                    <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">Itens Vinculados</h2>
                            <p className="text-slate-400 font-medium">Consolidação de todos os componentes do produto.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200 text-[10px] font-black text-slate-500 shadow-sm uppercase tracking-widest">Total: <span className="text-indigo-600 text-sm ml-1">{totalItems}</span></div>
                            <div className="flex p-1.5 bg-slate-200/50 rounded-2xl gap-1">
                                <button onClick={() => dispatch({ type: "SET_FILTER_MODE", value: "MODELO_REF" })} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${state.filterMode === 'MODELO_REF' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-slate-500 hover:bg-white'}`}>TUDO</button>
                                <button onClick={() => dispatch({ type: "SET_FILTER_MODE", value: "MODELO_FABRICANTE" })} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${state.filterMode === 'MODELO_FABRICANTE' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-slate-500 hover:bg-white'}`}>POR MODELO</button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white">
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Item</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo Vinculado</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição / Nome</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {allItems.length === 0 ? (
                                    <tr><td colSpan={5} className="px-10 py-20 text-center text-slate-300 font-bold">Nenhum item cadastrado.</td></tr>
                                ) : (
                                    allItems.map(item => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                                            <td className="px-10 py-5 font-mono text-[10px] text-slate-300 group-hover:text-indigo-400 transition-colors">{String(item.count).padStart(2, '0')}</td>
                                            <td className="px-10 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.badgeColor} shadow-sm`}><item.icon size={14} /></div>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${item.badgeColor.replace('bg-', 'text-').replace('-50', '')}`}>{item.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-5 text-xs font-black text-slate-400 group-hover:text-slate-600 transition-colors">{item.model}</td>
                                            <td className="px-10 py-5 font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{item.name}</td>
                                            <td className="px-10 py-5 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => {
                                                            if (item.origin === "modelo") {
                                                                dispatch({ type: "REMOVE_ITEM_MODELO", modeloId: item.modelId!, itemType: item.itemKey, index: item.index });
                                                            } else {
                                                                dispatch({ type: "REMOVE_ITEM_MASTER", itemType: item.origin, index: item.index });
                                                            }
                                                            toast("info", "Item removido.");
                                                        }}
                                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:shadow-xl transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-8 bg-slate-50/30 border-t border-slate-50 text-center">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Fim da Listagem</p>
                    </div>
                </section>
            </main>
        </div>
    );
}

/** ---------- Sub-components ---------- */

function FileActionBtn({ icon: Icon, label, count, color, onClick }: any) {
    return (
        <button onClick={onClick} className="group p-5 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-left flex flex-col justify-between aspect-square">
            <div className={`w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center ${color} group-hover:scale-110 transition-transform shadow-xl`}>
                <Icon size={24} />
            </div>
            <div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40">{label}</div>
                <div className="text-2xl font-black">{count}</div>
            </div>
        </button>
    );
}

function NFForm({ onSave }: { onSave: (nf: ProdutoNF) => void }) {
    const [data, setData] = useState({ codigo: "", revenda: "" });
    return (
        <div className="space-y-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2"><FileJson size={32} /></div>
            <div><h3 className="text-2xl font-black text-slate-900 leading-none">Dados da NF</h3><p className="text-slate-400 text-sm mt-1">Vincule um código de nota fiscal e revenda.</p></div>
            <div className="space-y-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código NF</label><Input value={data.codigo} onChange={(e) => setData({ ...data, codigo: e.target.value })} placeholder="Ex: 123456" autoFocus className="h-12 rounded-xl" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Revenda</label><Input value={data.revenda} onChange={(e) => setData({ ...data, revenda: e.target.value })} placeholder="Ex: Mercado Livre" className="h-12 rounded-xl" /></div>
                <Button onClick={() => onSave({ codigo: data.codigo.trim(), revenda: data.revenda.trim() })} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all">ADICIONAR NOTA</Button>
            </div>
        </div>
    );
}

function ModelForm({ onSave }: { onSave: (m: ModeloFabricante) => void }) {
    const [data, setData] = useState({ nome: "", categoria: "TV", codigoTipo: "" });
    return (
        <div className="space-y-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2"><Box size={32} /></div>
            <div><h3 className="text-2xl font-black text-slate-900 leading-none">Novo Modelo</h3><p className="text-slate-400 text-sm mt-1">Crie uma variante de fabricante.</p></div>
            <div className="space-y-4">
                <Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} placeholder="Nome/Modelo (Ex: 50UT8050)" autoFocus className="h-12 rounded-xl" />
                <select className="w-full h-12 rounded-xl px-4 text-sm font-bold bg-slate-50 border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" value={data.categoria} onChange={(e) => setData({ ...data, categoria: e.target.value })}>
                    <option value="TV">TV</option><option value="AUDIO">ÁUDIO</option><option value="OUTROS">OUTROS</option>
                </select>
                <Input value={data.codigoTipo} onChange={(e) => setData({ ...data, codigoTipo: e.target.value })} placeholder="Código Reduzido (T/C)" className="h-12 rounded-xl" />
                <Button onClick={() => onSave({ id: uuidv4(), nome: data.nome, categoria: data.categoria, codigoTipo: data.codigoTipo, estetica: [], funcional: [], funcionalidades: [] })} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all">CRIAR MODELO</Button>
            </div>
        </div>
    );
}

function ItemVinculadoForm({ type, onSave }: any) {
    const [nome, setNome] = useState("");
    const label = type === "ESTETICA" ? "PEÇA ESTÉTICA" : type === "FUNCIONAL" ? "PEÇA FUNCIONAL" : "RECURSO / FUNCIONALIDADE";
    const finalType = type === "ESTETICA" ? "estetica" : type === "FUNCIONAL" ? "funcional" : "funcionalidade";

    return (
        <div className="space-y-6 text-center">
            <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto mb-4 animate-bounce border-2 border-indigo-100 shadow-xl shadow-indigo-100/50"><Plus size={40} strokeWidth={3} /></div>
            <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Componente</h3><p className="text-indigo-600 text-[10px] mt-1 font-black uppercase tracking-[0.2em]">{label}</p></div>
            <div className="space-y-4">
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Descrição detalhada do item..." autoFocus className="h-20 rounded-3xl text-center text-xl font-black bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-inner" />
                <Button onClick={() => { if (!nome.trim()) return; onSave({ tipo: finalType, nome: nome.trim() }); }} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg active:scale-95 transition-all shadow-2xl shadow-slate-300">ADICIONAR AO MODELO</Button>
            </div>
        </div>
    );
}


function GenericItemForm({ title, label, onSave }: any) {
    const [v, setV] = useState("");
    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{title}</h3>
            <div className="space-y-4">
                <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={label} autoFocus className="h-14 rounded-2xl" />
                <Button onClick={() => onSave(v)} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-xl"> ADICIONAR ITEM</Button>
            </div>
        </div>
    );
}

function ConfirmModal({ payload, onClose }: any) { return (<div className="space-y-6 text-center pt-4"><div className="w-20 h-20 rounded-[2rem] bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4"><Trash2 size={40} /></div><h3 className="text-2xl font-black text-slate-900">{payload.title}</h3><p className="text-slate-500">{payload.description}</p><div className="flex gap-3 pt-4"><Button onClick={onClose} className="flex-1 h-16 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg">NÃO</Button><Button onClick={payload.onConfirm} className="flex-1 h-16 bg-red-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-200">SIM, REMOVER</Button></div></div>); }
function EditTextModal({ payload, onClose }: any) { const [v, setV] = useState(payload.initialValue); return (<div className="space-y-6 pt-4"><h3 className="text-2xl font-black text-slate-900">{payload.title}</h3><Input value={v} onChange={(e) => setV(e.target.value)} className="h-16 rounded-2xl bg-slate-50 border-slate-200 text-xl font-black" /><div className="flex gap-3"><Button onClick={onClose} className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-2xl font-black">CANCELAR</Button><Button onClick={() => payload.onConfirm(v)} className="flex-1 h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-xl">SALVAR ALTERAÇÕES</Button></div></div>); }
function ToastStack({ toasts }: any) { if (!toasts.length) return null; return (<div className="fixed top-8 right-8 z-[200] space-y-3 w-[380px]">{toasts.map((t: any) => (<div key={t.id} className="bg-white/90 backdrop-blur-md border border-white shadow-2xl rounded-[1.5rem] p-6 flex items-start gap-4 animate-in slide-in-from-right-10 duration-500"><div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{t.type === 'success' ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}</div><div><div className="text-sm font-black text-slate-900 leading-tight">{t.message}</div><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Aviso do Sistema</p></div></div>))}</div>); }
