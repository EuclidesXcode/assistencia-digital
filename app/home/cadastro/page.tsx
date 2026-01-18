
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    BookOpen,
    Cable,
    Image as ImageIcon,
    Package as PackageIcon,
    Paperclip,
    Plus,
    Receipt,
    Search,
    Sparkles,
    Tag,
    FileText,
    X
} from "lucide-react";

import { IconBtn, CountPill, ModalArquivos, FileMeta } from "./components/UIComponents";
import {
    ModalCodigosNF,
    ModalRevendasClientes,
    ModalPecas,
    ModalEanGtins,
    Master,
    CodigoNF,
    PecaBase,
    ModeloFabricante
} from "./components/DomainModals";
import { ProductService } from "@/backend/services/productService";

// --- Types needed locally for state ---
type ProdutoDocKey = "fotoProduto" | "etiquetaProcel" | "kitAcessorio" | "manualUsuario";
type ModeloDocKey = "vistaExplodida" | "boletimTecnico" | "manualTecnico";

type ModalArquivosKey =
    | { kind: "produto"; doc: ProdutoDocKey }
    | { kind: "modelo"; modeloId: number; doc: ModeloDocKey }
    | { kind: "item"; rowKey: string; title: string };

const norm = (s: any) => String(s || "").trim();
const upper = (s: any) => norm(s).toUpperCase();
const USUARIO_ATUAL = "EDUARDO"; // Placeholder
const agoraBR = () => new Date().toLocaleDateString("pt-BR");

