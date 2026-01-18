"use client";

import { useState, useReducer, useRef } from "react";
import { Plus, Trash2, FileText, Upload, Box, Settings, Check, X, Image as ImageIcon, Play, RotateCcw, Package, Tag, FileJson } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { ProductService } from "@/backend/services/productService";
import { CreateProductDTO, ModeloFabricante, ProdutoNF, ItemVinculado } from "@/backend/models/Product";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

// --- Types & Initial State ---

type ModalType = 'NF' | 'MODELO_FABRICANTE' | 'ESTETICA' | 'FUNCIONAL' | 'FUNCIONALIDADE' | 'EMBALAGEM' | 'ACESSORIOS' | null;

interface State {
  // Master Data
  ean: string;
  modeloRef: string;
  marca: string;
  fotos: string[];
  manualUrl: string;

  // Master Items
  embalagem: ItemVinculado[];
  acessorios: ItemVinculado[];

  // Lists
  nfs: ProdutoNF[];
  modelos: ModeloFabricante[];

  // UI State
  activeModeloId: string | null; // Which model is currently selected/active in the UI
  activeModal: ModalType;
  modalData: any; // Temporary data for the active modal

  errors: Record<string, string>;
  isLoading: boolean;
  newModel: { nome: string, categoria: string, codigo: string };
  // Images
  fotoProduto: string | null;
  etiquetaProcel: string | null;
  fotoKitAcessorio: string | null;
}

const initialState: State = {
  ean: "",
  modeloRef: "",
  marca: "",
  fotos: [],
  manualUrl: "",
  embalagem: [],
  acessorios: [],
  nfs: [],
  modelos: [],
  activeModeloId: null,
  activeModal: null,
  modalData: {},
  errors: {},
  isLoading: false,
  newModel: { nome: '', categoria: '', codigo: '' },
  fotoProduto: null,
  etiquetaProcel: null,
  fotoKitAcessorio: null
};

// --- Reducer ---

