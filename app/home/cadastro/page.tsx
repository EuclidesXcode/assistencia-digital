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
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useSearchParams } from "next/navigation";
import { ProductService } from "@/backend/services/productService";
import { CreateProductDTO, ModeloFabricante, ProdutoNF, ItemVinculado } from "@/backend/models/Product";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { CameraModal } from "./components/UIComponents";
import { ModalBuscaProduto } from "./components/DomainModals";

/** =========================
 *  Types
 *  ========================= */

type ImageField = "fotoProduto" | "etiquetaProcel" | "fotoKitAcessorio";

type AnexoTipo = "vistaExplodida" | "boletimTecnico" | "manualTecnico";

/** Separado: master vs modelo (evita bug de modal duplicado) */
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
  /** URL para preview (objectURL) */
  url: string | null;
  /** arquivo original (pra upload futuro) */
  file: File | null;
};

interface State {
  // Master Data
  ean: string;
  modeloRef: string;
  marca: string;
  fotos: string[];
  manualUrl: string; // objectURL (preview) — em produção, URL real

  // Master Items
  embalagem: ItemVinculado[];
  acessorios: ItemVinculado[];
  funcionalidade: ItemVinculado[];

  // Lists
  nfs: ProdutoNF[];
  modelos: ModeloFabricante[];

  // UI
  activeModeloId: string | null;
  activeModal: ModalType;
  modalData: ModalData;

  // Filtros
  filterMode: "MODELO_REF" | "MODELO_FABRICANTE";
  filtroModeloSelecionado: string | null;

  // Validation + loading
  errors: Record<string, string>;
  isLoading: boolean;

  // Inline new model
  newModel: { nome: string; categoria: string; codigo: string; linha: string };

  // Images (previews)
  imagens: Record<ImageField, ImageState>;

  // Toasts
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
  | { type: "UPDATE_MODELO"; id: string; field: keyof ModeloFabricante; value: any } // ✅ agora implementado
  | { type: "SET_ACTIVE_MODELO"; id: string | null }
  | { type: "ADD_ITEM_MASTER"; itemType: "embalagem" | "acessorios" | "funcionalidade"; item: ItemVinculado }
  | { type: "REMOVE_ITEM_MASTER"; itemType: "embalagem" | "acessorios" | "funcionalidade"; index: number }
  | {
    type: "ADD_ITEM_MODELO";
    modeloId: string;
    itemType: "estetica" | "funcional" | "funcionalidades";
    item: ItemVinculado;
  }
  | {
    type: "REMOVE_ITEM_MODELO";
    modeloId: string;
    itemType: "estetica" | "funcional" | "funcionalidades";
    index: number;
  }
  | {
    type: "UPDATE_ITEM_MODELO";
    modeloId: string;
    itemType: "estetica" | "funcional" | "funcionalidades";
    index: number;
    newName: string;
  }
  | { type: "OPEN_MODAL"; modal: ModalType; data?: ModalData }
  | { type: "CLOSE_MODAL" }
  | { type: "SET_NEW_MODEL_FIELD"; field: "nome" | "categoria" | "codigo" | "linha"; value: string }
  | { type: "ADD_NEW_MODEL" }
  | { type: "RESET" }
  | { type: "SET_IMAGE"; field: ImageField; value: ImageState }
  | { type: "CLEAR_IMAGE"; field: ImageField }
  | { type: "SET_FILTER_MODE"; value: State["filterMode"] }
  | { type: "SET_FILTRO_MODELO_SELECIONADO"; value: string | null }
  | { type: "LOAD_FROM_DB"; data: any } // ideal: tipar retorno do service
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };

    case "SET_ERRORS":
      return { ...state, errors: action.value };

    case "ADD_NF":
      return { ...state, nfs: [...state.nfs, action.nf] };

    case "REMOVE_NF":
      return { ...state, nfs: state.nfs.filter((_, i) => i !== action.index) };

    case "ADD_MODELO":
      return {
        ...state,
        modelos: [...state.modelos, action.modelo],
        activeModeloId: action.modelo.id,
      };

    case "REMOVE_MODELO": {
      const newModelos = state.modelos.filter((m) => m.id !== action.id);
      return {
        ...state,
        modelos: newModelos,
        activeModeloId: state.activeModeloId === action.id ? newModelos[0]?.id || null : state.activeModeloId,
      };
    }

    case "UPDATE_MODELO":
      return {
        ...state,
        modelos: state.modelos.map((m) => (m.id === action.id ? { ...m, [action.field]: action.value } : m)),
      };

    case "SET_ACTIVE_MODELO":
      return { ...state, activeModeloId: action.id };

    case "ADD_ITEM_MASTER":
      return { ...state, [action.itemType]: [...state[action.itemType], action.item] };

    case "REMOVE_ITEM_MASTER":
      return { ...state, [action.itemType]: state[action.itemType].filter((_, i) => i !== action.index) };

    case "ADD_ITEM_MODELO":
      return {
        ...state,
        modelos: state.modelos.map((m) => {
          if (m.id !== action.modeloId) return m;
          return { ...m, [action.itemType]: [...m[action.itemType], action.item] };
        }),
      };

    case "REMOVE_ITEM_MODELO":
      return {
        ...state,
        modelos: state.modelos.map((m) => {
          if (m.id !== action.modeloId) return m;
          return { ...m, [action.itemType]: m[action.itemType].filter((_, i) => i !== action.index) };
        }),
      };

    case "UPDATE_ITEM_MODELO":
      return {
        ...state,
        modelos: state.modelos.map((m) => {
          if (m.id !== action.modeloId) return m;
          const newList = [...m[action.itemType]];
          if (newList[action.index]) newList[action.index] = { ...newList[action.index], nome: action.newName };
          return { ...m, [action.itemType]: newList };
        }),
      };

    case "OPEN_MODAL":
      return { ...state, activeModal: action.modal, modalData: action.data || {} };

    case "CLOSE_MODAL":
      return { ...state, activeModal: null, modalData: {} };

    case "SET_NEW_MODEL_FIELD":
      return { ...state, newModel: { ...state.newModel, [action.field]: action.value } };

    case "ADD_NEW_MODEL": {
      const nome = state.newModel.nome?.trim();
      if (!nome) return state;

      const newModelo: ModeloFabricante = {
        id: uuidv4(),
        nome,
        categoria: state.newModel.categoria?.trim(),
        codigoTipo: state.newModel.codigo?.trim(),
        // opcional: você tinha "linha" mas não salvava. Aqui eu salvo dentro do modelo via campo extra
        // Se sua interface ModeloFabricante não tem "linha", remova esse cast e o campo de UI.
        ...(state.newModel.linha?.trim() ? ({ linha: state.newModel.linha.trim() } as any) : {}),
        estetica: [],
        funcional: [],
        funcionalidades: [],
      };

      return {
        ...state,
        modelos: [...state.modelos, newModelo],
        activeModeloId: newModelo.id,
        newModel: { nome: "", categoria: "", codigo: "", linha: "" },
      };
    }

    case "RESET":
      return initialState;

    case "SET_IMAGE":
      return { ...state, imagens: { ...state.imagens, [action.field]: action.value } };

    case "CLEAR_IMAGE":
      return { ...state, imagens: { ...state.imagens, [action.field]: { url: null, file: null } } };

    case "SET_FILTER_MODE":
      return {
        ...state,
        filterMode: action.value,
        filtroModeloSelecionado: action.value === "MODELO_REF" ? null : state.filtroModeloSelecionado,
      };

    case "SET_FILTRO_MODELO_SELECIONADO":
      return { ...state, filtroModeloSelecionado: action.value };

    case "LOAD_FROM_DB": {
      const modelos = action.data.modelos || [];
      return {
        ...state,
        ean: action.data.ean || "",
        modeloRef: action.data.modeloRef || "",
        marca: action.data.marca || "",
        manualUrl: action.data.manualUrl || "",
        fotos: action.data.fotos || [],
        nfs: action.data.nfs || [],
        modelos,
        embalagem: action.data.embalagem || [],
        acessorios: action.data.acessorios || [],
        funcionalidade: action.data.funcionalidade || [],
        activeModeloId: modelos[0]?.id ?? null, // ✅ agora ativa um modelo ao carregar
        errors: {},
      };
    }

    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.toast] };

    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    default:
      return state;
  }
}