const CadastroNF_EAN_Modelo = () => {
    // Master State
    const [master, setMaster] = useState<Master>({ ean: "", modeloReferencia: "", fabricante: "" });
    const [mensagem, setMensagem] = useState("");
    const [registros, setRegistros] = useState<any[]>([]); // Simulation of local DB

    // Auto-fill logic
    const autoLoadRef = useRef("");
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Modals Visibility
    const [mostrarLookupEAN, setMostrarLookupEAN] = useState(false);
    const [mostrarPopupNF, setMostrarPopupNF] = useState(false);
    const [mostrarLookupRevenda, setMostrarLookupRevenda] = useState(false);
    const [mostrarPopupEmbalagem, setMostrarPopupEmbalagem] = useState(false);
    const [mostrarPopupAcessorios, setMostrarPopupAcessorios] = useState(false);
    const [mostrarPopupEstetica, setMostrarPopupEstetica] = useState(false);
    const [mostrarPopupFuncionalPeca, setMostrarPopupFuncionalPeca] = useState(false);
    const [mostrarPopupFuncionalidade, setMostrarPopupFuncionalidade] = useState(false);

    // Data States
    const [codigosNF, setCodigosNF] = useState<CodigoNF[]>([]);
    const [nfAtual, setNfAtual] = useState("");
    const [revendaNFAtual, setRevendaNFAtual] = useState("");
    const [mensagemNF, setMensagemNF] = useState("");

    const [embalagens, setEmbalagens] = useState<PecaBase[]>([]);
    const [formEmbalagem, setFormEmbalagem] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });
    const [mensagemEmbalagem, setMensagemEmbalagem] = useState("");

    const [acessorios, setAcessorios] = useState<PecaBase[]>([]);
    const [formAcessorio, setFormAcessorio] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });

    const [esteticas, setEsteticas] = useState<PecaBase[]>([]);
    const [formEstetica, setFormEstetica] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });

    const [funcionaisPeca, setFuncionaisPeca] = useState<PecaBase[]>([]);
    const [formFuncionaisPeca, setFormFuncionaisPeca] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });

    const [funcionalidades, setFuncionalidades] = useState<PecaBase[]>([]);
    const [formFuncionalidade, setFormFuncionalidade] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });

    const [modelosFabricante, setModelosFabricante] = useState<ModeloFabricante[]>([]);
    const [modeloSelecionadoId, setModeloSelecionadoId] = useState<number | null>(null);

    const [produtoDocs, setProdutoDocs] = useState<Record<ProdutoDocKey, FileMeta[]>>({
        fotoProduto: [], etiquetaProcel: [], kitAcessorio: [], manualUsuario: []
    });

    const [arquivosCtx, setArquivosCtx] = useState<ModalArquivosKey | null>(null);

    // --- Logic ---

    // DATABASE LOOKUP
    const fetchProductByEan = async (ean: string) => {
        setMensagem("Buscando EAN no banco de dados...");
        try {
            // Using Service directly instead of API route for consistency
            const data = await ProductService.findByEan(ean);

            if (data) {
                carregarRegistroDoBanco(data);
            } else {
                setMensagem("EAN não encontrado no banco (Novo cadastro).");
            }
        } catch (e: any) {
            console.error(e);
            setMensagem("Erro de conexão ou busca.");
        }
    };

    const carregarRegistroDoBanco = (data: any) => {
        setMaster({
            ean: data.ean,
            modeloReferencia: data.modelo_ref || '',
            fabricante: data.marca || ''
        });

        const mapItem = (x: any, i: number) => ({
            id: i,
            descricao: x.nome,
            codigoPeca: x.codigo || '',
            createdAt: '',
            createdBy: ''
        });

        if (data.nfs_data) setCodigosNF(data.nfs_data.map((x: any, i: number) => ({ ...x, id: i })));
        if (data.embalagem) setEmbalagens(data.embalagem.map(mapItem));
        if (data.acessorios) setAcessorios(data.acessorios.map(mapItem));
        if (data.estetica) setEsteticas(data.estetica.map(mapItem));
        if (data.funcional) setFuncionaisPeca(data.funcional.map(mapItem));
        if (data.funcionalidade) setFuncionalidades(data.funcionalidade.map(mapItem));

        setMensagem("Produto encontrado no banco de dados!");
    };

    useEffect(() => {
        const e = upper(master.ean);
        if (!e) return;
        if (autoLoadRef.current === e) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            autoLoadRef.current = e;
            fetchProductByEan(e);
        }, 800);

        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [master.ean]);

    const handleSaveProduct = async () => {
        setMensagem("Salvando...");
        try {
            // Map frontend state to DTO
            const payload = {
                ean: master.ean,
                modeloRef: master.modeloReferencia,
                marca: master.fabricante,
                nfs: codigosNF.map(c => ({ codigo: c.codigo, revenda: c.revenda })),
                modelos: [],
                embalagem: embalagens.map(p => ({ tipo: 'embalagem' as const, nome: p.descricao, codigo: p.codigoPeca })),
                acessorios: acessorios.map(p => ({ tipo: 'acessorio' as const, nome: p.descricao, codigo: p.codigoPeca })),
                estetica: esteticas.map(p => ({ tipo: 'estetica' as const, nome: p.descricao, codigo: p.codigoPeca })),
                funcional: funcionaisPeca.map(p => ({ tipo: 'funcional' as const, nome: p.descricao, codigo: p.codigoPeca })),
                funcionalidade: funcionalidades.map(p => ({ tipo: 'funcionalidade' as const, nome: p.descricao, codigo: p.codigoPeca })),
                fotos: [],
                manualUrl: ''
            };

            await ProductService.createProduct(payload);
            setMensagem("Produto salvo com sucesso!");
        } catch (e: any) {
            console.error(e);
            setMensagem(`Erro ao salvar: ${e.message || "Erro desconhecido"}`);
        }
    };


    // Handlers
    const handleChangeMaster = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMaster(prev => ({ ...prev, [name]: value }));
    };

    const openArquivos = (ctx: ModalArquivosKey) => setArquivosCtx(ctx);

    const getArquivosInfo = () => {
        if (!arquivosCtx) return { open: false, title: "", accept: "", files: [], onAdd: () => { }, onRemove: () => { } };
        if (arquivosCtx.kind === 'produto') {
            const doc = arquivosCtx.doc;
            return {
                open: true,
                title: doc,
                accept: 'image/*',
                files: produtoDocs[doc],
                onAdd: (fl: FileList) => {
                    const newFiles = Array.from(fl).map((f, i) => ({ id: Date.now() + i, file: f, name: f.name, createdAt: agoraBR(), createdBy: USUARIO_ATUAL }));
                    setProdutoDocs(p => ({ ...p, [doc]: [...p[doc], ...newFiles] }));
                },
                onRemove: (id: number) => setProdutoDocs(p => ({ ...p, [doc]: p[doc].filter(f => f.id !== id) }))
            };
        }
        return { open: false, title: "", accept: "", files: [], onAdd: () => { }, onRemove: () => { } };
    };
    const arqInfo = getArquivosInfo();

    return (
        <div className="min-h-screen bg-slate-50 p-4 flex justify-center">
            <div className="w-[1340px] h-full overflow-auto">
                <div className="bg-slate-50 min-h-full">
                    <div className="max-w-6xl mx-auto space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h1 className="text-lg font-bold text-slate-800">Cadastro de Produto (Refined)</h1>
                                <p className="text-[12px] text-slate-600">Cadastro centralizado e validado via Banco de Dados.</p>
                            </div>
                        </div>

                        {/* Main Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
                            {mensagem && <div className="p-2 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200">{mensagem}</div>}

                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-600 tracking-wide">PESQUISAR</label>
                                    <button
                                        type="button"
                                        onClick={() => setMostrarLookupEAN(true)}
                                        className="h-9 w-full rounded-full border border-slate-300 bg-white px-4 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2"
                                    >
                                        <Search size={16} />
                                        PESQUISAR
                                    </button>
                                </div>
                                <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-600 tracking-wide">EAN / GTIN</label>
                                    <input
                                        name="ean"
                                        value={master.ean}
                                        onChange={handleChangeMaster}
                                        className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                                        placeholder="Digite para auto-fill..."
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-6 flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-600 tracking-wide">MODELO REFERÊNCIA</label>
                                    <input
                                        name="modeloReferencia"
                                        value={master.modeloReferencia}
                                        onChange={handleChangeMaster}
                                        className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[12px] text-slate-800"
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-600 tracking-wide">FABRICANTE</label>
                                    <input
                                        name="fabricante"
                                        value={master.fabricante}
                                        onChange={handleChangeMaster}
                                        className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[12px] text-slate-800 uppercase"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setMostrarPopupNF(true)} className="inline-flex items-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold border border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100 transition">
                                        <Receipt size={16} />CÓDIGOS NF<CountPill n={codigosNF.length} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setMostrarPopupEmbalagem(true)} className="inline-flex items-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition">
                                        <PackageIcon size={16} /> EMBALAGEM <CountPill n={embalagens.length} />
                                    </button>
                                    <button onClick={() => setMostrarPopupAcessorios(true)} className="inline-flex items-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition">
                                        <Cable size={16} /> ACESSÓRIOS <CountPill n={acessorios.length} />
                                    </button>
                                    <button onClick={() => setMostrarPopupEstetica(true)} className="inline-flex items-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold border border-pink-200 text-pink-700 bg-pink-50 hover:bg-pink-100 transition">
                                        <Sparkles size={16} /> ESTÉTICA <CountPill n={esteticas.length} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setMostrarPopupFuncionalPeca(true)} className="inline-flex items-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition">
                                        <BookOpen size={16} /> FUNCIONAL (PEÇA) <CountPill n={funcionaisPeca.length} />
                                    </button>
                                    <button onClick={() => setMostrarPopupFuncionalidade(true)} className="inline-flex items-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold border border-cyan-200 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition">
                                        <FileText size={16} /> FUNCIONALIDADES <CountPill n={funcionalidades.length} />
                                    </button>
                                </div>
                            </div>

                            {/* Docs Section */}
                            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80">
                                <div className="text-[12px] font-semibold text-slate-800">Anexos do produto</div>
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <button onClick={() => openArquivos({ kind: "produto", doc: "fotoProduto" })} className="flex items-center gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
                                        <ImageIcon size={16} /> <span className="text-[11px] font-semibold">Foto Produto</span> <CountPill n={produtoDocs.fotoProduto.length} />
                                    </button>
                                    <button onClick={() => openArquivos({ kind: "produto", doc: "etiquetaProcel" })} className="flex items-center gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
                                        <Tag size={16} /> <span className="text-[11px] font-semibold">Etiqueta Procel</span> <CountPill n={produtoDocs.etiquetaProcel.length} />
                                    </button>
                                    <button onClick={() => openArquivos({ kind: "produto", doc: "kitAcessorio" })} className="flex items-center gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
                                        <Paperclip size={16} /> <span className="text-[11px] font-semibold">Kit Acessório</span> <CountPill n={produtoDocs.kitAcessorio.length} />
                                    </button>
                                    <button onClick={() => openArquivos({ kind: "produto", doc: "manualUsuario" })} className="flex items-center gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
                                        <FileText size={16} /> <span className="text-[11px] font-semibold">Manual PDF</span> <CountPill n={produtoDocs.manualUsuario.length} />
                                    </button>
                                </div>
                            </div>

                            {/* Save Actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button className="px-4 h-9 rounded-xl text-xs font-bold border hover:bg-gray-50 flex items-center gap-2"><X size={16} /> LIMPAR</button>
                                <button onClick={handleSaveProduct} className="px-4 h-9 rounded-xl text-xs font-bold bg-slate-900 text-white flex items-center gap-2"><Plus size={16} /> SALVAR PRODUTO</button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ModalEanGtins
                open={mostrarLookupEAN}
                onClose={() => setMostrarLookupEAN(false)}
                eans={[]}
                onAdd={(m) => setMaster(m)}
                onSelect={(m) => setMaster(m)}
            />

            <ModalCodigosNF
                open={mostrarPopupNF}
                master={master}
                codigosNF={codigosNF}
                nfAtual={nfAtual}
                revendaAtual={revendaNFAtual}
                mensagem={mensagemNF}
                onClose={() => setMostrarPopupNF(false)}
                onChangeNF={setNfAtual}
                onPesquisarRevenda={() => setMostrarLookupRevenda(true)}
                onAdd={() => {
                    if (nfAtual && revendaNFAtual) {
                        setCodigosNF(p => [...p, { id: Date.now(), codigo: nfAtual, revenda: revendaNFAtual, createdAt: '', createdBy: '' }]);
                        setNfAtual(""); setRevendaNFAtual("");
                    }
                }}
                onRemover={(id) => setCodigosNF(p => p.filter(x => x.id !== id))}
                onEditar={() => { }}
            />

            <ModalRevendasClientes
                open={mostrarLookupRevenda}
                onClose={() => setMostrarLookupRevenda(false)}
                onSelect={(nome) => {
                    setRevendaNFAtual(nome);
                    setMostrarLookupRevenda(false);
                }}
            />

            <ModalPecas
                open={mostrarPopupEmbalagem}
                title="Embalagem"
                master={master}
                form={formEmbalagem}
                mensagem={mensagemEmbalagem}
                onClose={() => setMostrarPopupEmbalagem(false)}
                onChangeCodigo={(v) => setFormEmbalagem(p => ({ ...p, codigoPeca: v }))}
                onChangeDescricao={(v) => setFormEmbalagem(p => ({ ...p, descricao: v }))}
                onAdd={() => {
                    setEmbalagens(p => [...p, { id: Date.now(), ...formEmbalagem, createdAt: '', createdBy: '' }]);
                    setFormEmbalagem({ codigoPeca: '', descricao: '' });
                }}
                lista={embalagens}
                onRemover={(id) => setEmbalagens(p => p.filter(x => x.id !== id))}
            />

            <ModalPecas
                open={mostrarPopupAcessorios}
                title="Acessórios"
                master={master}
                form={formAcessorio}
                mensagem={""}
                onClose={() => setMostrarPopupAcessorios(false)}
                onChangeCodigo={(v) => setFormAcessorio(p => ({ ...p, codigoPeca: v }))}
                onChangeDescricao={(v) => setFormAcessorio(p => ({ ...p, descricao: v }))}
                onAdd={() => {
                    setAcessorios(p => [...p, { id: Date.now(), ...formAcessorio, createdAt: '', createdBy: '' }]);
                    setFormAcessorio({ codigoPeca: '', descricao: '' });
                }}
                lista={acessorios}
                onRemover={(id) => setAcessorios(p => p.filter(x => x.id !== id))}
            />

            <ModalPecas
                open={mostrarPopupEstetica}
                title="Estética"
                master={master}
                form={formEstetica}
                mensagem={""}
                onClose={() => setMostrarPopupEstetica(false)}
                onChangeCodigo={(v) => setFormEstetica(p => ({ ...p, codigoPeca: v }))}
                onChangeDescricao={(v) => setFormEstetica(p => ({ ...p, descricao: v }))}
                onAdd={() => {
                    setEsteticas(p => [...p, { id: Date.now(), ...formEstetica, createdAt: '', createdBy: '' }]);
                    setFormEstetica({ codigoPeca: '', descricao: '' });
                }}
                lista={esteticas}
                onRemover={(id) => setEsteticas(p => p.filter(x => x.id !== id))}
            />

            <ModalPecas
                open={mostrarPopupFuncionalPeca}
                title="Funcional (Peça)"
                master={master}
                form={formFuncionaisPeca}
                mensagem={""}
                onClose={() => setMostrarPopupFuncionalPeca(false)}
                onChangeCodigo={(v) => setFormFuncionaisPeca(p => ({ ...p, codigoPeca: v }))}
                onChangeDescricao={(v) => setFormFuncionaisPeca(p => ({ ...p, descricao: v }))}
                onAdd={() => {
                    setFuncionaisPeca(p => [...p, { id: Date.now(), ...formFuncionaisPeca, createdAt: '', createdBy: '' }]);
                    setFormFuncionaisPeca({ codigoPeca: '', descricao: '' });
                }}
                lista={funcionaisPeca}
                onRemover={(id) => setFuncionaisPeca(p => p.filter(x => x.id !== id))}
            />

            <ModalPecas
                open={mostrarPopupFuncionalidade}
                title="Funcionalidades"
                master={master}
                form={formFuncionalidade}
                mensagem={""}
                onClose={() => setMostrarPopupFuncionalidade(false)}
                onChangeCodigo={(v) => setFormFuncionalidade(p => ({ ...p, codigoPeca: v }))}
                onChangeDescricao={(v) => setFormFuncionalidade(p => ({ ...p, descricao: v }))}
                onAdd={() => {
                    setFuncionalidades(p => [...p, { id: Date.now(), ...formFuncionalidade, createdAt: '', createdBy: '' }]);
                    setFormFuncionalidade({ codigoPeca: '', descricao: '' });
                }}
                lista={funcionalidades}
                onRemover={(id) => setFuncionalidades(p => p.filter(x => x.id !== id))}
            />

        </div>
    );
};

export default CadastroNF_EAN_Modelo;