type Action =
  | { type: 'SET_FIELD', field: keyof State, value: any }
  | { type: 'ADD_NF', nf: ProdutoNF }
  | { type: 'REMOVE_NF', index: number }
  | { type: 'ADD_MODELO', modelo: ModeloFabricante }
  | { type: 'REMOVE_MODELO', id: string }
  | { type: 'SET_ACTIVE_MODELO', id: string | null }
  | { type: 'ADD_ITEM_MASTER', itemType: 'embalagem' | 'acessorios', item: ItemVinculado }
  | { type: 'REMOVE_ITEM_MASTER', itemType: 'embalagem' | 'acessorios', index: number }
  | { type: 'ADD_ITEM_MODELO', modeloId: string, itemType: 'estetica' | 'funcional' | 'funcionalidades', item: ItemVinculado }
  | { type: 'REMOVE_ITEM_MODELO', modeloId: string, itemType: 'estetica' | 'funcional' | 'funcionalidades', index: number }
  | { type: 'OPEN_MODAL', modal: ModalType, data?: any }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_NEW_MODEL_FIELD', field: 'nome' | 'categoria' | 'codigo', value: string }
  | { type: 'ADD_NEW_MODEL' }
  | { type: 'RESET' }
  | { type: 'SET_IMAGE', field: 'fotoProduto' | 'etiquetaProcel' | 'fotoKitAcessorio', value: string | null }
  | { type: 'UPDATE_ITEM_MODELO', modeloId: string, itemType: 'estetica' | 'funcional' | 'funcionalidades', index: number, newName: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'ADD_NF':
      return { ...state, nfs: [...state.nfs, action.nf] };
    case 'REMOVE_NF':
      return { ...state, nfs: state.nfs.filter((_, i) => i !== action.index) };
    case 'ADD_MODELO':
      return {
        ...state,
        modelos: [...state.modelos, action.modelo],
        activeModeloId: action.modelo.id // Auto-activate new model
      };
    case 'REMOVE_MODELO':
      const newModelos = state.modelos.filter(m => m.id !== action.id);
      return {
        ...state,
        modelos: newModelos,
        activeModeloId: state.activeModeloId === action.id ? (newModelos[0]?.id || null) : state.activeModeloId
      };
    case 'SET_ACTIVE_MODELO':
      return { ...state, activeModeloId: action.id };
    case 'ADD_ITEM_MASTER':
      return {
        ...state,
        [action.itemType]: [...state[action.itemType], action.item]
      };
    case 'REMOVE_ITEM_MASTER':
      return {
        ...state,
        [action.itemType]: state[action.itemType].filter((_, i) => i !== action.index)
      };
    case 'ADD_ITEM_MODELO':
      return {
        ...state,
        modelos: state.modelos.map(m => {
          if (m.id !== action.modeloId) return m;
          return { ...m, [action.itemType]: [...m[action.itemType], action.item] };
        })
      };
    case 'REMOVE_ITEM_MODELO':
      return {
        ...state,
        modelos: state.modelos.map(m => {
          if (m.id !== action.modeloId) return m;
          return { ...m, [action.itemType]: m[action.itemType].filter((_, i) => i !== action.index) };
        })
      };
    case 'UPDATE_ITEM_MODELO':
      return {
        ...state,
        modelos: state.modelos.map(m => {
          if (m.id !== action.modeloId) return m;
          const newList = [...m[action.itemType]];
          if (newList[action.index]) newList[action.index] = { ...newList[action.index], nome: action.newName };
          return { ...m, [action.itemType]: newList };
        })
      };

    case 'OPEN_MODAL':
      return { ...state, activeModal: action.modal, modalData: action.data || {} };
    case 'CLOSE_MODAL':
      return { ...state, activeModal: null, modalData: {} };
    case 'SET_NEW_MODEL_FIELD':
      return { ...state, newModel: { ...state.newModel, [action.field]: action.value } };
    case 'ADD_NEW_MODEL':
      if (!state.newModel.nome) return state; // Basic validation
      const newModelo: ModeloFabricante = {
        id: uuidv4(),
        nome: state.newModel.nome,
        categoria: state.newModel.categoria,
        codigoTipo: state.newModel.codigo,
        estetica: [],
        funcional: [],
        funcionalidades: []
      };
      return {
        ...state,
        modelos: [...state.modelos, newModelo],
        activeModeloId: newModelo.id,
        newModel: { nome: '', categoria: '', codigo: '' } // Reset form
      };
      return initialState;
    case 'SET_IMAGE':
      return { ...state, [action.field]: action.value };
    default:
      return state;
  }
}

// --- Component ---