/** =========================
 *  Page
 *  ========================= */

export default function CadastroProdutoPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q");

  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    ean: q && /^\d+$/.test(q) ? q : initialState.ean
  });

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<ImageField | null>(null);

  // Refs for file inputs
  const fileInputProduto = useRef<HTMLInputElement>(null);
  const fileInputProcel = useRef<HTMLInputElement>(null);
  const fileInputKit = useRef<HTMLInputElement>(null);
  const fileInputManual = useRef<HTMLInputElement>(null);

  // For debounced auto-load by EAN
  const autoLoadRef = useRef("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual objectURL cleanup
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

  /** ---------- Image Upload (objectURL) ---------- */
  const setImageFromFile = (field: ImageField, file: File) => {
    // cleanup previous
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

  /** ---------- Manual Upload (objectURL) ---------- */
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (manualObjectUrlRef.current) URL.revokeObjectURL(manualObjectUrlRef.current);

    const url = URL.createObjectURL(file);
    manualObjectUrlRef.current = url;
    dispatch({ type: "SET_FIELD", field: "manualUrl", value: url });
    toast("success", "Manual PDF anexado para preview.");
  };

  const clearManual = () => {
    if (manualObjectUrlRef.current) {
      URL.revokeObjectURL(manualObjectUrlRef.current);
      manualObjectUrlRef.current = null;
    }
    dispatch({ type: "SET_FIELD", field: "manualUrl", value: "" });
  };

  /** ---------- Auto-fill by EAN ---------- */
  useEffect(() => {
    const ean = state.ean?.trim().toUpperCase();
    if (!ean) return;
    if (autoLoadRef.current === ean) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(async () => {
      autoLoadRef.current = ean;
      try {
        const data = await ProductService.findByEan(ean);
        if (data) {
          dispatch({ type: "LOAD_FROM_DB", data });
          toast("success", "Produto encontrado e carregado.");
        }
      } catch (err) {
        console.error(err);
        toast("error", "Falha ao buscar produto.");
      }
    }, 700);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ean]);

  /** ---------- Cleanup on unmount ---------- */
  useEffect(() => {
    return () => {
      // images
      (Object.keys(state.imagens) as ImageField[]).forEach((k) => {
        const u = state.imagens[k]?.url;
        if (u) URL.revokeObjectURL(u);
      });
      // manual
      if (manualObjectUrlRef.current) URL.revokeObjectURL(manualObjectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ---------- Items list (useMemo) ---------- */
  const totalItems = useMemo(() => {
    const modelCount = state.modelos.reduce(
      (acc, m) => acc + m.estetica.length + m.funcional.length + m.funcionalidades.length,
      0
    );
    return state.embalagem.length + state.acessorios.length + (state.funcionalidade?.length || 0) + modelCount;
  }, [state.embalagem.length, state.acessorios.length, state.funcionalidade, state.modelos]);

  const allItems = useMemo(() => {
    const items: Array<{
      id: string;
      count: number;
      type: string;
      badgeColor: string;
      model: string;
      code: string;
      name: string;
      icon: any;
      origin: "embalagem" | "acessorios" | "funcionalidade" | "modelo";
      index: number;
      modelId?: string;
      itemKey?: "estetica" | "funcional" | "funcionalidades";
    }> = [];

    let count = 0;

    // Master items
    state.embalagem.forEach((item, i) =>
      items.push({
        id: `emb-${i}`,
        count: ++count,
        type: "PACKAGING",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
        model: "-",
        code: "-",
        name: item.nome,
        icon: Box,
        origin: "embalagem",
        index: i,
      })
    );

    state.acessorios.forEach((item, i) =>
      items.push({
        id: `acc-${i}`,
        count: ++count,
        type: "ACCESSORY",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        model: "-",
        code: "-",
        name: item.nome,
        icon: Package,
        origin: "acessorios",
        index: i,
      })
    );

    state.funcionalidade?.forEach((item, i) =>
      items.push({
        id: `fun-${i}`,
        count: ++count,
        type: "FEATURE",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
        model: "-",
        code: "-",
        name: item.nome,
        icon: Wrench,
        origin: "funcionalidade",
        index: i,
      })
    );

    // Model items
    state.modelos.forEach((m) => {
      const modelOk =
        state.filterMode === "MODELO_REF" ||
        (state.filterMode === "MODELO_FABRICANTE" && (!state.filtroModeloSelecionado || state.filtroModeloSelecionado === m.id));

      if (!modelOk) return;

      const groups: Array<{
        list: ItemVinculado[];
        type: string;
        badge: string;
        key: "estetica" | "funcional" | "funcionalidades";
        icon: any;
      }> = [
          { list: m.estetica, type: "ESTÉTICA", badge: "bg-indigo-50 text-indigo-700 border-indigo-100", key: "estetica", icon: ImageIcon },
          { list: m.funcional, type: "FUNCIONAL", badge: "bg-amber-50 text-amber-700 border-amber-100", key: "funcional", icon: Wrench },
          { list: m.funcionalidades, type: "RECURSO", badge: "bg-slate-100 text-slate-700 border-slate-200", key: "funcionalidades", icon: Tag },
        ];

      groups.forEach((g) => {
        g.list.forEach((item, i) => {
          items.push({
            id: `${m.id}-${g.key}-${i}`,
            count: ++count,
            type: g.type,
            badgeColor: g.badge,
            model: m.nome,
            code: m.codigoTipo || "-",
            name: item.nome,
            icon: g.icon,
            origin: "modelo",
            modelId: m.id,
            itemKey: g.key,
            index: i,
          });
        });
      });
    });

    return items;
  }, [state.embalagem, state.acessorios, state.funcionalidade, state.modelos, state.filterMode, state.filtroModeloSelecionado]);

  /** ---------- Save ---------- */
  const handleSave = async () => {
    const errors = validate();
    dispatch({ type: "SET_ERRORS", value: errors });

    if (Object.keys(errors).length > 0) {
      toast("error", "Verifique os campos obrigatórios.");
      return;
    }

    dispatch({ type: "SET_FIELD", field: "isLoading", value: true });

    try {
      const esteticaAgg = state.modelos.flatMap((m) => m.estetica);
      const funcionalAgg = state.modelos.flatMap((m) => m.funcional);
      const funcioAgg = state.modelos.flatMap((m) => m.funcionalidades);

      const payload: CreateProductDTO = {
        ean: state.ean.trim(),
        modeloRef: state.modeloRef.trim(),
        marca: state.marca,
        nfs: state.nfs,
        modelos: state.modelos,
        embalagem: state.embalagem,
        acessorios: state.acessorios,
        estetica: esteticaAgg,
        funcional: funcionalAgg,
        funcionalidade: [...(state.funcionalidade || []), ...funcioAgg],
        fotos: state.fotos,
        manualUrl: state.manualUrl,
      };

      await ProductService.createProduct(payload);

      toast("success", "Produto cadastrado com sucesso!");
      dispatch({ type: "RESET" });
      // limpa manual objectURL (reset limpa state, mas objectURL precisa revogar)
      clearManual();
    } catch (err: any) {
      console.error(err);
      toast("error", err?.message || "Erro ao salvar produto.");
    } finally {
      dispatch({ type: "SET_FIELD", field: "isLoading", value: false });
    }
  };

  /** =========================
   *  Modal rendering
   *  ========================= */

  const closeModal = () => dispatch({ type: "CLOSE_MODAL" });

  const renderModal = () => {
    if (!state.activeModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200 border border-white/30">
          <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>

          {state.activeModal === "NF" && (
            <NFForm
              onSave={(nf) => {
                const exists = state.nfs.some((n) => n.codigo === nf.codigo && n.revenda === nf.revenda);
                if (exists) return toast("error", "Código NF + Revenda já existe.");
                dispatch({ type: "ADD_NF", nf });
                toast("success", "NF adicionada.");
                closeModal();
              }}
            />
          )}

          {state.activeModal === "MODELO_FABRICANTE" && (
            <ModelForm
              onSave={(modelo) => {
                dispatch({ type: "ADD_MODELO", modelo });
                toast("success", "Modelo criado.");
                closeModal();
              }}
            />
          )}

          {(state.activeModal === "ESTETICA" || state.activeModal === "FUNCIONAL" || state.activeModal === "FUNCIONALIDADE_MODELO") && (
            <ItemVinculadoForm
              type={state.activeModal}
              onSave={(item) => {
                if (!state.activeModeloId) return toast("error", "Selecione um modelo para editar.");

                const model = getActiveModel();
                const propMap: Record<string, "estetica" | "funcional" | "funcionalidades"> = {
                  ESTETICA: "estetica",
                  FUNCIONAL: "funcional",
                  FUNCIONALIDADE_MODELO: "funcionalidades",
                };

                const prop = propMap[state.activeModal as string] as "estetica" | "funcional" | "funcionalidades";
                const existingList = (model?.[prop] || []) as ItemVinculado[];

                if (existingList.some((i) => i.nome.toLowerCase() === item.nome.toLowerCase())) {
                  return toast("error", "Item duplicado neste modelo.");
                }

                dispatch({
                  type: "ADD_ITEM_MODELO",
                  modeloId: state.activeModeloId,
                  itemType: prop,
                  item,
                });

                toast("success", "Item adicionado ao modelo.");
                closeModal();
              }}
            />
          )}

          {(state.activeModal === "EMBALAGEM" || state.activeModal === "ACESSORIOS" || state.activeModal === "FUNCIONALIDADE_MASTER") && (
            <GenericItemForm
              title={
                state.activeModal === "EMBALAGEM"
                  ? "Adicionar Embalagem"
                  : state.activeModal === "ACESSORIOS"
                    ? "Adicionar Acessório"
                    : "Adicionar Funcionalidade (Master)"
              }
              label="Nome do Item"
              onSave={(nome) => {
                const itemType =
                  state.activeModal === "EMBALAGEM"
                    ? "embalagem"
                    : state.activeModal === "ACESSORIOS"
                      ? "acessorios"
                      : "funcionalidade";

                dispatch({
                  type: "ADD_ITEM_MASTER",
                  itemType,
                  item: {
                    tipo: itemType === "embalagem" ? "embalagem" : itemType === "acessorios" ? "acessorio" : "funcionalidade",
                    nome,
                  },
                });

                toast("success", "Item adicionado.");
                closeModal();
              }}
            />
          )}

          {state.activeModal === "HELP" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Info size={18} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">Como usar</h3>
                  <p className="text-sm text-slate-500">Passo a passo rápido do cadastro.</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <Step title="1. Pesquisar produto">Clique no ícone de busca ao lado do EAN para localizar registros.</Step>
                <Step title="2. Auto-preenchimento">Ao encontrar, Modelo Referência e Fabricante entram automaticamente.</Step>
                <Step title="3. Modelos fabricante">Crie variantes e depois edite Estética / Funcional / Recurso.</Step>
                <Step title="4. Central de arquivos">Cadastre NF, Embalagem, Acessórios e Funcionalidade master.</Step>
                <Step title="5. Salvar">Campos mínimos: EAN + Modelo Referência + pelo menos 1 modelo fabricante.</Step>
              </div>

              <Button onClick={closeModal} className="w-full rounded-xl">
                Entendi
              </Button>
            </div>
          )}

          {state.activeModal === "EDIT_TEXT" && (
            <EditTextModal payload={state.modalData as EditTextPayload} onClose={closeModal} />
          )}

          {state.activeModal === "CONFIRM" && (
            <ConfirmModal payload={state.modalData as ConfirmPayload} onClose={closeModal} />
          )}

          {state.activeModal === "ITEM_FOTOS" && (
            <div className="space-y-4">
              <h3 className="font-black text-lg text-slate-900">Fotos do item</h3>
              <p className="text-sm text-slate-500">Em breve: upload/galeria por item.</p>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50">
                <Upload className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm text-slate-400">Arraste fotos ou clique para selecionar</p>
                <input type="file" multiple accept="image/*" className="hidden" />
              </div>
              <Button onClick={closeModal} className="w-full rounded-xl">
                Fechar
              </Button>
            </div>
          )}

          {state.activeModal === "MODELO_ANEXOS" && (
            <div className="space-y-4">
              <h3 className="font-black text-lg text-slate-900">Anexos do modelo</h3>
              <p className="text-sm text-slate-500">Aqui você gerencia os anexos técnicos do modelo.</p>

              <div className="space-y-3">
                <AttachmentCard title="Vista Explodida" onUpload={() => toast("info", "Upload em desenvolvimento.")} />
                <AttachmentCard title="Boletim Técnico" onUpload={() => toast("info", "Upload em desenvolvimento.")} />
                <AttachmentCard title="Manual Técnico" onUpload={() => toast("info", "Upload em desenvolvimento.")} />
              </div>

              <Button onClick={closeModal} className="w-full rounded-xl">
                Fechar
              </Button>
            </div>
          )}

          <ModalBuscaProduto
            open={state.activeModal === "SEARCH_PRODUCT"}
            onClose={closeModal}
            onSelect={async (ean) => {
              try {
                const data = await ProductService.findByEan(ean);
                if (data) {
                  dispatch({ type: "LOAD_FROM_DB", data });
                  toast("success", "Produto carregado.");
                }
                closeModal();
              } catch (err) {
                console.error(err);
                toast("error", "Falha ao carregar produto.");
              }
            }}
          />
        </div>
      </div>
    );
  };

  /** =========================
   *  UI
   *  ========================= */

  const canSave = isValid && !state.isLoading;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toasts */}
      <ToastStack toasts={state.toasts} />

      {/* Modals */}
      {renderModal()}

      {/* Camera */}
      <CameraModal
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(file) => {
          if (cameraTarget) {
            setImageFromFile(cameraTarget, file);
            toast("success", "Foto capturada.");
          }
        }}
      />

      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 sm:px-8 pt-8 pb-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Cadastro de Produto</h1>
          <p className="text-slate-500 font-medium text-sm max-w-xs sm:max-w-md mx-auto md:mx-0 mt-1">
            Um Código NF, EAN e Modelo Referência pode estar vinculado a vários Modelos Fabricante.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto justify-center flex-wrap">
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: "OPEN_MODAL", modal: "HELP" })}
            className="text-slate-600 hover:bg-slate-100 rounded-full px-4"
          >
            <Info size={16} className="mr-2" /> Como usar
          </Button>

          <Button
            onClick={handleSave}
            isLoading={state.isLoading}
            disabled={!canSave}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white shadow-lg shadow-indigo-200 rounded-full px-6 font-semibold transition-all active:scale-95"
          >
            <Check size={18} className="mr-2" /> Salvar
          </Button>

          <Button
            variant="outline"
            disabled
            className="rounded-full px-4 border-slate-200 text-slate-400 cursor-not-allowed"
            title="Em desenvolvimento"
          >
            <Play size={16} className="mr-2" /> Simular
          </Button>

          <Button
            variant="ghost"
            onClick={() => dispatch({ type: "RESET" })}
            className="text-slate-500 hover:bg-slate-100 rounded-full px-4"
          >
            <RotateCcw size={16} className="mr-2" /> Limpar
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 pb-20 space-y-8">
        {/* Validation banner */}
        {Object.keys(state.errors).length > 0 && (
          <div className="bg-white rounded-[2rem] shadow-xl border border-red-100 p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 text-red-600">
                <X size={18} />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-900">Faltam dados obrigatórios</h3>
                <p className="text-sm text-slate-500">Corrija os campos marcados em vermelho para salvar.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(state.errors).map(([k, v]) => (
                    <span key={k} className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Master Data (Bento) */}
        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 opacity-80" />

            <div className="mb-8">
              <h2 className="font-black text-xl text-slate-900 mb-1">Dados corporativos</h2>
              <p className="text-slate-400 text-sm">Informações primárias de identificação do produto.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* EAN */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EAN / GTIN</label>
                <div className="relative">
                  <Input
                    value={state.ean}
                    onChange={(e) => dispatch({ type: "SET_FIELD", field: "ean", value: e.target.value })}
                    placeholder="0000000000000"
                    className={`bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-xl h-12 font-mono text-slate-700 pr-12 ${state.errors.ean ? "border-red-500" : ""
                      }`}
                  />
                  {/* Search button removed (redundant) */}
                </div>
                {state.errors.ean && <p className="text-xs text-red-500 font-medium">{state.errors.ean}</p>}
              </div>

              {/* Fabricante */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fabricante</label>
                <div className="relative">
                  <Input
                    value={state.marca}
                    readOnly
                    placeholder="Auto-preenchido"
                    className="bg-slate-100 border-slate-200 rounded-xl h-12 font-bold text-slate-700 uppercase cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-3 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-200/60 text-slate-600">
                    AUTO
                  </span>
                </div>
              </div>

              {/* Modelo Ref */}
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelo Referência</label>
                <div className="relative">
                  <Input
                    value={state.modeloRef}
                    readOnly
                    placeholder="Auto-preenchido via busca"
                    className={`bg-slate-100 border-slate-200 rounded-xl h-12 text-lg font-black text-slate-800 tracking-tight cursor-not-allowed ${state.errors.modeloRef ? "border-red-500" : ""
                      }`}
                  />
                  <span className="absolute right-3 top-3 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-200/60 text-slate-600">
                    AUTO
                  </span>
                </div>
                {state.errors.modeloRef && <p className="text-xs text-red-500 font-medium">{state.errors.modeloRef}</p>}
              </div>
            </div>
          </div>

          {/* Central de arquivos */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-black text-lg text-slate-900">Central de arquivos</h3>
                  <p className="text-xs text-slate-400">Cadastros complementares e anexos.</p>
                </div>
                <div className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                  ITENS: <span className="text-slate-900">{totalItems}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <Button
                  variant="outline"
                  className={`h-auto py-3 justify-start rounded-xl border-slate-200 ${state.nfs.length ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "text-slate-600"
                    }`}
                  onClick={() => dispatch({ type: "OPEN_MODAL", modal: "NF" })}
                >
                  <FileJson size={18} className="mr-2" />
                  <span className="text-[10px] font-bold uppercase">NF ({state.nfs.length})</span>
                </Button>

                <Button
                  variant="outline"
                  className={`h-auto py-3 justify-start rounded-xl border-slate-200 ${state.embalagem.length ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "text-slate-600"
                    }`}
                  onClick={() => dispatch({ type: "OPEN_MODAL", modal: "EMBALAGEM" })}
                >
                  <Box size={18} className="mr-2" />
                  <span className="text-[10px] font-bold uppercase">Embal. ({state.embalagem.length})</span>
                </Button>

                <Button
                  variant="outline"
                  className={`h-auto py-3 justify-start rounded-xl border-slate-200 ${state.acessorios.length ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "text-slate-600"
                    }`}
                  onClick={() => dispatch({ type: "OPEN_MODAL", modal: "ACESSORIOS" })}
                >
                  <Package size={18} className="mr-2" />
                  <span className="text-[10px] font-bold uppercase">Acess. ({state.acessorios.length})</span>
                </Button>

                <Button
                  variant="outline"
                  className={`h-auto py-3 justify-start rounded-xl border-slate-200 ${(state.funcionalidade?.length || 0) ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "text-slate-600"
                    }`}
                  onClick={() => dispatch({ type: "OPEN_MODAL", modal: "FUNCIONALIDADE_MASTER" })}
                >
                  <Wrench size={18} className="mr-2" />
                  <span className="text-[10px] font-bold uppercase">Func. ({state.funcionalidade?.length || 0})</span>
                </Button>

                {/* Manual */}
                <input type="file" ref={fileInputManual} className="hidden" accept="application/pdf" onChange={handleManualUpload} />
                {state.manualUrl ? (
                  <Button
                    variant="outline"
                    className="col-span-2 h-auto py-3 bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 justify-start rounded-xl"
                    onClick={clearManual}
                  >
                    <Check size={18} className="mr-2" /> <span className="text-[10px] font-bold uppercase">Manual OK (clique p/ remover)</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="col-span-2 h-auto py-3 justify-start rounded-xl border-slate-200 text-slate-600 hover:text-slate-900"
                    onClick={() => fileInputManual.current?.click()}
                  >
                    <FileText size={18} className="mr-2" /> <span className="text-[10px] font-bold uppercase">Anexar manual PDF</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Image assets */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Foto Principal", field: "fotoProduto" as const, ref: fileInputProduto, icon: ImageIcon, badge: "bg-indigo-50 text-indigo-700 border-indigo-100" },
            { label: "Etiqueta Procel/Série", field: "etiquetaProcel" as const, ref: fileInputProcel, icon: Tag, badge: "bg-amber-50 text-amber-700 border-amber-100" },
            { label: "Kit Acessórios", field: "fotoKitAcessorio" as const, ref: fileInputKit, icon: Package, badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
          ].map((item) => {
            const has = !!state.imagens[item.field].url;
            const Icon = item.icon;

            return (
              <div key={item.field} className="group relative bg-white p-5 rounded-[2rem] shadow-xl border border-white/30">
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {has && <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${item.badge}`}>OK</span>}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCameraTarget(item.field);
                        setShowCamera(true);
                      }}
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Usar câmera"
                    >
                      <Camera size={16} />
                    </button>
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                      <Icon size={16} />
                    </div>
                  </div>
                </div>

                <input type="file" ref={item.ref} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, item.field)} />

                <div
                  onClick={() => !has && item.ref.current?.click()}
                  className={`relative w-full aspect-video rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${has ? "ring-2 ring-indigo-500 ring-offset-2" : "border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-indigo-300"
                    }`}
                >
                  {has ? (
                    <>
                      <img src={state.imagens[item.field].url!} alt={item.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-white/20 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            item.ref.current?.click();
                          }}
                        >
                          <Settings size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-200 hover:bg-red-500/20 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearImage(item.field);
                            toast("info", "Imagem removida.");
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                      <Upload size={26} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Enviar imagem</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Códigos NF (agora com padrão premium) */}
        <section className="bg-white p-8 rounded-[2rem] shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-700">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="font-black text-lg text-slate-900">Códigos NF</h2>
                <p className="text-xs text-slate-400">Você pode cadastrar sem NF, se necessário.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => dispatch({ type: "OPEN_MODAL", modal: "NF" })} className="rounded-full border-slate-200">
              <Plus size={16} className="mr-1" /> Adicionar
            </Button>
          </div>

          {state.nfs.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-sm">
              Nenhuma NF vinculada.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {state.nfs.map((nf, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <div className="text-sm font-black text-slate-900">{nf.codigo}</div>
                    <div className="text-xs text-slate-500">{nf.revenda}</div>
                  </div>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "OPEN_MODAL",
                        modal: "CONFIRM",
                        data: {
                          title: "Remover NF?",
                          description: `${nf.codigo} • ${nf.revenda}`,
                          confirmLabel: "Remover",
                          onConfirm: () => {
                            dispatch({ type: "REMOVE_NF", index: idx });
                            toast("info", "NF removida.");
                            closeModal();
                          },
                        } satisfies ConfirmPayload,
                      })
                    }
                    className="text-slate-400 hover:text-red-500"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modelos fabricante */}
        <section className="bg-white p-8 rounded-[2rem] shadow-xl">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-xl text-slate-900 mb-1">Variantes de fabricação</h2>
              <p className="text-slate-400 text-sm">Modelos compatíveis e variações técnicas.</p>
              {state.errors.modelos && <p className="text-xs text-red-500 font-medium mt-1">{state.errors.modelos}</p>}
            </div>

            {/* Inline add (melhor responsivo) */}
            <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 flex-wrap">
              <Input
                value={state.newModel.nome}
                onChange={(e) => dispatch({ type: "SET_NEW_MODEL_FIELD", field: "nome", value: e.target.value })}
                placeholder="MODELO"
                className="bg-white border-transparent focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-xs font-black w-36"
              />
              <Input
                value={state.newModel.categoria}
                onChange={(e) => dispatch({ type: "SET_NEW_MODEL_FIELD", field: "categoria", value: e.target.value })}
                placeholder="CAT"
                className="bg-white border-transparent focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-xs font-black w-20"
              />
              <Input
                value={state.newModel.codigo}
                onChange={(e) => dispatch({ type: "SET_NEW_MODEL_FIELD", field: "codigo", value: e.target.value })}
                placeholder="CÓDIGO"
                className="bg-white border-transparent focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-xs font-black w-28"
              />
              <Input
                value={state.newModel.linha}
                onChange={(e) => dispatch({ type: "SET_NEW_MODEL_FIELD", field: "linha", value: e.target.value })}
                placeholder="LINHA"
                className="bg-white border-transparent focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-xs font-black w-24"
              />
              <Button onClick={() => dispatch({ type: "ADD_NEW_MODEL" })} className="bg-slate-900 text-white rounded-xl hover:bg-black">
                <Plus size={16} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.modelos.length === 0 ? (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50">
                <p className="text-slate-500 font-medium">Nenhum modelo cadastrado</p>
              </div>
            ) : (
              state.modelos.map((m) => {
                const isActive = state.activeModeloId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => dispatch({ type: "SET_ACTIVE_MODELO", id: m.id })}
                    className={`relative p-6 rounded-[1.5rem] border transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[170px]
                    ${isActive ? "bg-white border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl" : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg"}`}
                  >
                    {isActive && (
                      <div className="absolute top-4 right-4 text-indigo-500">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-50 border border-indigo-100">
                          <Check size={12} /> ATIVO
                        </span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                            }`}
                        >
                          {m.categoria || "GERAL"}
                        </span>
                        {m.codigoTipo && <span className="text-[10px] font-mono text-slate-400">{m.codigoTipo}</span>}
                      </div>
                      <h3 className={`font-black text-lg ${isActive ? "text-slate-900" : "text-slate-700"} mb-1`}>{m.nome}</h3>
                      {"linha" in (m as any) && (m as any).linha ? (
                        <p className="text-xs text-slate-400 mt-1">Linha: {(m as any).linha}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100/60">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: "OPEN_MODAL", modal: "MODELO_ANEXOS", data: { modeloId: m.id } satisfies ModelAttachmentsPayload });
                        }}
                        className="h-8 px-3 rounded-full bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-100"
                        title="Anexos"
                      >
                        <FileText size={14} className="mr-1" /> Anexos
                      </Button>

                      <div className="flex-1" />

                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({
                            type: "OPEN_MODAL",
                            modal: "EDIT_TEXT",
                            data: {
                              title: "Editar modelo",
                              label: "Nome do modelo",
                              initialValue: m.nome,
                              confirmLabel: "Salvar",
                              onConfirm: (val) => {
                                dispatch({ type: "UPDATE_MODELO", id: m.id, field: "nome", value: val });
                                toast("success", "Modelo atualizado.");
                                closeModal();
                              },
                            } satisfies EditTextPayload,
                          });
                        }}
                        className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full px-3"
                        title="Editar"
                      >
                        <Settings size={14} className="mr-1" /> Editar
                      </Button>

                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({
                            type: "OPEN_MODAL",
                            modal: "CONFIRM",
                            data: {
                              title: "Remover modelo?",
                              description: m.nome,
                              confirmLabel: "Remover",
                              onConfirm: () => {
                                dispatch({ type: "REMOVE_MODELO", id: m.id });
                                toast("info", "Modelo removido.");
                                closeModal();
                              },
                            } satisfies ConfirmPayload,
                          });
                        }}
                        className="text-red-500 hover:bg-red-50 rounded-full px-3"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action bar (modo edição) */}
          {state.activeModeloId && (
            <div className="mt-8 p-6 bg-white border border-slate-200 rounded-[2rem] shadow-xl animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                  <span className="text-slate-900 font-medium text-sm">
                    Editando <span className="text-indigo-600 font-black">{getActiveModel()?.nome}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => dispatch({ type: "SET_ACTIVE_MODELO", id: null })}
                    className="rounded-full text-slate-500 hover:bg-slate-100"
                  >
                    Fechar edição
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:flex md:p-1 gap-3 md:gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    className="h-12 md:h-10 justify-start md:justify-center border-slate-200 text-slate-700 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl"
                    onClick={() => dispatch({ type: "OPEN_MODAL", modal: "ESTETICA" })}
                  >
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs mr-3 md:mr-2 font-black">E</span>
                    Estética
                  </Button>

                  <Button
                    variant="outline"
                    className="h-12 md:h-10 justify-start md:justify-center border-slate-200 text-slate-700 hover:text-amber-700 hover:border-amber-200 hover:bg-amber-50 rounded-xl"
                    onClick={() => dispatch({ type: "OPEN_MODAL", modal: "FUNCIONAL" })}
                  >
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs mr-3 md:mr-2 font-black">F</span>
                    Funcional
                  </Button>

                  <Button
                    variant="outline"
                    className="h-12 md:h-10 justify-start md:justify-center border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 rounded-xl"
                    onClick={() => dispatch({ type: "OPEN_MODAL", modal: "FUNCIONALIDADE_MODELO" })}
                  >
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs mr-3 md:mr-2 font-black">R</span>
                    Recurso
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Itens vinculados */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-black text-xl text-slate-900">Itens vinculados ao produto</h2>
              <p className="text-sm text-slate-400">Unifica itens master e itens por modelo.</p>
            </div>
            <div className="px-4 py-2 bg-slate-50 rounded-full border border-slate-200 text-xs font-mono text-slate-500 self-start md:self-auto">
              TOTAL: <span className="text-slate-900 font-black">{totalItems}</span>
            </div>
          </div>

          {/* Filtros (agora com enum, sem dois toggles ao mesmo tempo) */}
          <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Filtrar:</span>

              <div className="flex gap-2 flex-wrap items-center">
                <button
                  onClick={() => dispatch({ type: "SET_FILTER_MODE", value: "MODELO_REF" })}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${state.filterMode === "MODELO_REF"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    }`}
                >
                  {state.filterMode === "MODELO_REF" ? <Check size={14} className="inline mr-1" /> : null}
                  MODELO REFERÊNCIA
                </button>

                <button
                  onClick={() => dispatch({ type: "SET_FILTER_MODE", value: "MODELO_FABRICANTE" })}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${state.filterMode === "MODELO_FABRICANTE"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    }`}
                >
                  {state.filterMode === "MODELO_FABRICANTE" ? <Check size={14} className="inline mr-1" /> : null}
                  MODELO FABRICANTE
                </button>

                {state.filterMode === "MODELO_FABRICANTE" && state.modelos.length > 0 && (
                  <select
                    value={state.filtroModeloSelecionado || ""}
                    onChange={(e) => dispatch({ type: "SET_FILTRO_MODELO_SELECIONADO", value: e.target.value || null })}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-white border border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">TODOS OS MODELOS</option>
                    {state.modelos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {allItems.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <p className="text-slate-500 font-medium">Nenhum item vinculado.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-black uppercase tracking-wider">
                    <tr>
                      <th className="p-4 border-b border-slate-200">#</th>
                      <th className="p-4 border-b border-slate-200">Tipo</th>
                      <th className="p-4 border-b border-slate-200">Modelo</th>
                      <th className="p-4 border-b border-slate-200">Código</th>
                      <th className="p-4 border-b border-slate-200">Descrição</th>
                      <th className="p-4 border-b border-slate-200 text-center">Preview</th>
                      <th className="p-4 border-b border-slate-200 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {allItems.map((item) => (
                      <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono text-slate-400">{String(item.count).padStart(2, "0")}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase border ${item.badgeColor}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 font-mono text-[10px]">{item.model}</td>
                        <td className="p-4 text-slate-500 font-mono text-[10px]">{item.code}</td>
                        <td className="p-4 font-semibold text-slate-800">{item.name}</td>
                        <td className="p-4 text-center">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            <item.icon size={14} />
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-3">
                            <button
                              className="text-slate-400 hover:text-indigo-600"
                              onClick={() =>
                                dispatch({
                                  type: "OPEN_MODAL",
                                  modal: "ITEM_FOTOS",
                                  data: { itemId: item.id, itemName: item.name } satisfies ItemFotosPayload,
                                })
                              }
                              title="Fotos"
                            >
                              <Camera size={14} />
                            </button>

                            <button
                              className="text-slate-400 hover:text-indigo-600"
                              onClick={() => {
                                if (item.origin !== "modelo") return toast("info", "Edição de master item em breve.");

                                dispatch({
                                  type: "OPEN_MODAL",
                                  modal: "EDIT_TEXT",
                                  data: {
                                    title: "Editar item",
                                    label: "Descrição",
                                    initialValue: item.name,
                                    onConfirm: (val) => {
                                      dispatch({
                                        type: "UPDATE_ITEM_MODELO",
                                        modeloId: item.modelId!,
                                        itemType: item.itemKey!,
                                        index: item.index,
                                        newName: val,
                                      });
                                      toast("success", "Item atualizado.");
                                      closeModal();
                                    },
                                  } satisfies EditTextPayload,
                                });
                              }}
                              title="Editar"
                            >
                              <Settings size={14} />
                            </button>

                            <button
                              className="text-slate-400 hover:text-red-600"
                              onClick={() => {
                                dispatch({
                                  type: "OPEN_MODAL",
                                  modal: "CONFIRM",
                                  data: {
                                    title: "Remover item?",
                                    description: item.name,
                                    confirmLabel: "Remover",
                                    onConfirm: () => {
                                      if (item.origin === "modelo") {
                                        dispatch({
                                          type: "REMOVE_ITEM_MODELO",
                                          modeloId: item.modelId!,
                                          itemType: item.itemKey!,
                                          index: item.index,
                                        });
                                      } else {
                                        dispatch({ type: "REMOVE_ITEM_MASTER", itemType: item.origin, index: item.index });
                                      }
                                      toast("info", "Item removido.");
                                      closeModal();
                                    },
                                  } satisfies ConfirmPayload,
                                });
                              }}
                              title="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {allItems.map((item) => (
                  <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shrink-0 shadow-sm border border-slate-100">
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${item.badgeColor}`}>
                          {item.type}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">#{String(item.count).padStart(2, "0")}</span>
                      </div>
                      <h4 className="font-black text-slate-900 text-sm truncate mb-1">{item.name}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="font-black">MOD:</span> {item.model}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-black">COD:</span> {item.code}
                        </div>
                      </div>
                    </div>

                    <button
                      className="p-2 text-slate-400 hover:text-red-600"
                      onClick={() =>
                        dispatch({
                          type: "OPEN_MODAL",
                          modal: "CONFIRM",
                          data: {
                            title: "Remover item?",
                            description: item.name,
                            confirmLabel: "Remover",
                            onConfirm: () => {
                              if (item.origin === "modelo") {
                                dispatch({
                                  type: "REMOVE_ITEM_MODELO",
                                  modeloId: item.modelId!,
                                  itemType: item.itemKey!,
                                  index: item.index,
                                });
                              } else {
                                dispatch({ type: "REMOVE_ITEM_MASTER", itemType: item.origin, index: item.index });
                              }
                              toast("info", "Item removido.");
                              closeModal();
                            },
                          } satisfies ConfirmPayload,
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Footer tip */}
        <div className="mt-8 flex justify-center text-center">
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            <span className="block text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Validação</span>
            Para salvar: preencha <strong className="text-slate-600">EAN</strong> e <strong className="text-slate-600">Modelo Referência</strong> e cadastre pelo menos{" "}
            <strong className="text-indigo-600">1 Modelo Fabricante</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

/** =========================
 *  Small UI Helpers
 *  ========================= */

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
      <div className="text-xs font-black text-slate-900">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{children}</div>
    </div>
  );
}

function AttachmentCard({ title, onUpload }: { title: string; onUpload: () => void }) {
  return (
    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-black text-slate-800">{title}</span>
        <Button size="sm" variant="outline" className="rounded-full" onClick={onUpload}>
          <Upload size={14} className="mr-1" /> Upload
        </Button>
      </div>
      <p className="text-xs text-slate-400">Nenhum arquivo anexado</p>
    </div>
  );
}

/** =========================
 *  Toasts
 *  ========================= */

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[60] space-y-2 w-[320px] max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-2xl shadow-2xl border p-4 bg-white flex items-start gap-3 animate-in slide-in-from-top-2 duration-200
          ${t.type === "success" ? "border-emerald-100" : t.type === "error" ? "border-red-100" : "border-slate-200"}`}
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border
            ${t.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : t.type === "error" ? "bg-red-50 text-red-700 border-red-100" : "bg-slate-50 text-slate-700 border-slate-200"}`}
          >
            {t.type === "success" ? <Check size={18} /> : t.type === "error" ? <X size={18} /> : <Info size={18} />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">{t.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** =========================
 *  Confirm + Edit modals
 *  ========================= */

function ConfirmModal({ payload, onClose }: { payload: ConfirmPayload; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <h3 className="font-black text-lg text-slate-900">{payload.title}</h3>
      {payload.description && <p className="text-sm text-slate-500">{payload.description}</p>}
      <div className="flex gap-2">
        <Button variant="outline" className="rounded-xl flex-1" onClick={onClose}>
          {payload.cancelLabel || "Cancelar"}
        </Button>
        <Button
          className="rounded-xl flex-1 bg-red-600 hover:bg-red-700 text-white"
          onClick={() => {
            payload.onConfirm();
          }}
        >
          {payload.confirmLabel || "Confirmar"}
        </Button>
      </div>
    </div>
  );
}

function EditTextModal({ payload, onClose }: { payload: EditTextPayload; onClose: () => void }) {
  const [val, setVal] = useState(payload.initialValue || "");

  return (
    <div className="space-y-4">
      <h3 className="font-black text-lg text-slate-900">{payload.title}</h3>
      <div>
        <label className="text-sm font-semibold text-slate-700">{payload.label}</label>
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={payload.placeholder || ""}
          className="mt-2 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="rounded-xl flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          className="rounded-xl flex-1"
          onClick={() => {
            const v = val.trim();
            if (!v) return;
            payload.onConfirm(v);
          }}
        >
          {payload.confirmLabel || "Salvar"}
        </Button>
      </div>
    </div>
  );
}

/** =========================
 *  Forms
 *  ========================= */

function NFForm({ onSave }: { onSave: (nf: ProdutoNF) => void }) {
  const [data, setData] = useState<ProdutoNF>({ codigo: "", revenda: "" });

  return (
    <div className="space-y-4">
      <h3 className="font-black text-lg text-slate-900">Adicionar Código NF</h3>

      <div>
        <label className="text-sm font-semibold text-slate-700">Código NF</label>
        <Input value={data.codigo} onChange={(e) => setData({ ...data, codigo: e.target.value })} autoFocus className="mt-2 rounded-xl" />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Revenda</label>
        <Input value={data.revenda} onChange={(e) => setData({ ...data, revenda: e.target.value })} className="mt-2 rounded-xl" />
      </div>

      <Button
        onClick={() => {
          if (!data.codigo?.trim() || !data.revenda?.trim()) return;
          onSave({ codigo: data.codigo.trim(), revenda: data.revenda.trim() });
        }}
        className="w-full rounded-xl"
      >
        Adicionar
      </Button>
    </div>
  );
}

function ModelForm({ onSave }: { onSave: (m: ModeloFabricante) => void }) {
  const [data, setData] = useState({ nome: "", categoria: "", codigoTipo: "" });

  return (
    <div className="space-y-4">
      <h3 className="font-black text-lg text-slate-900">Novo Modelo Fabricante</h3>

      <div>
        <label className="text-sm font-semibold text-slate-700">Nome / Modelo</label>
        <Input
          value={data.nome}
          onChange={(e) => setData({ ...data, nome: e.target.value })}
          placeholder="Ex: 50UT8050"
          autoFocus
          className="mt-2 rounded-xl"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Categoria</label>
        <select
          className="w-full border border-slate-200 rounded-xl p-3 text-sm mt-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          value={data.categoria}
          onChange={(e) => setData({ ...data, categoria: e.target.value })}
        >
          <option value="">Selecione...</option>
          <option value="TV">TV</option>
          <option value="Audio">Áudio</option>
          <option value="Home Theater">Home Theater</option>
          <option value="Outros">Outros</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Código / Tipo (Opcional)</label>
        <Input value={data.codigoTipo} onChange={(e) => setData({ ...data, codigoTipo: e.target.value })} className="mt-2 rounded-xl" />
      </div>

      <Button
        onClick={() => {
          if (!data.nome?.trim() || !data.categoria?.trim()) return;
          onSave({
            id: uuidv4(),
            nome: data.nome.trim(),
            categoria: data.categoria.trim(),
            codigoTipo: data.codigoTipo.trim(),
            estetica: [],
            funcional: [],
            funcionalidades: [],
          });
        }}
        className="w-full rounded-xl"
      >
        Criar Modelo
      </Button>
    </div>
  );
}

function ItemVinculadoForm({
  type,
  onSave,
}: {
  type: "ESTETICA" | "FUNCIONAL" | "FUNCIONALIDADE_MODELO";
  onSave: (i: ItemVinculado) => void;
}) {
  const [nome, setNome] = useState("");

  const label = type === "ESTETICA" ? "Peça Estética" : type === "FUNCIONAL" ? "Peça Funcional" : "Recurso (Funcionalidade)";

  const tipo: ItemVinculado["tipo"] =
    type === "ESTETICA" ? "estetica" : type === "FUNCIONAL" ? "funcional" : "funcionalidade";

  return (
    <div className="space-y-4">
      <h3 className="font-black text-lg text-slate-900">Adicionar {label}</h3>

      <div>
        <label className="text-sm font-semibold text-slate-700">Descrição</label>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Tampa traseira / HDMI"
          autoFocus
          className="mt-2 rounded-xl"
        />
      </div>

      <Button
        onClick={() => {
          const n = nome.trim();
          if (!n) return;
          onSave({ tipo, nome: n });
        }}
        className="w-full rounded-xl"
      >
        Adicionar
      </Button>
    </div>
  );
}

function GenericItemForm({ title, label, onSave }: { title: string; label: string; onSave: (val: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-4">
      <h3 className="font-black text-lg text-slate-900">{title}</h3>
      <div>
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <Input value={val} onChange={(e) => setVal(e.target.value)} autoFocus className="mt-2 rounded-xl" />
      </div>
      <Button
        onClick={() => {
          const v = val.trim();
          if (!v) return;
          onSave(v);
        }}
        className="w-full rounded-xl"
      >
        Adicionar
      </Button>
    </div>
  );
}