export default function CadastroProdutoPage() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Refs for File Inputs
  const fileInputProduto = useRef<HTMLInputElement>(null);
  const fileInputProcel = useRef<HTMLInputElement>(null);
  const fileInputKit = useRef<HTMLInputElement>(null);
  const fileInputManual = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'fotoProduto' | 'etiquetaProcel' | 'fotoKitAcessorio') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        dispatch({ type: 'SET_IMAGE', field, value: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, upload file and get URL. Here we simulate with the file name or a fake URL.
      // For PDF preview, we might store a local object URL.
      const url = URL.createObjectURL(file);
      dispatch({ type: 'SET_FIELD', field: 'manualUrl', value: url });
    }
  };

  // Helpers
  const getActiveModel = () => state.modelos.find(m => m.id === state.activeModeloId);

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!state.ean) errors.ean = "EAN é obrigatório";
    if (!state.modeloRef) errors.modeloRef = "Modelo Referência é obrigatório";
    if (state.modelos.length === 0) errors.modelos = "Cadastre pelo menos 1 Modelo Fabricante";

    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_FIELD', field: 'errors', value: errors });
      alert("Verifique os erros antes de salvar.");
      return;
    }

    dispatch({ type: 'SET_FIELD', field: 'isLoading', value: true });

    try {
      const payload: CreateProductDTO = {
        ean: state.ean,
        modeloRef: state.modeloRef,
        marca: state.marca,
        nfs: state.nfs,
        modelos: state.modelos,
        embalagem: state.embalagem,
        acessorios: state.acessorios,
        fotos: state.fotos,
        manualUrl: state.manualUrl
      };

      await ProductService.createProduct(payload);
      alert("Produto cadastrado com sucesso!");
      dispatch({ type: 'RESET' });
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar produto.");
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'isLoading', value: false });
    }
  };

  // --- Modal Logic ---
  const renderModal = () => {
    if (!state.activeModal) return null;

    const closeModal = () => dispatch({ type: 'CLOSE_MODAL' });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
          <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>

          {state.activeModal === 'NF' && (
            <NFForm
              onSave={(nf) => {
                // Validation: Check Duplicates
                const exists = state.nfs.some(n => n.codigo === nf.codigo && n.revenda === nf.revenda);
                if (exists) {
                  alert("Combinação de Código NF e Revenda já existe.");
                  return;
                }
                dispatch({ type: 'ADD_NF', nf });
                closeModal();
              }}
            />
          )}

          {state.activeModal === 'MODELO_FABRICANTE' && (
            <ModelForm
              onSave={(modelo) => {
                dispatch({ type: 'ADD_MODELO', modelo });
                closeModal();
              }}
            />
          )}

          {(state.activeModal === 'ESTETICA' || state.activeModal === 'FUNCIONAL' || state.activeModal === 'FUNCIONALIDADE') && (
            <ItemVinculadoForm
              type={state.activeModal}
              onSave={(item) => {
                if (state.activeModeloId) {
                  // Validation: Check Duplicates within Model
                  const model = getActiveModel();
                  // Mapping modal type to model property
                  const propMap = {
                    'ESTETICA': 'estetica',
                    'FUNCIONAL': 'funcional',
                    'FUNCIONALIDADE': 'funcionalidades'
                  } as const;
                  const prop = propMap[state.activeModal as 'ESTETICA' | 'FUNCIONAL' | 'FUNCIONALIDADE'];

                  const existingList = model?.[prop] as ItemVinculado[];

                  if (existingList.some(i => i.nome === item.nome)) {
                    alert("Item duplicado neste modelo.");
                    return;
                  }

                  dispatch({
                    type: 'ADD_ITEM_MODELO',
                    modeloId: state.activeModeloId,
                    itemType: prop,
                    item
                  });
                }
                closeModal();
              }}
            />
          )}

          {(state.activeModal === 'EMBALAGEM' || state.activeModal === 'ACESSORIOS') && (
            <GenericItemForm
              title={state.activeModal === 'EMBALAGEM' ? 'Adicionar Embalagem' : 'Adicionar Acessório'}
              label="Nome do Item"
              onSave={(nome) => {
                dispatch({
                  type: 'ADD_ITEM_MASTER',
                  itemType: state.activeModal === 'EMBALAGEM' ? 'embalagem' : 'acessorios',
                  item: { tipo: state.activeModal === 'EMBALAGEM' ? 'embalagem' : 'acessorio', nome }
                });
                closeModal();
              }}
            />
          )}

          {/* Item Master Form Logic can be reused or handled inline for 'embalagem'/'acessorios' */}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {renderModal()}

      <div className="min-h-screen bg-slate-50 pb-32">
        {/* --- Header (Static) --- */}
        {/* --- Header (Static) --- */}
        <header className="max-w-7xl mx-auto px-8 pt-8 pb-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Cadastro de Produto</h1>
            <p className="text-slate-500 font-medium text-sm max-w-xs sm:max-w-md mx-auto md:mx-0 mt-1">Um Código NF, EAN e Modelo Referência pode estar vinculado a vários Modelos Fabricante</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto justify-center">
            <Button onClick={handleSave} isLoading={state.isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-full px-6 font-semibold transition-all hover:scale-105 active:scale-95 flex-1 md:flex-none justify-center">
              <Check size={18} className="mr-2" /> Salvar Alterações
            </Button>
            <Button variant="outline" onClick={() => dispatch({ type: 'RESET' })} className="text-slate-500 hover:bg-slate-100 rounded-full px-4 border-slate-200 hover:text-slate-900">
              <RotateCcw size={16} className="mr-2" /> Limpar
            </Button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-8 space-y-8">

          {/* --- Master Data (Bento Grid) --- */}
          <section className="grid grid-cols-12 gap-6">
            {/* Card 1: Basic Info (8 cols) */}
            <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-[2rem] shadow-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="mb-8">
                <h2 className="font-bold text-xl text-slate-900 mb-1">Dados Corporativos</h2>
                <p className="text-slate-400 text-sm">Informações primárias de identificação do produto.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EAN / GTIN</label>
                  <Input
                    value={state.ean}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'ean', value: e.target.value })}
                    placeholder="0000000000000"
                    className={`bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-xl h-12 font-mono text-slate-700 ${state.errors.ean ? 'border-red-500' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fabricante</label>
                  <Input
                    value={state.marca}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'marca', value: e.target.value })}
                    placeholder="PHILCO"
                    className="bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-xl h-12 font-bold text-slate-700 uppercase"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelo Referência</label>
                  <Input
                    value={state.modeloRef}
                    onChange={(e) => {
                      const val = e.target.value;
                      dispatch({ type: 'SET_FIELD', field: 'modeloRef', value: val });
                      if (val.toLowerCase().includes('philco')) dispatch({ type: 'SET_FIELD', field: 'marca', value: 'Philco' });
                      else if (val.toLowerCase().includes('samsung')) dispatch({ type: 'SET_FIELD', field: 'marca', value: 'Samsung' });
                    }}
                    placeholder="Ex: TV PH50..."
                    className={`bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-xl h-12 text-lg font-bold text-slate-800 tracking-tight ${state.errors.modeloRef ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Actions & Manual (4 cols) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
              {/* Quick Actions Card */}
              <div className="bg-white p-8 rounded-[2rem] shadow-xl flex-1 flex flex-col justify-center items-start relative overflow-hidden">
                <h3 className="font-bold text-lg mb-4 text-slate-900">Central de Arquivos</h3>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <Button variant="outline" className="h-auto py-3 justify-start rounded-xl border-slate-200 text-slate-500 hover:text-slate-700" onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'NF' })}>
                    <FileJson size={18} className="mr-2" /> <span className="text-xs">NFs</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 justify-start rounded-xl border-slate-200 text-slate-500 hover:text-slate-700" onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'EMBALAGEM' })}>
                    <Box size={18} className="mr-2" /> <span className="text-xs">Pack</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 justify-start rounded-xl border-slate-200 text-slate-500 hover:text-slate-700" onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'ACESSORIOS' })}>
                    <Package size={18} className="mr-2" /> <span className="text-xs">Kit</span>
                  </Button>

                  {/* Manual Upload Button */}
                  <input type="file" ref={fileInputManual} className="hidden" accept="application/pdf" onChange={handleManualUpload} />
                  {state.manualUrl ? (
                    <Button variant="outline" className="h-auto py-3 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 justify-start rounded-xl" onClick={() => dispatch({ type: 'SET_FIELD', field: 'manualUrl', value: '' })}>
                      <Check size={18} className="mr-2" /> <span className="text-xs">PDF OK</span>
                    </Button>
                  ) : (
                    <Button variant="outline" className="h-auto py-3 justify-start rounded-xl border-slate-200 text-slate-500 hover:text-slate-700" onClick={() => fileInputManual.current?.click()}>
                      <FileText size={18} className="mr-2" /> <span className="text-xs">Manual</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* --- Image Assets (Interactive Cards) --- */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Foto Principal', field: 'fotoProduto', ref: fileInputProduto, icon: ImageIcon, color: 'text-indigo-500' },
              { label: 'Etiqueta Procel/Série', field: 'etiquetaProcel', ref: fileInputProcel, icon: Tag, color: 'text-amber-500' },
              { label: 'Kit Acessórios', field: 'fotoKitAcessorio', ref: fileInputKit, icon: Package, color: 'text-emerald-500' }
            ].map((item, idx) => (
              <div key={idx} className="group relative bg-white p-4 rounded-[2rem] shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                  <item.icon size={16} className={item.color} />
                </div>

                <input type="file" ref={item.ref as any} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, item.field as any)} />

                {/* Image Preview Area */}
                <div
                  onClick={() => !(state as any)[item.field] && item.ref.current?.click()}
                  className={`
                   relative w-full aspect-video rounded-2xl overflow-hidden cursor-pointer transition-all duration-300
                   ${(state as any)[item.field] ? 'ring-2 ring-indigo-500 ring-offset-2' : 'border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-indigo-300'}
                 `}
                >
                  {(state as any)[item.field] ? (
                    <>
                      <img src={(state as any)[item.field]} alt={item.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={(e) => { e.stopPropagation(); item.ref.current?.click(); }}>
                          <Settings size={16} />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/20 rounded-full" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_IMAGE', field: item.field as any, value: null }); }}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                      <Upload size={24} />
                      <span className="text-[10px] font-medium uppercase">Upload Imagem</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>



          {/* --- Códigos NF (Lista) --- */}
          <section className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-600" />
                <h2 className="font-semibold text-lg text-slate-800">Códigos NF</h2>
              </div>
              <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'NF' })}>
                <Plus size={16} className="mr-1" /> Adicionar NF
              </Button>
            </div>

            {state.nfs.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500 text-sm">
                Nenhuma NF vinculada. O produto pode ser cadastrado sem NF se necessário.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {state.nfs.map((nf, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{nf.codigo}</div>
                      <div className="text-xs text-slate-500">{nf.revenda}</div>
                    </div>
                    <button onClick={() => dispatch({ type: 'REMOVE_NF', index: idx })} className="text-slate-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* --- Modelos Fabricante vinculados (Grid View) --- */}
          <section className="bg-slate-50 p-0 mb-8">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl">
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-xl text-slate-900 mb-1">Variantes de Fabricação</h2>
                  <p className="text-slate-400 text-sm">Modelos compatíveis e suas variações técnicas.</p>
                </div>
                {/* Inline Add Form */}
                <div className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <Input
                    value={state.newModel.nome}
                    onChange={(e) => dispatch({ type: 'SET_NEW_MODEL_FIELD', field: 'nome', value: e.target.value })}
                    placeholder="NOVO MODELO"
                    className="bg-white border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-lg text-xs font-bold w-40"
                  />
                  <Input
                    value={state.newModel.categoria}
                    onChange={(e) => dispatch({ type: 'SET_NEW_MODEL_FIELD', field: 'categoria', value: e.target.value })}
                    placeholder="CAT"
                    className="bg-white border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-lg text-xs font-bold w-20"
                  />
                  <Button onClick={() => dispatch({ type: 'ADD_NEW_MODEL' })} className="bg-slate-900 text-white rounded-lg hover:bg-black">
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.modelos.length === 0 ? (
                  <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                    <p className="text-slate-400 font-medium">Nenhum modelo cadastrado</p>
                  </div>
                ) : (
                  state.modelos.map((m, idx) => {
                    const isActive = state.activeModeloId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => dispatch({ type: 'SET_ACTIVE_MODELO', id: m.id })}
                        className={`
                      relative p-6 rounded-[1.5rem] border transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[160px]
                      ${isActive
                            ? 'bg-white border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl scale-[1.02] z-10'
                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg'
                          }
                    `}
                      >
                        {isActive && <div className="absolute top-4 right-4 text-indigo-500"><Check size={20} className="bg-indigo-50 rounded-full p-1" /></div>}

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                              {m.categoria || 'GERAL'}
                            </span>
                            {m.codigoTipo && <span className="text-[10px] font-mono text-slate-400">{m.codigoTipo}</span>}
                          </div>
                          <h3 className={`font-black text-lg ${isActive ? 'text-slate-900' : 'text-slate-700'} mb-1`}>{m.nome}</h3>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100/50">
                          <Button variant="ghost" size="xs" className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-100"><Upload size={14} /></Button>
                          <Button variant="ghost" size="xs" className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-100"><FileText size={14} /></Button>
                          <div className="flex-1" />
                          <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_MODELO', id: m.id }); }} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full px-2">Remover</Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dynamic Action Bar */}
              {/* Dynamic Action Bar */}
              {state.activeModeloId && (
                <div className="mt-8 p-6 md:p-1 bg-white border border-slate-200 rounded-[2rem] md:rounded-2xl shadow-xl animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-0">
                    <div className="md:px-6 md:py-3 flex items-center gap-3">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                      <span className="text-slate-900 font-medium text-sm">Editando <span className="text-indigo-600 font-bold">{state.modelos.find(m => m.id === state.activeModeloId)?.nome}</span></span>
                    </div>
                    <div className="grid grid-cols-1 md:flex md:p-1 gap-3 md:gap-1 w-full md:w-auto">
                      <Button variant="outline" className="h-12 md:h-10 justify-start md:justify-center border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl" onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'ESTETICA' })}>
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs mr-3 md:mr-2 font-bold">E</span> Estética
                      </Button>
                      <Button variant="outline" className="h-12 md:h-10 justify-start md:justify-center border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 rounded-xl" onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'FUNCIONAL' })}>
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs mr-3 md:mr-2 font-bold">F</span> Funcional
                      </Button>
                      <Button variant="outline" className="h-12 md:h-10 justify-start md:justify-center border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-xl" onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'FUNCIONALIDADE' })}>
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs mr-3 md:mr-2 font-bold">R</span> Recurso
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* --- Itens vinculados ao produto (Map Structure) --- */}
          <section className="bg-white p-4 md:p-8 rounded-[2rem] shadow-xl mb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="font-bold text-xl text-slate-900">Itens vinculados ao produto</h2>
                <p className="text-sm text-slate-400">Unifica embalagem, acessórios, estética, funcional e funcionalidades (com miniatura de foto).</p>
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-full border border-slate-200 text-xs font-mono text-slate-500 self-start md:self-auto">
                TOTAL ITEMS: <span className="text-slate-900 font-bold">{state.embalagem.length + state.acessorios.length + state.modelos.reduce((acc, m) => acc + m.estetica.length + m.funcional.length + m.funcionalidades.length, 0)}</span>
              </div>
            </div>

            {/* Preparation of Data List for rendering */}
            {(() => {
              const allItems: any[] = [];
              let count = 0;
              // Embalagem
              state.embalagem.forEach((item, i) => allItems.push({
                id: `emb-${i}`, count: ++count, type: 'PACKAGING', badgeColor: 'bg-amber-50 text-amber-600 border-amber-100',
                model: '-', code: '-', name: item.nome, icon: Box, origin: 'embalagem', index: i
              }));
              // Acessorios
              state.acessorios.forEach((item, i) => allItems.push({
                id: `acc-${i}`, count: ++count, type: 'ACCESSORY', badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                model: '-', code: '-', name: item.nome, icon: Package, origin: 'acessorios', index: i
              }));
              // Model Items
              state.modelos.forEach(m => {
                [
                  { list: m.estetica, type: 'ESTETICA', badge: 'bg-indigo-50 text-indigo-600 border-indigo-100', key: 'estetica' as const },
                  { list: m.funcional, type: 'FUNCIONAL', badge: 'bg-indigo-50 text-indigo-600 border-indigo-100', key: 'funcional' as const },
                  { list: m.funcionalidades, type: 'RECURSO', badge: 'bg-slate-100 text-slate-600 border-slate-200', key: 'funcionalidades' as const }
                ].forEach(t => {
                  t.list.forEach((item, i) => allItems.push({
                    id: `${m.id}-${t.type}-${i}`, count: ++count, type: t.type, badgeColor: t.badge,
                    model: m.nome, code: 'N/A', name: item.nome, icon: ImageIcon, origin: 'modelo', modelId: m.id, itemKey: t.key, index: i
                  }));
                });
              });

              if (allItems.length === 0) {
                return (
                  <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-400 font-medium">Nenhum item vinculado à estrutura.</p>
                  </div>
                );
              }

              return (
                <>
                  {/* --- Desktop View (Table) --- */}
                  <div className="hidden md:block overflow-x-auto rounded-2xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-4 border-b border-slate-200">#</th>
                          <th className="p-4 border-b border-slate-200">Tipo Logístico</th>
                          <th className="p-4 border-b border-slate-200">Modelo Ref.</th>
                          <th className="p-4 border-b border-slate-200">Código</th>
                          <th className="p-4 border-b border-slate-200">Descrição Técnica</th>
                          <th className="p-4 border-b border-slate-200 text-center">Preview</th>
                          <th className="p-4 border-b border-slate-200 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {allItems.map((item) => (
                          <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-mono text-slate-400">{String(item.count).padStart(2, '0')}</td>
                            <td className="p-4"><span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${item.badgeColor}`}>{item.type}</span></td>
                            <td className="p-4 text-slate-400 font-mono text-[10px]">{item.model}</td>
                            <td className="p-4 text-slate-400 font-mono text-[10px]">{item.code}</td>
                            <td className="p-4 font-medium text-slate-700">{item.name}</td>
                            <td className="p-4 text-center"><div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center mx-auto text-slate-300"><item.icon size={14} /></div></td>
                            <td className="p-4 text-right">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                <button className="text-slate-400 hover:text-indigo-600" onClick={() => {
                                  if (item.origin === 'modelo') {
                                    const newName = prompt("Editar nome:", item.name);
                                    if (newName && newName.trim() !== "") {
                                      dispatch({ type: 'UPDATE_ITEM_MODELO', modeloId: item.modelId, itemType: item.itemKey, index: item.index, newName });
                                    }
                                  } else {
                                    alert("Edição de Master Data em breve.");
                                  }
                                }}><Settings size={14} /></button>
                                <button className="text-slate-400 hover:text-red-600" onClick={() => {
                                  if (item.origin === 'modelo') {
                                    if (confirm("Remover este item?")) dispatch({ type: 'REMOVE_ITEM_MODELO', modeloId: item.modelId, itemType: item.itemKey, index: item.index });
                                  }
                                  else dispatch({ type: 'REMOVE_ITEM_MASTER', itemType: item.origin, index: item.index });
                                }}><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* --- Mobile View (Cards) --- */}
                  <div className="md:hidden space-y-3">
                    {allItems.map((item) => (
                      <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-300 shrink-0 shadow-sm border border-slate-100">
                          <item.icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${item.badgeColor}`}>{item.type}</span>
                            <span className="font-mono text-[10px] text-slate-400">#{String(item.count).padStart(2, '0')}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm truncate mb-1">{item.name}</h4>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500">
                            <div className="flex items-center gap-1"><span className="font-bold">MOD:</span> {item.model}</div>
                            <div className="flex items-center gap-1"><span className="font-bold">COD:</span> {item.code}</div>
                          </div>
                        </div>
                        <button className="p-2 text-slate-300 hover:text-red-500" onClick={() => {
                          if (item.origin === 'modelo') {
                            if (confirm("Remover item?")) dispatch({ type: 'REMOVE_ITEM_MODELO', modeloId: item.modelId, itemType: item.itemKey, index: item.index });
                          }
                          else dispatch({ type: 'REMOVE_ITEM_MASTER', itemType: item.origin, index: item.index });
                        }}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </section>

          {/* Footer / Validation Tip */}
          <div className="mt-8 flex justify-center text-center">
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              <span className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">Validação de Cadastro</span>
              Para salvar: Preencha <strong className="text-slate-500">EAN / GTIN</strong> e <strong className="text-slate-500">Modelo Referência</strong>. Cadastre pelo menos <strong className="text-indigo-500">1 Modelo Fabricante</strong> e <strong className="text-indigo-500">1 Acessório</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponentes (Forms Modais) ---

function NFForm({ onSave }: { onSave: (nf: ProdutoNF) => void }) {
  const [data, setData] = useState<ProdutoNF>({ codigo: '', revenda: '' });
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Adicionar Código NF</h3>
      <div>
        <label className="text-sm">Código NF</label>
        <Input value={data.codigo} onChange={e => setData({ ...data, codigo: e.target.value })} autoFocus />
      </div>
      <div>
        <label className="text-sm">Revenda</label>
        <Input value={data.revenda} onChange={e => setData({ ...data, revenda: e.target.value })} />
      </div>
      <Button onClick={() => {
        if (!data.codigo || !data.revenda) return alert("Preencha ambos os campos");
        onSave(data);
      }} className="w-full">Adicionar</Button>
    </div>
  );
}

function ModelForm({ onSave }: { onSave: (m: ModeloFabricante) => void }) {
  const [data, setData] = useState({ nome: '', categoria: '', codigoTipo: '' });
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Novo Modelo Fabricante</h3>
      <div>
        <label className="text-sm">Nome / Modelo</label>
        <Input value={data.nome} onChange={e => setData({ ...data, nome: e.target.value })} placeholder="Ex: 50UT8050" autoFocus />
      </div>
      <div>
        <label className="text-sm">Categoria</label>
        <select
          className="w-full border rounded-md p-2 text-sm"
          value={data.categoria}
          onChange={e => setData({ ...data, categoria: e.target.value })}
        >
          <option value="">Selecione...</option>
          <option value="TV">TV</option>
          <option value="Audio">Áudio</option>
          <option value="Home Theater">Home Theater</option>
          <option value="Outros">Outros</option>
        </select>
      </div>
      <div>
        <label className="text-sm">Código / Tipo (Opcional)</label>
        <Input value={data.codigoTipo} onChange={e => setData({ ...data, codigoTipo: e.target.value })} />
      </div>
      <Button onClick={() => {
        if (!data.nome || !data.categoria) return alert("Nome e Categoria obrigatórios");
        onSave({
          id: uuidv4(),
          ...data,
          estetica: [],
          funcional: [],
          funcionalidades: []
        });
      }} className="w-full">Criar Modelo</Button>
    </div>
  );
}

function ItemVinculadoForm({ type, onSave }: { type: string, onSave: (i: ItemVinculado) => void }) {
  const [nome, setNome] = useState('');
  const label = type === 'ESTETICA' ? 'Peça Estética' : (type === 'FUNCIONAL' ? 'Peça Funcional' : 'Funcionalidade');

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Adicionar {label}</h3>
      <div>
        <label className="text-sm">Descrição</label>
        <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Tampa Traseira / HDMI" autoFocus />
      </div>
      <Button onClick={() => {
        if (!nome) return;
        onSave({
          tipo: type === 'FUNCIONALIDADE' ? 'funcionalidade' : (type === 'ESTETICA' ? 'estetica' : 'funcional'),
          nome
        });
      }} className="w-full">Adicionar</Button>
    </div>
  );
}

function GenericItemForm({ title, label, onSave }: { title: string, label: string, onSave: (val: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">{title}</h3>
      <div>
        <label className="text-sm">{label}</label>
        <Input value={val} onChange={e => setVal(e.target.value)} autoFocus />
      </div>
      <Button onClick={() => {
        if (!val) return;
        onSave(val);
      }} className="w-full">Adicionar</Button>
    </div>
  );
}
