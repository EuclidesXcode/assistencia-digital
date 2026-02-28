"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  BookText,
  Cable,
  FileSearch,
  FileText,
  Image as ImageIcon,
  Layers,
  Package as PackageIcon,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { ProductApiService } from "@/lib/productApiService";
import { CreateProductDTO, ItemVinculado, ModeloFabricante as DTOModeloFabricante } from "@/backend/models/Product";
import { processImageToBase64 } from "@/lib/image";


const PECAS_CADASTRADAS = [
  { codigo: "712814", descricao: "ALTO FAL 16R 8W 1X5.5POL PH32M A4", tipo: "ALTO-FALANTE" },
  { codigo: "712825", descricao: "BASE VIDRO PH32M LED A4", tipo: "BASE" },
  { codigo: "711480", descricao: "CABO ADAPT VIDEO COMPOSTO (P2 RCA)", tipo: "CABO" },
  { codigo: "716145", descricao: "EMBALAGEM", tipo: "EMBALAGEM" },
];

const FUNCS_PADRAO = ["TELA", "ÁUDIO", "HDMI", "WI-FI", "BLUETOOTH", "USB", "SINTONIZADOR"];
const ESTETICAS_PADRAO = ["TELA", "GABINETE FRONTAL", "TAMPA TRASEIRA"];
const EMBALAGENS_PADRAO = ["EMBALAGEM", "FUNDO", "CALÇO SUPERIOR", "CALÇO INFERIOR"];
const ACESSORIOS_PADRAO = ["Controle remoto", "Cabo de energia", "Base/Pedestal", "Manual", "Parafusos"];
const PECAS_FUNCIONAIS_PADRAO = ["Placa principal", "Fonte", "PCI WI-FI", "Display"];

const SIMULACAO_GROMIT = [
  {
    ean: "7899466405923",
    modeloReferencia: 'TV 32"PHILCO LED PH32E53SG HD/DTV/USB/NET',
    codigosNF: [
      { codigo: "3551512", revenda: "CASAS BAHIA" },
      { codigo: "95123", revenda: "MAGAZINE LUIZA" },
      { codigo: "75211144", revenda: "PERNAMBUCANAS" },
    ],
    modelosFabricante: [
      { nome: "TV PH32E53SG VERSAO A", codigoProduto: "099323010ATA", linha: "TV" },
      { nome: "TV PH32E53SG VERSAO B", codigoProduto: "099323010ATB", linha: "TV" },
      { nome: "TV PH32E53SG VERSAO C", codigoProduto: "099323010ATC", linha: "TV" },
      { nome: "TV PH32E53SG VERSAO D", codigoProduto: "099323010ATD", linha: "TV" },
    ],
    embalagens: [
      { codigo: "716145", descricao: "EMBALAGEM" },
      { codigo: "713591", descricao: "CONJ CALCO ISOPOR PH32E53SG" },
    ],
    acessorios: [
      { codigo: "712825", descricao: "BASE VIDRO PH32M LED A4" },
      { codigo: "711480", descricao: "CABO ADAPT VIDEO COMPOSTO (P2 RCA)" },
      { codigo: "710125", descricao: "CABO ADAPT AUDIO (P2 RCA)" },
    ],
    esteticas: [
      { codigo: "713587", descricao: "GAB TRAS PH32E53DG" },
      { codigo: "713586", descricao: "ETIQ LAT FUNCOES PH32E53SG" },
      { codigo: "713585", descricao: "ETIQ INF FUNCOES PH32E53SG" },
    ],
    funcionaisPeca: [{ codigo: "165500071", descricao: "DISPLAY LED 32pol" }],
    funcionalidades: ["ÁUDIO", "HDMI"],
  },
];

const EANS_CADASTRADOS_INICIAL: Master[] = [
  {
    ean: "7899466405923",
    modeloReferencia: 'TV 32"PHILCO LED PH32E53SG HD/DTV/USB/NET',
    fabricante: "PHILCO",
    createdAt: "12/01/2026",
    createdBy: "EDUARDO",
  },
  {
    ean: "7891356091112",
    modeloReferencia: 'TV 50"BRITÂNIA LED BTV50G7 HD/DTV/USB/WIFI',
    fabricante: "BRITÂNIA",
    createdAt: "12/01/2026",
    createdBy: "EDUARDO",
  },
  {
    ean: "7890000001234",
    modeloReferencia: 'TV 55"HISENSE 4K UHD SMART 55A6H',
    fabricante: "HISENSE",
    createdAt: "12/01/2026",
    createdBy: "EDUARDO",
  },
];

const EANS_CADASTRADOS = EANS_CADASTRADOS_INICIAL;

const REVENDAS_CLIENTES_CADASTRADOS = [
  { id: 1, nome: "CASAS BAHIA", tipo: "JURÍDICA", cnpj: "00.000.001/0001-00", cpf: "" },
  { id: 2, nome: "MAGAZINE LUIZA", tipo: "JURÍDICA", cnpj: "00.000.002/0001-00", cpf: "" },
  { id: 3, nome: "PERNAMBUCANAS", tipo: "JURÍDICA", cnpj: "00.000.003/0001-00", cpf: "" },
  { id: 4, nome: "CARREFOUR", tipo: "JURÍDICA", cnpj: "00.000.004/0001-00", cpf: "" },
  { id: 5, nome: "FAST SHOP", tipo: "JURÍDICA", cnpj: "00.000.005/0001-00", cpf: "" },
  { id: 6, nome: "AMERICANAS", tipo: "JURÍDICA", cnpj: "00.000.006/0001-00", cpf: "" },
  { id: 7, nome: "JOÃO DA SILVA", tipo: "FÍSICA", cnpj: "", cpf: "123.456.789-00" },
  { id: 8, nome: "MARIA OLIVEIRA", tipo: "FÍSICA", cnpj: "", cpf: "987.654.321-00" },
];

const norm = (s: any) => String(s || "").trim();
const upper = (s: any) => norm(s).toUpperCase();

const USUARIO_ATUAL = "EDUARDO";
const agoraBR = () => new Date().toLocaleDateString("pt-BR");

const FABRICANTES_CONHECIDOS = ["PHILCO", "BRITANIA", "BRITÂNIA", "HISENSE"];

const detectarFabricanteDoModelo = (modelo: string): string => {
  const u = upper(modelo);
  for (const fab of FABRICANTES_CONHECIDOS) if (u.includes(fab)) return fab;
  return "";
};

const LINHAS_CONHECIDAS = [
  "TV",
  "SOUNDBAR",
  "ÁUDIO",
  "AR CONDICIONADO",
  "REFRIGERADOR",
  "GELADEIRA",
  "LAVADORA",
  "SECADORA",
  "FOGÃO",
  "COOKTOP",
  "MICRO-ONDAS",
  "ASPIRADOR",
  "PURIFICADOR",
  "CERVEJEIRA",
  "FREEZER",
];

const detectarLinhaDoModeloFabricante = (modelo: string): string => {
  const u = upper(modelo);
  for (const linha of LINHAS_CONHECIDAS) if (u.includes(linha)) return linha;
  if (u.startsWith("TV")) return "TV";
  return "";
};

const lookupDescricaoPorCodigoBase = (codigoPeca: string) => {
  const cod = upper(codigoPeca);
  if (!cod) return "";
  const p = PECAS_CADASTRADAS.find((x) => upper(x.codigo) === cod);
  return p?.descricao || "";
};

type FileMeta = { id: number; file: File; name: string; createdAt: string; createdBy: string };

interface Master {
  ean: string;
  modeloReferencia: string;
  fabricante: string;
  createdAt?: string;
  createdBy?: string;
}

interface PecaBase {
  id: number;
  descricao: string;
  codigoPeca?: string;
  modeloId?: number;
  createdAt: string;
  createdBy: string;
}

interface ModeloFabricante {
  id: number;
  nome: string;
  codigoProduto: string;
  linha: string;
  createdAt: string;
  createdBy: string;
}

interface CodigoNF {
  id: number;
  codigo: string;
  revenda: string;
  createdAt: string;
  createdBy: string;
}

type ProdutoDocKey = "fotoProduto" | "etiquetaProcel" | "kitAcessorio" | "manualUsuario";

type ModeloDocKey = "vistaExplodida" | "boletimTecnico" | "manualTecnico";

type ModalArquivosKey =
  | { kind: "produto"; doc: ProdutoDocKey }
  | { kind: "modelo"; modeloId: number; doc: ModeloDocKey }
  | { kind: "item"; rowKey: string; title: string };

const toMasterFromRegistro = (r: any): Master => ({
  ean: String(r?.ean || ""),
  modeloReferencia: String(r?.modeloReferencia || ""),
  fabricante: String(r?.fabricante || ""),
  createdAt: String(r?.createdAt || agoraBR()),
  createdBy: String(r?.createdBy || USUARIO_ATUAL),
});

const mapApiProductToRegistro = (data: any) => {
  const now = Date.now();
  const createdAt = agoraBR();
  const createdBy = USUARIO_ATUAL;

  const ean = String(data?.ean || "").trim();
  const modeloReferencia = String(data?.modeloRef || data?.modeloReferencia || "").trim();
  const fabricante = String(data?.marca || data?.fabricante || "").trim();

  const nfs: any[] = Array.isArray(data?.nfs) ? data.nfs : [];
  const modelosRaw: any[] = Array.isArray(data?.modelos) ? data.modelos : [];
  const embalagemRaw: any[] = Array.isArray(data?.embalagem) ? data.embalagem : [];
  const acessoriosRaw: any[] = Array.isArray(data?.acessorios) ? data.acessorios : [];
  const esteticaRootRaw: any[] = Array.isArray(data?.estetica) ? data.estetica : [];
  const funcionalRootRaw: any[] = Array.isArray(data?.funcional) ? data.funcional : [];
  const funcionalidadesRaw: any[] = Array.isArray(data?.funcionalidade) ? data.funcionalidade : [];

  const codigosNF: CodigoNF[] = nfs
    .map((nf: any, i: number) => ({
      id: now + 10 + i,
      codigo: upper(nf?.codigo || ""),
      revenda: upper(nf?.revenda || ""),
      createdAt,
      createdBy,
    }))
    .filter((nf) => !!nf.codigo || !!nf.revenda);

  const modelosFabricante: ModeloFabricante[] = modelosRaw
    .map((m: any, i: number) => {
      const nome = norm(m?.nome);
      return {
        id: now + 100 + i,
        nome,
        codigoProduto: upper(m?.codigoTipo || m?.codigoProduto || ""),
        linha: upper(m?.linha || detectarLinhaDoModeloFabricante(nome) || ""),
        createdAt,
        createdBy,
      };
    })
    .filter((m) => !!m.nome);

  const modeloSelecionadoId = modelosFabricante[0]?.id || null;

  const mapPecaBase = (item: any, id: number, extra?: Partial<PecaBase>): PecaBase => ({
    id,
    codigoPeca: upper(item?.codigo || item?.codigoPeca || ""),
    descricao: norm(item?.nome || item?.descricao || ""),
    createdAt,
    createdBy,
    ...extra,
  });

  const embalagens: PecaBase[] = embalagemRaw
    .map((item: any, i: number) => mapPecaBase(item, now + 200 + i))
    .filter((item) => !!item.codigoPeca || !!item.descricao);

  const acessorios: PecaBase[] = acessoriosRaw
    .map((item: any, i: number) => mapPecaBase(item, now + 300 + i))
    .filter((item) => !!item.codigoPeca || !!item.descricao);

  const esteticasFromModelos: PecaBase[] = [];
  const funcionaisFromModelos: PecaBase[] = [];
  modelosRaw.forEach((modelo: any, idxModelo: number) => {
    const modeloId = modelosFabricante[idxModelo]?.id || 0;
    const ests = Array.isArray(modelo?.estetica) ? modelo.estetica : [];
    const funcs = Array.isArray(modelo?.funcional) ? modelo.funcional : [];

    ests.forEach((item: any, i: number) =>
      esteticasFromModelos.push(mapPecaBase(item, now + 400 + idxModelo * 100 + i, { modeloId }))
    );
    funcs.forEach((item: any, i: number) =>
      funcionaisFromModelos.push(mapPecaBase(item, now + 500 + idxModelo * 100 + i, { modeloId }))
    );
  });

  const defaultModeloId = modeloSelecionadoId || 0;
  const esteticas: PecaBase[] =
    esteticasFromModelos.length > 0
      ? esteticasFromModelos
      : esteticaRootRaw
        .map((item: any, i: number) => mapPecaBase(item, now + 600 + i, { modeloId: defaultModeloId }))
        .filter((item) => !!item.codigoPeca || !!item.descricao);

  const funcionaisPeca: PecaBase[] =
    funcionaisFromModelos.length > 0
      ? funcionaisFromModelos
      : funcionalRootRaw
        .map((item: any, i: number) => mapPecaBase(item, now + 700 + i, { modeloId: defaultModeloId }))
        .filter((item) => !!item.codigoPeca || !!item.descricao);

  const funcionalidades: PecaBase[] = funcionalidadesRaw
    .map((item: any, i: number) => ({
      id: now + 800 + i,
      descricao: norm(typeof item === "string" ? item : item?.nome || item?.descricao),
      createdAt,
      createdBy,
    }))
    .filter((item) => !!item.descricao);

  return {
    ean,
    modeloReferencia,
    fabricante,
    codigosNF,
    modelosFabricante,
    modeloSelecionadoId,
    embalagens,
    acessorios,
    esteticas,
    funcionaisPeca,
    funcionalidades,
    createdAt: String(data?.createdAt || createdAt),
    createdBy,
  };
};

const IconBtn: React.FC<{
  title: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  badge?: number;
  children: React.ReactNode;
  variant?: "neutral" | "danger" | "primary";
}> = ({ title, onClick, disabled, badge, children, variant = "neutral" }) => {
  const base =
    "relative inline-flex items-center justify-center rounded-lg border h-8 w-8 transition disabled:opacity-40 disabled:cursor-not-allowed";
  const styles =
    variant === "danger"
      ? "border-red-200 text-red-600 hover:bg-red-50"
      : variant === "primary"
        ? "border-sky-200 text-sky-700 hover:bg-sky-50"
        : "border-slate-200 text-slate-700 hover:bg-slate-50";
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
      {!!badge && (
        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-slate-900 text-white text-[10px] font-semibold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
};

const CountPill: React.FC<{ n: number }> = ({ n }) => {
  if (!n) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-slate-900 text-white text-[10px] font-semibold">
      {n}
    </span>
  );
};

const ModalShell: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
}> = ({ open, title, subtitle, onClose, children, maxW = "max-w-3xl" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 md:pl-[calc(var(--sidebar-w)+1rem)]">
      <div
        className={`w-full ${maxW} min-w-0 bg-white rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6 space-y-4 max-h-[90vh] overflow-x-hidden overflow-y-auto`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] px-2 py-1 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
          >
            FECHAR
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const ModalArquivos: React.FC<{
  open: boolean;
  title: string;
  accept: string;
  files: FileMeta[];
  onClose: () => void;
  onAdd: (files: FileList) => void;
  onRemove: (id: number) => void;
}> = ({ open, title, accept, files, onClose, onAdd, onRemove }) => {
  const [pickKey, setPickKey] = useState(0);
  const [view, setView] = useState<{ src: string; title: string } | null>(null);

  const acceptLower = String(accept || "").toLowerCase();
  const allowImages = acceptLower.includes("image");
  const allowPdf = acceptLower.includes("pdf") || acceptLower.includes("application/pdf");

  const isImageFile = (file: File) => {
    const t = String((file as any)?.type || "").toLowerCase();
    if (t.startsWith("image/")) return true;
    const n = String((file as any)?.name || "").toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(n);
  };

  const [previews, setPreviews] = useState<Record<number, string>>({});

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!open || !allowImages) {
        setPreviews({});
        return;
      }

      const entries = await Promise.all(
        files.map(async (f) => {
          if (!isImageFile(f.file)) return null;
          const dataUrl = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result || ""));
            r.onerror = () => resolve("");
            try {
              r.readAsDataURL(f.file);
            } catch {
              resolve("");
            }
          });
          return dataUrl ? ([f.id, dataUrl] as const) : null;
        })
      );

      if (!alive) return;
      const map: Record<number, string> = {};
      for (const e of entries) if (e) map[e[0]] = e[1];
      setPreviews(map);
    };

    run();
    return () => {
      alive = false;
    };
  }, [open, files, allowImages]);

  return (
    <ModalShell
      open={open}
      title={title}
      subtitle={`Arquivos cadastrados: ${files.length}`}
      onClose={() => {
        setView(null);
        onClose();
      }}
      maxW="max-w-2xl"
    >
      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer">
          <Plus size={16} />
          ADICIONAR
          <input
            key={pickKey}
            type="file"
            className="hidden"
            accept={accept}
            multiple
            onChange={(e) => {
              const fl = e.target.files;
              if (fl && fl.length) onAdd(fl);
              setPickKey((k) => k + 1);
            }}
          />
        </label>
        <div className="text-[10px] text-slate-500">Aceita: {accept || "qualquer"}</div>
      </div>

      <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-x-auto overflow-y-auto max-h-[360px]">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-100 text-slate-500 uppercase tracking-wide sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left w-8">#</th>
              {allowImages ? (
                <>
                  <th className="px-2 py-1.5 text-left w-24">Data</th>
                  <th className="px-2 py-1.5 text-left w-28">Incluído por</th>
                  {allowPdf ? <th className="px-2 py-1.5 text-left">Arquivo</th> : null}
                  <th className="px-2 py-1.5 text-left w-24">FOTO</th>
                </>
              ) : (
                <th className="px-2 py-1.5 text-left">Arquivo</th>
              )}
              <th className="px-2 py-1.5 text-right w-14">Excluir</th>
            </tr>
          </thead>
          <tbody>
            {!files.length && (
              <tr>
                <td
                  colSpan={allowImages ? (allowPdf ? 6 : 5) : 3}
                  className="px-3 py-3 text-center text-[11px] text-slate-400"
                >
                  Nenhum arquivo cadastrado.
                </td>
              </tr>
            )}

            {files.map((f, i) => (
              <tr key={f.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-2 py-1.5 align-middle text-[11px] text-slate-500">{i + 1}</td>

                {allowImages ? (
                  <>
                    <td className="px-2 py-1.5 align-middle text-[11px] text-slate-700 whitespace-nowrap">{f.createdAt || "-"}</td>
                    <td className="px-2 py-1.5 align-middle text-[11px] font-medium text-slate-800 whitespace-nowrap">
                      {f.createdBy || "-"}
                    </td>

                    {allowPdf ? <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800">{f.name}</td> : null}

                    <td className="px-2 py-1.5 align-middle">
                      <button
                        type="button"
                        disabled={!previews[f.id]}
                        onClick={() =>
                          previews[f.id] &&
                          setView({
                            src: previews[f.id],
                            title: `${title} — ${f.createdAt || ""} — ${f.createdBy || ""}`.trim() || f.name,
                          })
                        }
                        className="rounded-lg disabled:opacity-50 focus:outline-none"
                      >
                        {previews[f.id] ? (
                          <div className="relative">
                            <img
                              src={previews[f.id]}
                              alt=""
                              className="w-16 h-11 object-cover rounded-lg border border-slate-200 bg-white cursor-zoom-in"
                            />
                            <span className="absolute right-1 bottom-1 bg-white/90 border border-slate-200 rounded-md p-0.5">
                              <ZoomIn size={14} />
                            </span>
                          </div>
                        ) : (
                          <div className="w-16 h-11 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 text-[10px]">
                            —
                          </div>
                        )}
                      </button>
                    </td>
                  </>
                ) : (
                  <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800">{f.name}</td>
                )}

                <td className="px-2 py-1.5 align-middle text-right">
                  <IconBtn title="Excluir" variant="danger" onClick={() => onRemove(f.id)}>
                    <Trash2 size={16} />
                  </IconBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {view && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 md:pl-[calc(var(--sidebar-w)+1rem)]"
          onClick={() => setView(null)}
        >
          <div className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="text-[12px] font-semibold text-slate-800 truncate">{view.title}</div>
              <button
                type="button"
                onClick={() => setView(null)}
                className="text-[11px] px-2 py-1 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
              >
                FECHAR
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center">
              <img src={view.src} alt="" className="max-h-[70vh] max-w-full rounded-xl border border-slate-200 bg-white" />
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
};

const ModalAjuda: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  return (
    <ModalShell open={open} title="Como usar esta tela" subtitle="Fluxo e regras principais" onClose={onClose} maxW="max-w-2xl">
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 max-h-[420px] overflow-auto text-[12px] text-slate-700 space-y-3">
        <div className="font-semibold text-slate-900">Regras</div>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Cada <span className="font-semibold">revenda/cliente</span> tem seu <span className="font-semibold">Código NF</span>, porém o
            <span className="font-semibold"> EAN / GTIN</span> é único por produto.
          </li>
          <li>
            <span className="font-semibold">Embalagem</span> e <span className="font-semibold">Acessórios</span>: cadastra itens vinculados ao
            <span className="font-semibold"> EAN / GTIN</span>.
          </li>
          <li>
            <span className="font-semibold">Estética</span> e <span className="font-semibold">Funcional</span>: cadastra peças vinculadas ao
            <span className="font-semibold"> Modelo Fabricante</span> selecionado.
          </li>
          <li>
            <span className="font-semibold">Funcionalidade</span>: cadastro de características/itens de verificação para o produto.
          </li>
          <li>
            Itens de Embalagem, Acessórios, Funcionalidade, Estética e Funcional carregam informações da tela de Pré-Análise.
          </li>
        </ul>

        <div className="font-semibold text-slate-900">Anexos</div>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-semibold">Foto do produto</span> pode aparecer em outras telas quando necessário.
          </li>
          <li>
            <span className="font-semibold">Foto da etiqueta Procel</span>, <span className="font-semibold">Foto do kit acessório</span> e
            <span className="font-semibold"> PDF do Manual do usuário</span> aparecem na tela de Embalagem para auxiliar o embalador.
          </li>
          <li>
            <span className="font-semibold">Vista explodida</span>, <span className="font-semibold">Boletim técnico</span>,
            <span className="font-semibold"> Manual técnico</span> e <span className="font-semibold">foto do item</span> auxiliam Pré-Análise e
            Análise Técnica.
          </li>
        </ul>
      </div>
    </ModalShell>
  );
};

const ModalRevendasClientes: React.FC<{
  open: boolean;
  onClose: () => void;
  onSelect: (nome: string) => void;
}> = ({ open, onClose, onSelect }) => {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const lista = useMemo(() => {
    const qq = upper(q);
    return REVENDAS_CLIENTES_CADASTRADOS.filter((x) => {
      if (!qq) return true;
      const hay = `${x.nome} ${x.tipo} ${x.cnpj || ""} ${x.cpf || ""}`;
      return upper(hay).includes(qq);
    });
  }, [q]);

  return (
    <ModalShell open={open} title="Selecionar Revenda/Cliente" subtitle={`Cadastrados: ${REVENDAS_CLIENTES_CADASTRADOS.length}`} onClose={onClose} maxW="max-w-4xl">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">PESQUISA</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por nome, tipo, CNPJ ou CPF"
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-x-auto bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left w-8">#</th>
              <th className="px-2 py-2 text-left">Revenda/cliente</th>
              <th className="px-2 py-2 text-left w-20">Tipo</th>
              <th className="px-2 py-2 text-left w-40">CNPJ/CPF</th>
              <th className="px-2 py-2 text-right w-28">Ação</th>
            </tr>
          </thead>
          <tbody>
            {!lista.length && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-[11px] text-slate-400">
                  Nenhum resultado.
                </td>
              </tr>
            )}
            {lista.map((x, i) => (
              <tr key={x.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-500">{i + 1}</td>
                <td className="px-2 py-2 align-middle text-[11px] font-semibold text-slate-800 truncate" title={x.nome}>
                  {x.nome}
                </td>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-700 truncate" title={x.tipo}>
                  {x.tipo}
                </td>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-700 font-mono whitespace-nowrap">
                  {x.tipo === "JURÍDICA" ? x.cnpj || "-" : x.cpf || "-"}
                </td>
                <td className="px-2 py-2 align-middle text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(x.nome)}
                    className="h-8 px-2.5 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    CARREGAR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
};

const ModalEanGtins: React.FC<{
  open: boolean;
  onClose: () => void;
  eans: Master[];
  onAdd: (m: Master) => void;
  onSelect: (m: Master) => void;
}> = ({ open, onClose, eans, onAdd, onSelect }) => {
  const [q, setQ] = useState("");
  const [fFab, setFFab] = useState<string>("TODOS");

  const [novoEan, setNovoEan] = useState("");
  const [novoModelo, setNovoModelo] = useState("");
  const [novoFab, setNovoFab] = useState("");
  const [msgAdd, setMsgAdd] = useState("");

  useEffect(() => {
    if (!open) {
      setQ("");
      setFFab("TODOS");
      setNovoEan("");
      setNovoModelo("");
      setNovoFab("");
      setMsgAdd("");
    }
  }, [open]);

  const existente = useMemo(() => {
    const e = upper(novoEan);
    return e ? eans.find((x) => upper(x.ean) === e) || null : null;
  }, [novoEan, eans]);

  const eanHitRef = useRef("");

  useEffect(() => {
    if (!open) return;
    if (existente) {
      const k = upper(existente.ean);
      if (eanHitRef.current !== k) {
        setNovoModelo(existente.modeloReferencia);
        setNovoFab(existente.fabricante);
        setMsgAdd("");
      }
      eanHitRef.current = k;
    } else {
      if (eanHitRef.current) {
        setNovoModelo("");
        setNovoFab("");
      }
      eanHitRef.current = "";
    }
  }, [open, existente]);

  const fabs = useMemo(() => {
    const s = new Set<string>();
    eans.forEach((x) => s.add(upper(x.fabricante)));
    return Array.from(s).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [eans]);

  const lista = useMemo(() => {
    const qq = upper(q);
    return eans.filter((x) => {
      if (fFab !== "TODOS" && upper(x.fabricante) !== fFab) return false;
      if (!qq) return true;
      const hay = `${x.createdAt || ""} ${x.createdBy || ""} ${x.ean} ${x.modeloReferencia} ${x.fabricante}`;
      return upper(hay).includes(qq);
    });
  }, [eans, q, fFab]);

  const incluir = () => {
    if (existente) return onSelect(existente);

    const ean = norm(novoEan);
    const modeloReferencia = norm(novoModelo);
    let fabricante = upper(novoFab);
    if (!fabricante) fabricante = detectarFabricanteDoModelo(modeloReferencia);

    if (!ean || !modeloReferencia) return setMsgAdd("Informe EAN/GTIN e Modelo referência.");
    if (!fabricante) return setMsgAdd("Informe o Fabricante.");
    if (eans.some((x) => upper(x.ean) === upper(ean))) return setMsgAdd("EAN/GTIN já cadastrado.");

    onAdd({ ean, modeloReferencia, fabricante, createdAt: agoraBR(), createdBy: USUARIO_ATUAL });
    setNovoEan("");
    setNovoModelo("");
    setNovoFab("");
    setMsgAdd("Inclusão realizada.");
  };

  return (
    <ModalShell open={open} title="Selecionar EAN/GTIN" subtitle={`Cadastrados: ${eans.length}`} onClose={onClose} maxW="max-w-5xl">
      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 space-y-2">
        <div className="text-[11px] font-semibold text-slate-700">Incluir EAN/GTIN</div>

        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">EAN/GTIN</label>
            <input
              value={novoEan}
              onChange={(e) => {
                setNovoEan(e.target.value);
                setMsgAdd("");
              }}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono"
            />
          </div>

          <div className="col-span-12 md:col-span-6 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">MODELO REFERÊNCIA</label>
            <input
              value={novoModelo}
              readOnly={!!existente}
              onChange={(e) => {
                if (existente) return;
                setNovoModelo(e.target.value);
                setMsgAdd("");
              }}
              className={`h-9 rounded-xl border border-slate-300 px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${existente ? "bg-slate-50 cursor-not-allowed" : "bg-white"}`}
            />
          </div>

          <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">FABRICANTE</label>
            <input
              value={novoFab}
              readOnly={!!existente}
              onChange={(e) => {
                if (existente) return;
                setNovoFab(e.target.value);
                setMsgAdd("");
              }}
              className={`h-9 rounded-xl border border-slate-300 px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase ${existente ? "bg-slate-50 cursor-not-allowed" : "bg-white"}`}
            />
          </div>

          <div className="col-span-12 md:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={incluir}
              className="h-9 w-full px-2.5 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center justify-center gap-1.5"
              title={existente ? "Carregar" : "Incluir"}
            >
              <Plus size={14} />
              {existente ? "CARREGAR" : "INCLUIR"}
            </button>
          </div>
        </div>

        {msgAdd && <div className="text-[11px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{msgAdd}</div>}
      </div>

      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 md:col-span-8 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">PESQUISA</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por EAN/GTIN, modelo referência ou fabricante"
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <div className="col-span-12 md:col-span-4 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">FILTRO (FABRICANTE)</label>
          <select
            value={fFab}
            onChange={(e) => setFFab(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-2 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="TODOS">TODOS</option>
            {fabs.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-x-auto bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left w-8">#</th>
              <th className="px-2 py-2 text-left w-24">Data</th>
              <th className="px-2 py-2 text-left w-28">Incluído por</th>
              <th className="px-2 py-2 text-left w-32">EAN/GTIN</th>
              <th className="px-2 py-2 text-left">Modelo referência</th>
              <th className="px-2 py-2 text-left w-28">Fabricante</th>
              <th className="px-2 py-2 text-right w-28">Ação</th>
            </tr>
          </thead>
          <tbody>
            {!lista.length && (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-center text-[11px] text-slate-400">
                  Nenhum resultado.
                </td>
              </tr>
            )}
            {lista.map((x, i) => (
              <tr key={x.ean} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-500">{i + 1}</td>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-700 whitespace-nowrap">{x.createdAt || "-"}</td>
                <td className="px-2 py-2 align-middle text-[11px] font-medium text-slate-800 whitespace-nowrap">{x.createdBy || "-"}</td>
                <td className="px-2 py-2 align-middle text-[11px] font-mono text-slate-800 whitespace-nowrap">{x.ean}</td>
                <td className="px-2 py-2 align-middle text-[11px] font-semibold text-slate-800" title={x.modeloReferencia}>
                  {x.modeloReferencia}
                </td>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-700 whitespace-nowrap">{x.fabricante}</td>
                <td className="px-2 py-2 align-middle text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(x)}
                    className="h-8 px-2.5 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    CARREGAR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
};

const ModalCodigosNF: React.FC<{
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
  const [q, setQ] = useState("");
  const [fRevenda, setFRevenda] = useState<string>("TODOS");

  useEffect(() => {
    if (!open) {
      setQ("");
      setFRevenda("TODOS");
    }
  }, [open]);

  const revendas = useMemo(() => {
    const s = new Set<string>();
    codigosNF.forEach((x) => {
      const r = upper(x.revenda);
      if (r) s.add(r);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [codigosNF]);

  const lista = useMemo(() => {
    const qq = upper(q);
    return codigosNF.filter((x) => {
      if (fRevenda !== "TODOS" && upper(x.revenda) !== fRevenda) return false;
      if (!qq) return true;
      const hay = `${x.createdAt || ""} ${x.createdBy || ""} ${x.codigo || ""} ${x.revenda || ""}`;
      return upper(hay).includes(qq);
    });
  }, [codigosNF, q, fRevenda]);

  return (
    <ModalShell open={open} title="Cadastro de Códigos NF" subtitle={`EAN / GTIN: ${master.ean || "-"}`} onClose={onClose} maxW="max-w-3xl">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 md:col-span-3 lg:col-span-2 flex">
          <button
            type="button"
            onClick={onPesquisarRevenda}
            className="h-9 w-full px-3 rounded-xl text-[11px] font-semibold border border-slate-300 bg-white hover:bg-slate-50 inline-flex items-center justify-center gap-2 text-slate-700"
          >
            <Search size={16} />
            PESQUISAR
          </button>
        </div>
        <div className="col-span-12 md:col-span-5 lg:col-span-6 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">REVENDA/CLIENTE</label>
          <input
            value={revendaAtual}
            readOnly
            className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
          />
        </div>
        <div className="col-span-12 md:col-span-2 lg:col-span-2 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">CÓDIGO NF</label>
          <input
            value={nfAtual}
            onChange={(e) => onChangeNF(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
          />
        </div>
        <div className="col-span-12 md:col-span-2 lg:col-span-2 flex sm:justify-end">
          <button
            type="button"
            onClick={onAdd}
            className="w-full sm:w-auto px-3 h-9 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            INCLUIR
          </button>
        </div>
      </div>

      {mensagem && <div className="text-[12px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{mensagem}</div>}

      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 md:col-span-7 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">PESQUISA GERAL</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por data, incluído por, revenda/cliente ou código NF"
            className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <div className="col-span-12 md:col-span-5 flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-600 tracking-wide">FILTRO (REVENDA/CLIENTE)</label>
          <select
            value={fRevenda}
            onChange={(e) => setFRevenda(e.target.value)}
            className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="TODOS">TODOS</option>
            {revendas.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-x-auto overflow-y-auto">
        <table className="w-full border-collapse text-xs table-fixed">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left w-8">#</th>
              <th className="px-1.5 py-2 text-left w-24">Data</th>
              <th className="px-1.5 py-2 text-left w-24">Incluído por</th>
              <th className="px-1.5 py-2 text-left w-28">Código NF</th>
              <th className="px-2 py-2 text-left">Revenda/cliente</th>
              <th className="px-1.5 py-2 text-right w-12">Alterar</th>
              <th className="px-1.5 py-2 text-right w-14">Excluir</th>
            </tr>
          </thead>
          <tbody>
            {!lista.length && (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-center text-[11px] text-slate-400">
                  Nenhum Código NF encontrado.
                </td>
              </tr>
            )}
            {lista.map((x, i) => (
              <tr key={x.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-2 py-2 align-middle text-[11px] text-slate-500">{i + 1}</td>
                <td className="px-1.5 py-2 align-middle text-[11px] text-slate-700 whitespace-nowrap">{x.createdAt || "-"}</td>
                <td className="px-1.5 py-2 align-middle text-[11px] font-medium text-slate-800 whitespace-nowrap">{x.createdBy || "-"}</td>
                <td className="px-1.5 py-2 align-middle text-[11px] text-slate-800 whitespace-nowrap">{x.codigo}</td>
                <td className="px-2 py-2 align-middle text-[11px] font-semibold text-slate-800 truncate" title={x.revenda}>
                  {x.revenda}
                </td>
                <td className="px-1.5 py-2 align-middle text-right">
                  <IconBtn title="Alterar" variant="primary" onClick={() => onEditar(x.id)}>
                    <Pencil size={16} />
                  </IconBtn>
                </td>
                <td className="px-1.5 py-2 align-middle text-right">
                  <IconBtn title="Excluir" variant="danger" onClick={() => onRemover(x.id)}>
                    <Trash2 size={16} />
                  </IconBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
};

const ModalPecas: React.FC<{
  open: boolean;
  title: string;
  master: Master;
  modeloFabricante?: string;
  form: { codigoPeca?: string; descricao: string };
  mensagem: string;
  emptyText: string;
  addLabel: string;
  onClose: () => void;
  onChangeCodigo?: (v: string) => void;
  onChangeDescricao: (v: string) => void;
  onAdd: () => void;
  lista: PecaBase[];
  onRemover: (id: number) => void;
  sugestoes?: string[];
}> = ({
  open,
  title,
  master,
  modeloFabricante,
  form,
  mensagem,
  emptyText,
  addLabel,
  onClose,
  onChangeCodigo,
  onChangeDescricao,
  onAdd,
  lista,
  onRemover,
  sugestoes,
}) => {
    return (
      <ModalShell
        open={open}
        title={title}
        subtitle={`EAN / GTIN: ${master.ean || "-"}${modeloFabricante ? ` • Modelo Fabricante: ${modeloFabricante}` : ""}`}
        onClose={onClose}
        maxW="max-w-4xl"
      >
        <div className="grid grid-cols-12 gap-2 items-end">
          {onChangeCodigo ? (
            <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-600 tracking-wide">CÓDIGO PEÇA</label>
              <input
                value={form.codigoPeca || ""}
                onChange={(e) => onChangeCodigo(e.target.value)}
                className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
              />
            </div>
          ) : null}

          <div className={`col-span-12 ${onChangeCodigo ? "md:col-span-7" : "md:col-span-9"} flex flex-col gap-1.5`}>
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">DESCRIÇÃO</label>
            <input
              value={form.descricao}
              onChange={(e) => onChangeDescricao(e.target.value)}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div className={`col-span-12 ${onChangeCodigo ? "md:col-span-2" : "md:col-span-3"} flex sm:justify-end`}>
            <button
              type="button"
              onClick={onAdd}
              className="w-full sm:w-auto px-3 h-9 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              {addLabel}
            </button>
          </div>
        </div>

        {!!sugestoes?.length && (
          <div className="flex flex-wrap gap-2">
            {sugestoes.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => onChangeDescricao(s)}
                className="px-2 h-8 rounded-xl text-[11px] font-semibold border border-slate-200 bg-white hover:bg-slate-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {mensagem && <div className="text-[12px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{mensagem}</div>}

        <div className="rounded-2xl border border-slate-200 overflow-x-auto overflow-y-auto max-h-[320px]">
          <table className="w-full border-collapse text-xs min-w-[760px]">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left w-10">#</th>
                <th className="px-1.5 py-1 text-left w-24">Data</th>
                <th className="px-1.5 py-1 text-left w-24">Incluído por</th>
                {onChangeCodigo ? <th className="px-1.5 py-1 text-left w-24">Código peça</th> : null}
                <th className="px-2 py-1.5 text-left">Descrição</th>
                <th className="px-2 py-1.5 text-right w-14">Excluir</th>
              </tr>
            </thead>
            <tbody>
              {!lista.length && (
                <tr>
                  <td colSpan={onChangeCodigo ? 6 : 5} className="px-3 py-3 text-center text-[11px] text-slate-400">
                    {emptyText}
                  </td>
                </tr>
              )}
              {lista.map((x, i) => (
                <tr key={x.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-2 py-1.5 align-middle text-[11px] text-slate-500">{i + 1}</td>
                  <td className="px-1.5 py-1 align-middle text-[11px] text-slate-700 whitespace-nowrap">{x.createdAt || "-"}</td>
                  <td className="px-1.5 py-1 align-middle text-[11px] font-medium text-slate-800 whitespace-nowrap">{x.createdBy || "-"}</td>
                  {onChangeCodigo ? <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800">{x.codigoPeca}</td> : null}
                  <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800">{x.descricao}</td>
                  <td className="px-2 py-1.5 align-middle text-right">
                    <IconBtn title="Excluir" variant="danger" onClick={() => onRemover(x.id)}>
                      <Trash2 size={16} />
                    </IconBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ModalShell>
    );
  };

const CadastroNF_EAN_Modelo = () => {
  const [registros, setRegistros] = useState<any[]>([]);
  const [eansCad, setEansCad] = useState<Master[]>(EANS_CADASTRADOS_INICIAL);

  const autoLoadRef = useRef("");

  const [master, setMaster] = useState<Master>({ ean: "", modeloReferencia: "", fabricante: "" });
  const [mensagem, setMensagem] = useState("");
  const [mostrarModalSucesso, setMostrarModalSucesso] = useState(false);

  const [mostrarAjuda, setMostrarAjuda] = useState(false);

  const [mostrarLookupEAN, setMostrarLookupEAN] = useState(false);

  const [mostrarPopupNF, setMostrarPopupNF] = useState(false);
  const [codigosNF, setCodigosNF] = useState<CodigoNF[]>([]);
  const [nfAtual, setNfAtual] = useState("");
  const [revendaNFAtual, setRevendaNFAtual] = useState("");
  const [mensagemNF, setMensagemNF] = useState("");
  const [editNfId, setEditNfId] = useState<number | null>(null);
  const [mostrarLookupRevenda, setMostrarLookupRevenda] = useState(false);

  const [modelosFabricante, setModelosFabricante] = useState<ModeloFabricante[]>([]);
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState<number | null>(null);
  const [modeloAtual, setModeloAtual] = useState("");
  const [codigoProdutoAtual, setCodigoProdutoAtual] = useState("");
  const [linhaAtual, setLinhaAtual] = useState("");
  const [mensagemModelo, setMensagemModelo] = useState("");
  const [editModeloId, setEditModeloId] = useState<number | null>(null);

  const [mostrarPopupEmbalagem, setMostrarPopupEmbalagem] = useState(false);
  const [embalagens, setEmbalagens] = useState<PecaBase[]>([]);
  const [formEmbalagem, setFormEmbalagem] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });
  const [mensagemEmbalagem, setMensagemEmbalagem] = useState("");

  const [mostrarPopupAcessorios, setMostrarPopupAcessorios] = useState(false);
  const [acessorios, setAcessorios] = useState<PecaBase[]>([]);
  const [formAcessorio, setFormAcessorio] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });
  const [mensagemAcessorio, setMensagemAcessorio] = useState("");

  const [mostrarPopupEstetica, setMostrarPopupEstetica] = useState(false);
  const [esteticas, setEsteticas] = useState<PecaBase[]>([]);
  const [formEstetica, setFormEstetica] = useState<{ codigoPeca: string; descricao: string }>({ codigoPeca: "", descricao: "" });
  const [mensagemEstetica, setMensagemEstetica] = useState("");

  const [mostrarPopupFuncionalPeca, setMostrarPopupFuncionalPeca] = useState(false);
  const [funcionaisPeca, setFuncionaisPeca] = useState<PecaBase[]>([]);
  const [formFuncionalPeca, setFormFuncionalPeca] = useState<{ codigoPeca: string; descricao: string }>({
    codigoPeca: "",
    descricao: "",
  });
  const [mensagemFuncionalPeca, setMensagemFuncionalPeca] = useState("");

  const [mostrarPopupFuncionalidade, setMostrarPopupFuncionalidade] = useState(false);
  const [funcionalidades, setFuncionalidades] = useState<PecaBase[]>([]);
  const [formFuncionalidade, setFormFuncionalidade] = useState<{ descricao: string }>({ descricao: "" });
  const [mensagemFuncionalidade, setMensagemFuncionalidade] = useState("");

  const [produtoDocs, setProdutoDocs] = useState<Record<ProdutoDocKey, FileMeta[]>>({
    fotoProduto: [],
    etiquetaProcel: [],
    kitAcessorio: [],
    manualUsuario: [],
  });

  const [modeloDocs, setModeloDocs] = useState<Record<number, Record<ModeloDocKey, FileMeta[]>>>({});
  const [itemFotos, setItemFotos] = useState<Record<string, FileMeta[]>>({});

  const [filtroModeloReferencia, setFiltroModeloReferencia] = useState(true);
  const [filtroModeloFabricante, setFiltroModeloFabricante] = useState(true);
  const [filtroModeloFabricanteId, setFiltroModeloFabricanteId] = useState<number | "TODOS">("TODOS");

  useEffect(() => {
    if (modeloSelecionadoId && filtroModeloFabricanteId === "TODOS") setFiltroModeloFabricanteId(modeloSelecionadoId);
  }, [modeloSelecionadoId, filtroModeloFabricanteId]);

  const [arquivosCtx, setArquivosCtx] = useState<ModalArquivosKey | null>(null);

  const upsertRegistroCache = (registro: any) => {
    const eanKey = upper(registro?.ean);
    if (!eanKey) return;
    setRegistros((prev) => {
      const semMesmoEan = prev.filter((item) => upper(item?.ean) !== eanKey);
      return [registro, ...semMesmoEan];
    });
  };

  const upsertMasterCache = (item: Master) => {
    const eanKey = upper(item?.ean);
    if (!eanKey) return;
    setEansCad((prev) => {
      const semMesmoEan = prev.filter((m) => upper(m?.ean) !== eanKey);
      return [item, ...semMesmoEan];
    });
  };

  useEffect(() => {
    let active = true;
    const carregarUltimosProdutos = async () => {
      try {
        const latest: any[] = await ProductApiService.getLatestProducts(200);
        if (!active || !Array.isArray(latest) || latest.length === 0) return;

        const mapped = latest.map(mapApiProductToRegistro).filter((item) => !!norm(item?.ean));
        if (mapped.length === 0) return;

        setRegistros((prev) => {
          const map = new Map<string, any>();
          [...prev, ...mapped].forEach((item) => {
            const key = upper(item?.ean);
            if (key) map.set(key, item);
          });
          return Array.from(map.values());
        });

        setEansCad((prev) => {
          const map = new Map<string, Master>();
          [...prev, ...mapped.map(toMasterFromRegistro)].forEach((item) => {
            const key = upper(item?.ean);
            if (key) map.set(key, item);
          });
          return Array.from(map.values());
        });
      } catch (error) {
        console.error("Falha ao carregar produtos salvos:", error);
      }
    };

    void carregarUltimosProdutos();
    return () => {
      active = false;
    };
  }, []);

  const lookupDescricao = (codigoPeca: string) => {
    const cod = upper(codigoPeca);
    if (!cod) return "";
    const base = lookupDescricaoPorCodigoBase(cod);
    if (base) return base;
    const all = [...embalagens, ...acessorios, ...esteticas, ...funcionaisPeca];
    const found = all.find((x) => upper(x.codigoPeca || "") === cod);
    return found?.descricao || "";
  };

  const masterPreenchido = useMemo(() => !!norm(master.ean) && !!norm(master.modeloReferencia), [master]);

  const modeloSelecionado = useMemo(
    () => (modeloSelecionadoId ? modelosFabricante.find((m) => m.id === modeloSelecionadoId) || null : null),
    [modeloSelecionadoId, modelosFabricante]
  );

  const existeDuplicidadeMaster = () => {
    const ean = upper(master.ean);
    return registros.some((r) => upper(r?.ean) === ean);
  };

  const handleChangeMaster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMensagem("");

    setMaster((p) => {
      const next = { ...p, [name]: value } as Master;
      if (name === "modeloReferencia") {
        const fab = detectarFabricanteDoModelo(value);
        if (fab && !norm(p.fabricante)) next.fabricante = fab;
      }
      if (name === "fabricante") next.fabricante = upper(value);
      return next;
    });
  };

  const limparVinculos = () => {
    setCodigosNF([]);
    setNfAtual("");
    setRevendaNFAtual("");
    setMensagemNF("");
    setEditNfId(null);
    setMostrarLookupRevenda(false);

    setModeloAtual("");
    setCodigoProdutoAtual("");
    setLinhaAtual("");
    setModelosFabricante([]);
    setModeloSelecionadoId(null);
    setEditModeloId(null);
    setMensagemModelo("");

    setAcessorios([]);
    setFormAcessorio({ codigoPeca: "", descricao: "" });
    setMensagemAcessorio("");

    setEmbalagens([]);
    setFormEmbalagem({ codigoPeca: "", descricao: "" });
    setMensagemEmbalagem("");

    setEsteticas([]);
    setFormEstetica({ codigoPeca: "", descricao: "" });
    setMensagemEstetica("");

    setFuncionaisPeca([]);
    setFormFuncionalPeca({ codigoPeca: "", descricao: "" });
    setMensagemFuncionalPeca("");

    setFuncionalidades([]);
    setFormFuncionalidade({ descricao: "" });
    setMensagemFuncionalidade("");

    setProdutoDocs({ fotoProduto: [], etiquetaProcel: [], kitAcessorio: [], manualUsuario: [] });
    setModeloDocs({});
    setItemFotos({});
    setArquivosCtx(null);
  };

  const carregarSimulacao = (s: any) => {
    limparVinculos();

    const fabricante = detectarFabricanteDoModelo(s.modeloReferencia) || "PHILCO";
    setMaster({ ean: s.ean, modeloReferencia: s.modeloReferencia, fabricante });

    setCodigosNF(
      (s.codigosNF || []).map((x: any, i: number) => ({
        id: Date.now() + i,
        codigo: upper(x.codigo),
        revenda: upper(x.revenda),
        createdAt: agoraBR(),
        createdBy: USUARIO_ATUAL,
      }))
    );

    const base = Date.now() + 100;
    const mods = (s.modelosFabricante || []).map((m: any, i: number) => ({
      id: base + i,
      nome: norm(m.nome),
      codigoProduto: upper(m.codigoProduto),
      linha: upper(m.linha || detectarLinhaDoModeloFabricante(m.nome) || ""),
      createdAt: agoraBR(),
      createdBy: USUARIO_ATUAL,
    }));
    setModelosFabricante(mods);
    const selId = mods[0]?.id || null;
    setModeloSelecionadoId(selId);

    setEmbalagens(
      (s.embalagens || []).map((x: any, i: number) => ({
        id: Date.now() + 200 + i,
        codigoPeca: upper(x.codigo),
        descricao: norm(x.descricao),
        createdAt: agoraBR(),
        createdBy: USUARIO_ATUAL,
      }))
    );

    setAcessorios(
      (s.acessorios || []).map((x: any, i: number) => ({
        id: Date.now() + 300 + i,
        codigoPeca: upper(x.codigo),
        descricao: norm(x.descricao),
        createdAt: agoraBR(),
        createdBy: USUARIO_ATUAL,
      }))
    );

    setEsteticas(
      (s.esteticas || []).map((x: any, i: number) => ({
        id: Date.now() + 400 + i,
        codigoPeca: upper(x.codigo),
        descricao: norm(x.descricao),
        modeloId: selId || 0,
        createdAt: agoraBR(),
        createdBy: USUARIO_ATUAL,
      }))
    );

    setFuncionaisPeca(
      (s.funcionaisPeca || []).map((x: any, i: number) => ({
        id: Date.now() + 500 + i,
        codigoPeca: upper(x.codigo),
        descricao: norm(x.descricao),
        modeloId: selId || 0,
        createdAt: agoraBR(),
        createdBy: USUARIO_ATUAL,
      }))
    );

    setFuncionalidades(
      (s.funcionalidades || []).map((d: any, i: number) => ({
        id: Date.now() + 600 + i,
        descricao: norm(d),
        createdAt: agoraBR(),
        createdBy: USUARIO_ATUAL,
      }))
    );

    setMensagem("Dados carregados automaticamente.");
  };

  const carregarRegistro = (r: any) => {
    limparVinculos();

    setMaster({ ean: String(r?.ean || ""), modeloReferencia: String(r?.modeloReferencia || ""), fabricante: String(r?.fabricante || "") });
    setCodigosNF((r?.codigosNF || []) as CodigoNF[]);
    setModelosFabricante((r?.modelosFabricante || []) as ModeloFabricante[]);
    setModeloSelecionadoId(r?.modeloSelecionadoId || null);
    setEmbalagens((r?.embalagens || []) as PecaBase[]);
    setAcessorios((r?.acessorios || []) as PecaBase[]);
    setEsteticas((r?.esteticas || []) as PecaBase[]);
    setFuncionaisPeca((r?.funcionaisPeca || []) as PecaBase[]);
    setFuncionalidades((r?.funcionalidades || []) as PecaBase[]);

    setMensagem("Dados carregados automaticamente.");
  };

  const carregarPorEan = async (ean: string) => {
    const ue = upper(ean);
    if (!ue) return;

    const reg = registros.find((x) => upper(x?.ean) === ue);
    if (reg) return carregarRegistro(reg);

    const sim = SIMULACAO_GROMIT.find((x) => upper(x?.ean) === ue);
    if (sim) return carregarSimulacao(sim);

    const m = eansCad.find((x) => upper(x.ean) === ue);
    if (m) {
      limparVinculos();
      setMaster({ ean: m.ean, modeloReferencia: m.modeloReferencia, fabricante: m.fabricante });
      setMensagem("Dados carregados automaticamente.");
      return;
    }

    try {
      const remoto = await ProductApiService.getProductByEan(ue);
      if (!remoto) return;

      const registroMapeado = mapApiProductToRegistro(remoto);
      carregarRegistro(registroMapeado);
      upsertRegistroCache(registroMapeado);
      upsertMasterCache(toMasterFromRegistro(registroMapeado));
    } catch (error) {
      console.error("Falha ao carregar produto por EAN:", error);
    }
  };

  useEffect(() => {
    const e = upper(master.ean);
    if (!e) {
      autoLoadRef.current = "";
      return;
    }

    const hit =
      registros.some((r) => upper(r?.ean) === e) ||
      SIMULACAO_GROMIT.some((s) => upper(s?.ean) === e) ||
      eansCad.some((m) => upper(m.ean) === e);

    const shouldTryLookup = hit || e.length >= 8;
    if (!shouldTryLookup) return;
    if (autoLoadRef.current === e) return;

    autoLoadRef.current = e;
    void carregarPorEan(e);
  }, [master.ean, registros, eansCad]);

  const abrirCodigosNF = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    setMensagem("");
    setMostrarPopupNF(true);
  };

  const abrirEmbalagem = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    setMensagem("");
    setMostrarPopupEmbalagem(true);
  };

  const abrirAcessorios = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    setMensagem("");
    setMostrarPopupAcessorios(true);
  };

  const abrirEstetica = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    if (!modeloSelecionadoId) return setMensagem("Selecione um Modelo Fabricante.");
    setMensagem("");
    setMostrarPopupEstetica(true);
  };

  const abrirFuncionalPeca = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    if (!modeloSelecionadoId) return setMensagem("Selecione um Modelo Fabricante.");
    setMensagem("");
    setMostrarPopupFuncionalPeca(true);
  };

  const abrirFuncionalidade = () => {
    if (!norm(master.ean)) return setMensagem("Preencha EAN / GTIN.");
    setMensagem("");
    setMostrarPopupFuncionalidade(true);
  };

  const addCodigoNF = () => {
    const codigo = upper(nfAtual);
    const revenda = upper(revendaNFAtual);
    if (!codigo || !revenda) return setMensagemNF("Informe Código NF e selecione Revenda/Cliente.");

    const dup = codigosNF.some((x) => upper(x.codigo) === codigo && upper(x.revenda) === revenda && x.id !== editNfId);
    if (dup) return setMensagemNF("Código NF já cadastrado para esta revenda.");

    if (editNfId) {
      setCodigosNF((p) => p.map((x) => (x.id === editNfId ? { ...x, codigo, revenda } : x)));
      setEditNfId(null);
    } else {
      setCodigosNF((p) => [...p, { id: Date.now(), codigo, revenda, createdAt: agoraBR(), createdBy: USUARIO_ATUAL }]);
    }

    setNfAtual("");
    setRevendaNFAtual("");
    setMensagemNF("");
  };

  const editarCodigoNF = (id: number) => {
    const nf = codigosNF.find((x) => x.id === id);
    if (!nf) return;
    setEditNfId(id);
    setNfAtual(nf.codigo);
    setRevendaNFAtual(nf.revenda);
    setMensagemNF("Modo alteração: edite e clique em Incluir.");
  };

  const removerCodigoNF = (id: number) => {
    setCodigosNF((p) => p.filter((x) => x.id !== id));
    if (editNfId === id) {
      setEditNfId(null);
      setNfAtual("");
      setRevendaNFAtual("");
      setMensagemNF("");
    }
  };

  const addModelo = () => {
    const nome = norm(modeloAtual);
    const codigoProduto = upper(codigoProdutoAtual);
    const linha = upper(linhaAtual || detectarLinhaDoModeloFabricante(nome));
    if (!nome || !codigoProduto || !linha) return setMensagemModelo("Informe Modelo Fabricante, Código do Produto e Linha.");

    const dup = modelosFabricante.some(
      (m) => upper(m.nome) === upper(nome) && upper(m.codigoProduto) === codigoProduto && m.id !== editModeloId
    );
    if (dup) return setMensagemModelo("Modelo Fabricante já cadastrado.");

    if (editModeloId) {
      setModelosFabricante((p) => p.map((m) => (m.id === editModeloId ? { ...m, nome, codigoProduto, linha } : m)));
      setEditModeloId(null);
    } else {
      const id = Date.now();
      setModelosFabricante((p) => [...p, { id, nome, codigoProduto, linha, createdAt: agoraBR(), createdBy: USUARIO_ATUAL }]);
      if (!modeloSelecionadoId) setModeloSelecionadoId(id);
    }

    setModeloAtual("");
    setCodigoProdutoAtual("");
    setLinhaAtual("");
    setMensagemModelo("");
  };

  const editarModelo = (id: number) => {
    const m = modelosFabricante.find((x) => x.id === id);
    if (!m) return;
    setEditModeloId(id);
    setModeloAtual(m.nome);
    setCodigoProdutoAtual(m.codigoProduto);
    setLinhaAtual(m.linha);
    setMensagemModelo("Modo alteração: edite e clique em Incluir.");
  };

  const removerModelo = (id: number) => {
    setModelosFabricante((p) => p.filter((x) => x.id !== id));
    setModeloDocs((p) => {
      const n = { ...p };
      delete (n as any)[id];
      return n;
    });
    setEsteticas((p) => p.filter((x) => (x.modeloId || 0) !== id));
    setFuncionaisPeca((p) => p.filter((x) => (x.modeloId || 0) !== id));
    if (modeloSelecionadoId === id) setModeloSelecionadoId(null);
    if (editModeloId === id) {
      setEditModeloId(null);
      setModeloAtual("");
      setCodigoProdutoAtual("");
      setLinhaAtual("");
    }
  };

  const addItemGenerico = (
    form: { codigoPeca: string; descricao: string },
    setForm: React.Dispatch<React.SetStateAction<{ codigoPeca: string; descricao: string }>>,
    setLista: React.Dispatch<React.SetStateAction<PecaBase[]>>,
    setMsg: (t: string) => void,
    opts?: { vincularModelo?: boolean; dupWithin?: PecaBase[] }
  ) => {
    const vincularModelo = !!opts?.vincularModelo;
    const codigoPeca = upper(form.codigoPeca);
    const descricao = norm(form.descricao);

    if (!codigoPeca || !descricao) return setMsg("Informe o código peça e a descrição.");
    const mid = vincularModelo ? modeloSelecionadoId || 0 : 0;

    const scope =
      opts?.dupWithin ||
      (vincularModelo ? [...esteticas, ...funcionaisPeca] : [...acessorios, ...embalagens]);

    const dup = scope.some(
      (x) => upper(x.codigoPeca || "") === codigoPeca && (vincularModelo ? (x.modeloId || 0) === mid : true)
    );
    if (dup) return setMsg("Item já cadastrado.");

    const item: PecaBase = {
      id: Date.now(),
      codigoPeca,
      descricao,
      ...(vincularModelo ? { modeloId: mid } : {}),
      createdAt: agoraBR(),
      createdBy: USUARIO_ATUAL,
    };

    setLista((p) => [...p, item]);
    setForm({ codigoPeca: "", descricao: "" });
    setMsg("");
  };

  const addFuncionalidade = () => {
    const descricao = norm(formFuncionalidade.descricao);
    if (!descricao) return setMensagemFuncionalidade("Informe a descrição.");
    const dup = funcionalidades.some((x) => upper(x.descricao) === upper(descricao));
    if (dup) return setMensagemFuncionalidade("Funcionalidade já cadastrada.");
    setFuncionalidades((p) => [...p, { id: Date.now(), descricao, createdAt: agoraBR(), createdBy: USUARIO_ATUAL }]);
    setFormFuncionalidade({ descricao: "" });
    setMensagemFuncionalidade("");
  };

  const mergedEsteticaFuncional = useMemo(() => {
    const map = new Map<string, { tipo: string; codigoPeca: string; descricao: string; modeloId: number }>();

    const add = (tipo: "ESTÉTICA" | "FUNCIONAL", item: PecaBase) => {
      const codigoPeca = upper(item.codigoPeca || "");
      const modeloId = item.modeloId || 0;
      const k = `${modeloId}|${codigoPeca}`;
      const cur = map.get(k);
      if (!cur) map.set(k, { tipo, codigoPeca, descricao: item.descricao, modeloId });
      else map.set(k, { ...cur, tipo: "ESTÉTICO/FUNCIONAL" });
    };

    esteticas.forEach((x) => add("ESTÉTICA", x));
    funcionaisPeca.forEach((x) => add("FUNCIONAL", x));

    return Array.from(map.values());
  }, [esteticas, funcionaisPeca]);

  const itensResumo = useMemo(() => {
    const ref = norm(master.modeloReferencia) || "-";
    const getModeloFab = (id: number) => modelosFabricante.find((m) => m.id === id)?.nome || "-";

    const rows: Array<
      {
        tipo: string;
        codigoPeca?: string;
        descricao: string;
        modeloId?: number;
        vinculo: string;
        vinculoTipo: "MODELO_REFERENCIA" | "MODELO_FABRICANTE";
      } & { rowKey: string }
    > = [];

    embalagens.forEach((x) =>
      rows.push({
        tipo: "EMBALAGEM",
        codigoPeca: x.codigoPeca,
        descricao: x.descricao,
        vinculo: ref,
        vinculoTipo: "MODELO_REFERENCIA",
        rowKey: `EMBALAGEM|${upper(x.codigoPeca)}|0`,
      })
    );

    acessorios.forEach((x) =>
      rows.push({
        tipo: "ACESSÓRIO",
        codigoPeca: x.codigoPeca,
        descricao: x.descricao,
        vinculo: ref,
        vinculoTipo: "MODELO_REFERENCIA",
        rowKey: `ACESSORIO|${upper(x.codigoPeca)}|0`,
      })
    );

    mergedEsteticaFuncional.forEach((x) =>
      rows.push({
        tipo: x.tipo,
        codigoPeca: x.codigoPeca,
        descricao: x.descricao,
        modeloId: x.modeloId,
        vinculo: getModeloFab(x.modeloId),
        vinculoTipo: "MODELO_FABRICANTE",
        rowKey: `PECA|${upper(x.codigoPeca)}|${x.modeloId}`,
      })
    );

    funcionalidades.forEach((x) =>
      rows.push({
        tipo: "FUNCIONALIDADE",
        descricao: x.descricao,
        vinculo: ref,
        vinculoTipo: "MODELO_REFERENCIA",
        rowKey: `FUNCIONALIDADE|${upper(x.descricao)}|0`,
      })
    );

    return rows;
  }, [embalagens, acessorios, mergedEsteticaFuncional, funcionalidades, master.modeloReferencia, modelosFabricante]);

  const itensFiltrados = useMemo(() => {
    return itensResumo.filter((r) => {
      if (r.vinculoTipo === "MODELO_REFERENCIA") return filtroModeloReferencia;
      if (!filtroModeloFabricante) return false;
      if (filtroModeloFabricanteId === "TODOS") return true;
      return (r.modeloId || 0) === filtroModeloFabricanteId;
    });
  }, [itensResumo, filtroModeloReferencia, filtroModeloFabricante, filtroModeloFabricanteId]);

  const getArquivosInfo = useMemo(() => {
    if (!arquivosCtx)
      return {
        open: false,
        title: "",
        accept: "",
        files: [] as FileMeta[],
        onAdd: (_: FileList) => { },
        onRemove: (_: number) => { },
      };

    const baseAdd = (arr: FileMeta[], fl: FileList) => {
      const now = Date.now();
      const next = [...arr];
      Array.from(fl).forEach((f, i) => next.push({ id: now + i, file: f, name: f.name, createdAt: agoraBR(), createdBy: USUARIO_ATUAL }));
      return next;
    };

    if (arquivosCtx.kind === "produto") {
      const titles: Record<ProdutoDocKey, string> = {
        fotoProduto: "Foto do produto",
        etiquetaProcel: "Etiqueta Procel",
        kitAcessorio: "Kit acessório",
        manualUsuario: "Manual do usuário (PDF)",
      };
      const acceptMap: Record<ProdutoDocKey, string> = {
        fotoProduto: "image/*",
        etiquetaProcel: "image/*",
        kitAcessorio: "image/*",
        manualUsuario: "application/pdf",
      };
      const doc = arquivosCtx.doc;
      return {
        open: true,
        title: titles[doc],
        accept: acceptMap[doc],
        files: produtoDocs[doc] || [],
        onAdd: (fl: FileList) => setProdutoDocs((p) => ({ ...p, [doc]: baseAdd(p[doc] || [], fl) })),
        onRemove: (id: number) => setProdutoDocs((p) => ({ ...p, [doc]: (p[doc] || []).filter((x) => x.id !== id) })),
      };
    }

    if (arquivosCtx.kind === "modelo") {
      const titles: Record<ModeloDocKey, string> = {
        vistaExplodida: "Vista explodida",
        boletimTecnico: "Boletim técnico",
        manualTecnico: "Manual técnico",
      };
      const acceptMap: Record<ModeloDocKey, string> = {
        vistaExplodida: "application/pdf,image/*",
        boletimTecnico: "application/pdf,image/*",
        manualTecnico: "application/pdf,image/*",
      };
      const doc = arquivosCtx.doc;
      const mid = arquivosCtx.modeloId;
      const cur = modeloDocs[mid] || { vistaExplodida: [], boletimTecnico: [], manualTecnico: [] };
      return {
        open: true,
        title: `${titles[doc]} — ${modelosFabricante.find((m) => m.id === mid)?.nome || "Modelo"}`,
        accept: acceptMap[doc],
        files: cur[doc] || [],
        onAdd: (fl: FileList) =>
          setModeloDocs((p) => {
            const next = { ...p };
            const now = next[mid] || { vistaExplodida: [], boletimTecnico: [], manualTecnico: [] };
            next[mid] = { ...now, [doc]: baseAdd(now[doc] || [], fl) };
            return next;
          }),
        onRemove: (id: number) =>
          setModeloDocs((p) => {
            const next = { ...p };
            const now = next[mid] || { vistaExplodida: [], boletimTecnico: [], manualTecnico: [] };
            next[mid] = { ...now, [doc]: (now[doc] || []).filter((x) => x.id !== id) };
            return next;
          }),
      };
    }

    const title = arquivosCtx.title;
    const rowKey = arquivosCtx.rowKey;
    return {
      open: true,
      title,
      accept: "image/*",
      files: itemFotos[rowKey] || [],
      onAdd: (fl: FileList) => setItemFotos((p) => ({ ...p, [rowKey]: baseAdd(p[rowKey] || [], fl) })),
      onRemove: (id: number) => setItemFotos((p) => ({ ...p, [rowKey]: (p[rowKey] || []).filter((x) => x.id !== id) })),
    };
  }, [arquivosCtx, produtoDocs, modeloDocs, itemFotos, modelosFabricante]);

  const openArquivos = (ctx: ModalArquivosKey) => setArquivosCtx(ctx);
  const closeArquivos = () => setArquivosCtx(null);

  const excluirItemVinculado = (r: any) => {
    const tipo = upper(r?.tipo);
    const codigoPeca = upper(r?.codigoPeca || "");
    const descricao = upper(r?.descricao || "");
    const modeloId = Number(r?.modeloId || 0);

    if (tipo === "EMBALAGEM") setEmbalagens((p) => p.filter((x) => upper(x.codigoPeca || "") !== codigoPeca));
    else if (tipo === "ACESSÓRIO") setAcessorios((p) => p.filter((x) => upper(x.codigoPeca || "") !== codigoPeca));
    else if (tipo === "FUNCIONALIDADE") setFuncionalidades((p) => p.filter((x) => upper(x.descricao) !== descricao));
    else if (tipo === "ESTÉTICA")
      setEsteticas((p) => p.filter((x) => !((x.modeloId || 0) === modeloId && upper(x.codigoPeca || "") === codigoPeca)));
    else if (tipo === "FUNCIONAL")
      setFuncionaisPeca((p) => p.filter((x) => !((x.modeloId || 0) === modeloId && upper(x.codigoPeca || "") === codigoPeca)));
    else if (tipo === "ESTÉTICO/FUNCIONAL") {
      setEsteticas((p) => p.filter((x) => !((x.modeloId || 0) === modeloId && upper(x.codigoPeca || "") === codigoPeca)));
      setFuncionaisPeca((p) => p.filter((x) => !((x.modeloId || 0) === modeloId && upper(x.codigoPeca || "") === codigoPeca)));
    }

    setItemFotos((p) => {
      if (!p?.[r.rowKey]) return p;
      const n = { ...p };
      delete (n as any)[r.rowKey];
      return n;
    });
  };

  const salvar = async () => {
    if (!masterPreenchido) return setMensagem("Preencha EAN / GTIN e Modelo Referência.");
    if (!norm(master.fabricante)) return setMensagem("Informe o Fabricante.");
    // if (existeDuplicidadeMaster()) return setMensagem("EAN / GTIN já cadastrado."); // Permitir múltiplos registros (estoque/unidades)

    try {
      setMensagem("Salvando...");

      // Helper: converte array de FileMeta para base64 strings
      const filesToBase64 = async (files: FileMeta[]): Promise<string[]> => {
        return Promise.all(
          files.map(async (f) => {
            try { return await processImageToBase64(f.file); }
            catch { return f.name; } // fallback: nome do arquivo se falhar
          })
        );
      };

      const mapPeca = (p: PecaBase, tipo: ItemVinculado['tipo']): ItemVinculado => ({
        tipo,
        nome: p.descricao,
        codigo: p.codigoPeca,
        quantidade: 1,
        fotos: [] // será preenchido após conversão assíncrona abaixo
      });

      const mapFuncionalidade = (p: PecaBase): ItemVinculado => ({
        tipo: 'funcionalidade',
        nome: p.descricao,
        quantidade: 1
      });

      const mapPecaModelo = (p: PecaBase, tipo: 'estetica' | 'funcional'): ItemVinculado => ({
        tipo,
        nome: p.descricao,
        codigo: p.codigoPeca,
        quantidade: 1,
        fotos: itemFotos[`PECA|${upper(p.codigoPeca || '')}|${p.modeloId || 0}`]?.map(f => f.name) || []
      });

      const mappedModelos: DTOModeloFabricante[] = modelosFabricante.map(m => {
        const ests = esteticas.filter(e => e.modeloId === m.id);
        const funcs = funcionaisPeca.filter(f => f.modeloId === m.id);

        return {
          id: String(m.id),
          nome: m.nome,
          categoria: 'Geral', // Default
          codigoTipo: m.codigoProduto,
          linha: m.linha,
          estetica: ests.map(e => ({
            tipo: 'estetica',
            nome: e.descricao,
            codigo: e.codigoPeca,
            quantidade: 1,
            fotos: itemFotos[`PECA|${upper(e.codigoPeca || '')}|${m.id}`]?.map(f => f.name) || []
          })),
          funcional: funcs.map(f => ({
            tipo: 'funcional',
            nome: f.descricao,
            codigo: f.codigoPeca,
            quantidade: 1,
            fotos: itemFotos[`PECA|${upper(f.codigoPeca || '')}|${m.id}`]?.map(f => f.name) || []
          })),
          funcionalidades: [] // Not mapped in local state
        };
      });

      // Converter fotos do produto para base64
      const fotosBase64 = await filesToBase64(produtoDocs.fotoProduto);

      const dto: CreateProductDTO = {
        ean: master.ean,
        modeloRef: master.modeloReferencia,
        marca: master.fabricante,
        nfs: codigosNF.map(nf => ({ codigo: nf.codigo, revenda: nf.revenda })),
        modelos: mappedModelos,
        embalagem: embalagens.map(e => mapPeca(e, 'embalagem')),
        acessorios: acessorios.map(a => mapPeca(a, 'acessorio')),
        estetica: esteticas.map(e => mapPecaModelo(e, 'estetica')),
        funcional: funcionaisPeca.map(f => mapPecaModelo(f, 'funcional')),
        funcionalidade: funcionalidades.map(mapFuncionalidade),
        fotos: fotosBase64,  // base64 data URLs
        manualUrl: produtoDocs.manualUsuario[0]?.name
      };

      await ProductApiService.createProduct(dto);

      // Restore payload for local cache compatibility
      const payload = {
        ...master,
        codigosNF,
        modelosFabricante,
        modeloSelecionadoId,
        embalagens,
        acessorios,
        esteticas,
        funcionaisPeca,
        funcionalidades,
        produtoDocs: Object.fromEntries(Object.entries(produtoDocs).map(([k, v]) => [k, v.length])),
        modeloDocs: Object.fromEntries(
          Object.entries(modeloDocs).map(([mid, docs]) => [
            mid,
            Object.fromEntries(Object.entries(docs as any).map(([k, v]) => [k, (v as any[])?.length || 0])),
          ])
        ),
        itemFotos: Object.fromEntries(Object.entries(itemFotos).map(([k, v]) => [k, v.length])),
        criadoEm: agoraBR(),
        criadoPor: USUARIO_ATUAL,
      };

      upsertRegistroCache(payload);
      upsertMasterCache({
        ...master,
        createdAt: agoraBR(),
        createdBy: USUARIO_ATUAL,
      });
      setMensagem("");
      setMostrarModalSucesso(true);
      console.log("SALVO NO BANCO", dto);

      // Opcional: Limpar formulário após salvar?
      // limpar(); 
    } catch (err: any) {
      console.error(err);
      setMensagem("Erro ao salvar: " + (err.message || String(err)));
    }
  };

  const limpar = () => {
    setMaster({ ean: "", modeloReferencia: "", fabricante: "" });
    setCodigosNF([]);
    setNfAtual("");
    setRevendaNFAtual("");
    setMensagemNF("");
    setEditNfId(null);

    setModeloAtual("");
    setCodigoProdutoAtual("");
    setLinhaAtual("");
    setModelosFabricante([]);
    setModeloSelecionadoId(null);
    setEditModeloId(null);
    setMensagemModelo("");

    setAcessorios([]);
    setFormAcessorio({ codigoPeca: "", descricao: "" });
    setMensagemAcessorio("");

    setEmbalagens([]);
    setFormEmbalagem({ codigoPeca: "", descricao: "" });
    setMensagemEmbalagem("");

    setEsteticas([]);
    setFormEstetica({ codigoPeca: "", descricao: "" });
    setMensagemEstetica("");

    setFuncionaisPeca([]);
    setFormFuncionalPeca({ codigoPeca: "", descricao: "" });
    setMensagemFuncionalPeca("");

    setFuncionalidades([]);
    setFormFuncionalidade({ descricao: "" });
    setMensagemFuncionalidade("");

    setProdutoDocs({ fotoProduto: [], etiquetaProcel: [], kitAcessorio: [], manualUsuario: [] });
    setModeloDocs({});
    setItemFotos({});

    setMensagem("");
  };

  const btnBase = "inline-flex items-center gap-2 px-3 h-9 rounded-xl text-[11px] font-semibold border transition";

  const setCodigoComDescricao = (
    setForm: React.Dispatch<React.SetStateAction<{ codigoPeca: string; descricao: string }>>,
    setMsg: (t: string) => void,
    v: string
  ) => {
    const codigoPeca = upper(v);
    const desc = lookupDescricao(codigoPeca);
    setForm((p) => ({ ...p, codigoPeca, descricao: desc || p.descricao }));
    if (desc) setForm((p) => ({ ...p, descricao: desc }));
    setMsg("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full min-w-0 px-4 md:px-6 py-4">
        <div className="mx-auto w-full max-w-[1400px] min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800">Cadastro de EAN/GTIN, Código NF e Modelo Fabricante</h1>
              <p className="text-[12px] text-slate-600">Cadastro centralizado para alimentar Pré-Análise, Embalagem e Análise Técnica.</p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarAjuda(true)}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800"
            >
              <BookOpen size={16} />
              COMO USAR
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-3 lg:col-span-2 flex flex-col gap-1.5">
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
              <div className="col-span-12 md:col-span-3 lg:col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-600 tracking-wide">EAN / GTIN</label>
                <input
                  type="text"
                  name="ean"
                  value={master.ean}
                  onChange={handleChangeMaster}
                  className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div className="col-span-12 md:col-span-4 lg:col-span-6 flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-600 tracking-wide">MODELO REFERÊNCIA</label>
                <input
                  type="text"
                  value={master.modeloReferencia}
                  readOnly
                  className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[12px] text-slate-800 cursor-not-allowed"
                />
              </div>
              <div className="col-span-12 md:col-span-2 lg:col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-600 tracking-wide">FABRICANTE</label>
                <input
                  type="text"
                  value={master.fabricante}
                  readOnly
                  className="h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 text-[12px] text-slate-800 uppercase cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={abrirCodigosNF} className={`${btnBase} border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100`}>
                  <Receipt size={16} />
                  CÓDIGOS NF<CountPill n={codigosNF.length} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={abrirEmbalagem}
                  className={`${btnBase} border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100`}
                >
                  <PackageIcon size={16} />
                  EMBALAGEM<CountPill n={embalagens.length} />
                </button>
                <button
                  type="button"
                  onClick={abrirAcessorios}
                  className={`${btnBase} border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100`}
                >
                  <Cable size={16} />
                  ACESSÓRIOS<CountPill n={acessorios.length} />
                </button>
                <button
                  type="button"
                  onClick={abrirFuncionalidade}
                  className={`${btnBase} border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100`}
                >
                  <Sparkles size={16} />
                  FUNCIONALIDADE<CountPill n={funcionalidades.length} />
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[12px] font-semibold text-slate-800">Anexos do produto</div>
                  <div className="text-[10px] text-slate-500">Use para auxiliar Pré-Análise, Embalagem e Análise Técnica.</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => openArquivos({ kind: "produto", doc: "fotoProduto" })}
                  className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <span className="text-[11px] font-semibold text-slate-700 inline-flex items-center gap-2">
                    <ImageIcon size={16} /> Foto do produto
                  </span>
                  <CountPill n={produtoDocs.fotoProduto.length} />
                </button>
                <button
                  type="button"
                  onClick={() => openArquivos({ kind: "produto", doc: "etiquetaProcel" })}
                  className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <span className="text-[11px] font-semibold text-slate-700 inline-flex items-center gap-2">
                    <Tag size={16} /> Etiqueta Procel
                  </span>
                  <CountPill n={produtoDocs.etiquetaProcel.length} />
                </button>
                <button
                  type="button"
                  onClick={() => openArquivos({ kind: "produto", doc: "kitAcessorio" })}
                  className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <span className="text-[11px] font-semibold text-slate-700 inline-flex items-center gap-2">
                    <Paperclip size={16} /> Kit acessório
                  </span>
                  <CountPill n={produtoDocs.kitAcessorio.length} />
                </button>
                <button
                  type="button"
                  onClick={() => openArquivos({ kind: "produto", doc: "manualUsuario" })}
                  className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                >
                  <span className="text-[11px] font-semibold text-slate-700 inline-flex items-center gap-2">
                    <FileText size={16} /> Manual (PDF)
                  </span>
                  <CountPill n={produtoDocs.manualUsuario.length} />
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-white">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[12px] font-semibold text-slate-800">Modelos Fabricante vinculados</div>
                  <div className="text-[10px] text-slate-500">Selecione um modelo para vincular Estética e Funcional.</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-5 flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-600 tracking-wide">MODELO FABRICANTE</label>
                  <input
                    type="text"
                    value={modeloAtual}
                    onChange={(e) => {
                      setModeloAtual(e.target.value);
                      if (!linhaAtual) setLinhaAtual(detectarLinhaDoModeloFabricante(e.target.value));
                      setMensagemModelo("");
                    }}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-600 tracking-wide">CÓDIGO DO PRODUTO</label>
                  <input
                    type="text"
                    value={codigoProdutoAtual}
                    onChange={(e) => {
                      setCodigoProdutoAtual(e.target.value);
                      setMensagemModelo("");
                    }}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
                  />
                </div>
                <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-600 tracking-wide">LINHA</label>
                  <input
                    type="text"
                    value={linhaAtual}
                    onChange={(e) => {
                      setLinhaAtual(e.target.value);
                      setMensagemModelo("");
                    }}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
                  />
                </div>
                <div className="col-span-12 md:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={addModelo}
                    className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-sky-600 text-white hover:bg-sky-700 inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    INCLUIR
                  </button>
                </div>
              </div>

              {mensagemModelo && (
                <div className="text-[12px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">{mensagemModelo}</div>
              )}

              <div className="mt-3 rounded-2xl border border-slate-200 overflow-x-auto overflow-y-auto max-h-[260px]">
                <table className="w-full border-collapse text-[11px] min-w-[860px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left w-10">#</th>
                      <th className="px-2 py-1.5 text-left">Modelo fabricante</th>
                      <th className="px-2 py-1.5 text-left w-32">Código do produto</th>
                      <th className="px-2 py-1.5 text-left w-16">Linha</th>
                      <th className="px-2 py-1.5 text-center w-16">Vista explodida</th>
                      <th className="px-2 py-1.5 text-center w-16">Boletim técnico</th>
                      <th className="px-2 py-1.5 text-center w-16">Manual técnico</th>
                      <th className="px-3 py-2 text-right w-16">Alterar</th>
                      <th className="px-3 py-2 text-right w-16">Remover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!modelosFabricante.length && (
                      <tr>
                        <td colSpan={9} className="px-3 py-3 text-center text-[11px] text-slate-400">
                          Nenhum Modelo Fabricante cadastrado.
                        </td>
                      </tr>
                    )}
                    {modelosFabricante.map((m, i) => {
                      const sel = m.id === modeloSelecionadoId;
                      const docs = modeloDocs[m.id] || { vistaExplodida: [], boletimTecnico: [], manualTecnico: [] };
                      return (
                        <tr
                          key={m.id}
                          className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"} ${sel ? "ring-1 ring-sky-500" : ""} cursor-pointer`}
                          onClick={() => setModeloSelecionadoId(m.id)}
                        >
                          <td className="px-2 py-1.5 align-middle text-[11px] text-slate-500">{i + 1}</td>
                          <td className="px-2 py-1.5 align-middle text-[11px] font-semibold text-slate-800">{m.nome}</td>
                          <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800 whitespace-nowrap">{m.codigoProduto}</td>
                          <td className="px-2 py-1.5 align-middle text-[11px] text-slate-800 whitespace-nowrap">{m.linha}</td>

                          <td className="px-2 py-1.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <IconBtn
                              title="Vista explodida"
                              badge={docs.vistaExplodida?.length || 0}
                              onClick={() => openArquivos({ kind: "modelo", modeloId: m.id, doc: "vistaExplodida" })}
                            >
                              <Layers size={16} />
                            </IconBtn>
                          </td>
                          <td className="px-2 py-1.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <IconBtn
                              title="Boletim técnico"
                              badge={docs.boletimTecnico?.length || 0}
                              onClick={() => openArquivos({ kind: "modelo", modeloId: m.id, doc: "boletimTecnico" })}
                            >
                              <FileSearch size={16} />
                            </IconBtn>
                          </td>
                          <td className="px-2 py-1.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <IconBtn
                              title="Manual técnico"
                              badge={docs.manualTecnico?.length || 0}
                              onClick={() => openArquivos({ kind: "modelo", modeloId: m.id, doc: "manualTecnico" })}
                            >
                              <BookText size={16} />
                            </IconBtn>
                          </td>

                          <td className="px-2 py-1.5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                            <IconBtn title="Alterar" variant="primary" onClick={() => editarModelo(m.id)}>
                              <Pencil size={16} />
                            </IconBtn>
                          </td>
                          <td className="px-2 py-1.5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                            <IconBtn title="Excluir" variant="danger" onClick={() => removerModelo(m.id)}>
                              <Trash2 size={16} />
                            </IconBtn>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={abrirEstetica}
                  className={`${btnBase} border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100`}
                >
                  <Sparkles size={16} />
                  ESTÉTICA<CountPill n={esteticas.filter((x) => (x.modeloId || 0) === (modeloSelecionadoId || 0)).length} />
                </button>
                <button
                  type="button"
                  onClick={abrirFuncionalPeca}
                  className={`${btnBase} border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100`}
                >
                  <Sparkles size={16} />
                  FUNCIONAL<CountPill n={funcionaisPeca.filter((x) => (x.modeloId || 0) === (modeloSelecionadoId || 0)).length} />
                </button>
                {modeloSelecionado && (
                  <div className="ml-auto text-[11px] text-slate-600 inline-flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                      Selecionado: <span className="font-semibold">{modeloSelecionado.nome}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[12px] font-semibold text-slate-800 inline-flex items-center">
                    Itens vinculados ao produto<CountPill n={itensFiltrados.length} />
                  </div>
                  <div className="text-[10px] text-slate-500">Emb. + Acess. + Peças + Funcionalidades. Inclua fotos dos itens quando necessário.</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFiltroModeloReferencia((v) => !v)}
                      className={`px-3 h-8 rounded-xl text-[11px] font-semibold border transition ${filtroModeloReferencia
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      MODELO REFERÊNCIA
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroModeloFabricante((v) => !v)}
                      className={`px-3 h-8 rounded-xl text-[11px] font-semibold border transition ${filtroModeloFabricante
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      MODELO FABRICANTE
                    </button>
                    {filtroModeloFabricante && (
                      <select
                        value={filtroModeloFabricanteId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFiltroModeloFabricanteId(v === "TODOS" ? "TODOS" : Number(v));
                        }}
                        className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      >
                        <option value="TODOS">TODOS OS MODELOS</option>
                        {modelosFabricante.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 overflow-x-auto overflow-y-auto max-h-[320px] bg-white">
                <table className="w-full border-collapse text-[11px] min-w-[760px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left w-8">#</th>
                      <th className="px-2 py-2 text-left w-28">Tipo</th>
                      <th className="px-2 py-2 text-left w-72">Modelo</th>
                      <th className="px-2 py-2 text-left w-28">Código peça</th>
                      <th className="px-2 py-2 text-left">Descrição</th>
                      <th className="px-2 py-2 text-right w-20">Fotos</th>
                      <th className="px-2 py-2 text-right w-20">Excluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!itensFiltrados.length && (
                      <tr>
                        <td colSpan={7} className="px-3 py-3 text-center text-[11px] text-slate-400">
                          Nenhum item vinculado ainda.
                        </td>
                      </tr>
                    )}
                    {itensFiltrados.map((r, i) => {
                      const n = (itemFotos[r.rowKey] || []).length;
                      return (
                        <tr key={r.rowKey} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-2 py-2 align-middle text-[11px] text-slate-500">{i + 1}</td>
                          <td className="px-2 py-2 align-middle text-[11px] font-semibold text-slate-700">{r.tipo}</td>
                          <td className="px-2 py-2 align-middle text-[11px] text-slate-700 truncate max-w-[280px]" title={r.vinculo}>
                            {r.vinculo}
                          </td>
                          <td className="px-2 py-2 align-middle text-[11px] text-slate-800 whitespace-nowrap">{r.codigoPeca || "-"}</td>
                          <td className="px-2 py-2 align-middle text-[11px] text-slate-800">{r.descricao}</td>
                          <td className="px-2 py-2 align-middle text-right">
                            <IconBtn
                              title="Incluir/alterar fotos"
                              badge={n}
                              onClick={() =>
                                openArquivos({ kind: "item", rowKey: r.rowKey, title: `Fotos — ${r.tipo} — ${r.codigoPeca || r.descricao}` })
                              }
                            >
                              <ImageIcon size={16} />
                            </IconBtn>
                          </td>
                          <td className="px-2 py-2 align-middle text-right">
                            <IconBtn title="Excluir" variant="danger" onClick={() => excluirItemVinculado(r)}>
                              <Trash2 size={16} />
                            </IconBtn>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {mensagem && <div className="text-[12px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{mensagem}</div>}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={limpar}
                className="px-3 h-9 rounded-xl text-[11px] font-semibold border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-2"
              >
                <X size={16} />
                LIMPAR
              </button>
              <button
                type="button"
                onClick={salvar}
                className="px-3 h-9 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-2"
              >
                <Plus size={16} />
                SALVAR
              </button>
            </div>
          </div>

          <ModalEanGtins
            open={mostrarLookupEAN}
            onClose={() => setMostrarLookupEAN(false)}
            eans={eansCad}
            onAdd={upsertMasterCache}
            onSelect={(m) => {
              setMaster(m);
              setMensagem("");
              setMostrarLookupEAN(false);
            }}
          />

          <ModalCodigosNF
            open={mostrarPopupNF}
            master={master}
            codigosNF={codigosNF}
            nfAtual={nfAtual}
            revendaAtual={revendaNFAtual}
            mensagem={mensagemNF}
            onClose={() => {
              setMostrarPopupNF(false);
              setMostrarLookupRevenda(false);
              setEditNfId(null);
              setNfAtual("");
              setRevendaNFAtual("");
              setMensagemNF("");
            }}
            onChangeNF={setNfAtual}
            onPesquisarRevenda={() => setMostrarLookupRevenda(true)}
            onAdd={addCodigoNF}
            onRemover={removerCodigoNF}
            onEditar={editarCodigoNF}
          />

          <ModalRevendasClientes
            open={mostrarLookupRevenda}
            onClose={() => setMostrarLookupRevenda(false)}
            onSelect={(nome) => {
              setRevendaNFAtual(nome);
              setMostrarLookupRevenda(false);
              setMensagemNF("");
            }}
          />

          <ModalPecas
            open={mostrarPopupEmbalagem}
            title="Cadastro de Embalagem Referente"
            master={master}
            form={formEmbalagem}
            mensagem={mensagemEmbalagem}
            emptyText="Nenhum item de embalagem cadastrado ainda."
            addLabel="INCLUIR"
            onClose={() => {
              setMostrarPopupEmbalagem(false);
              setMensagemEmbalagem("");
            }}
            onChangeCodigo={(v) => setCodigoComDescricao(setFormEmbalagem, setMensagemEmbalagem, v)}
            onChangeDescricao={(v) => {
              setFormEmbalagem((p) => ({ ...p, descricao: v }));
              setMensagemEmbalagem("");
            }}
            onAdd={() => addItemGenerico(formEmbalagem, setFormEmbalagem, setEmbalagens, setMensagemEmbalagem)}
            lista={embalagens}
            onRemover={(id) => setEmbalagens((p) => p.filter((x) => x.id !== id))}
            sugestoes={EMBALAGENS_PADRAO}
          />

          <ModalPecas
            open={mostrarPopupAcessorios}
            title="Cadastro de Acessórios Referentes"
            master={master}
            form={formAcessorio}
            mensagem={mensagemAcessorio}
            emptyText="Nenhum acessório cadastrado ainda."
            addLabel="INCLUIR"
            onClose={() => {
              setMostrarPopupAcessorios(false);
              setMensagemAcessorio("");
            }}
            onChangeCodigo={(v) => setCodigoComDescricao(setFormAcessorio, setMensagemAcessorio, v)}
            onChangeDescricao={(v) => {
              setFormAcessorio((p) => ({ ...p, descricao: v }));
              setMensagemAcessorio("");
            }}
            onAdd={() => addItemGenerico(formAcessorio, setFormAcessorio, setAcessorios, setMensagemAcessorio)}
            lista={acessorios}
            onRemover={(id) => setAcessorios((p) => p.filter((x) => x.id !== id))}
            sugestoes={ACESSORIOS_PADRAO}
          />

          <ModalPecas
            open={mostrarPopupEstetica}
            title="Cadastro de Peças Estéticas Referentes"
            master={master}
            modeloFabricante={modeloSelecionado?.nome || ""}
            form={formEstetica}
            mensagem={mensagemEstetica}
            emptyText="Nenhuma peça estética cadastrada ainda."
            addLabel="INCLUIR"
            onClose={() => {
              setMostrarPopupEstetica(false);
              setMensagemEstetica("");
            }}
            onChangeCodigo={(v) => setCodigoComDescricao(setFormEstetica, setMensagemEstetica, v)}
            onChangeDescricao={(v) => {
              setFormEstetica((p) => ({ ...p, descricao: v }));
              setMensagemEstetica("");
            }}
            onAdd={() =>
              addItemGenerico(formEstetica, setFormEstetica, setEsteticas, setMensagemEstetica, { vincularModelo: true, dupWithin: esteticas })
            }
            lista={esteticas.filter((x) => (x.modeloId || 0) === (modeloSelecionadoId || 0))}
            onRemover={(id) => setEsteticas((p) => p.filter((x) => x.id !== id))}
            sugestoes={ESTETICAS_PADRAO}
          />

          <ModalPecas
            open={mostrarPopupFuncionalPeca}
            title="Cadastro de Peças Funcionais Referentes"
            master={master}
            modeloFabricante={modeloSelecionado?.nome || ""}
            form={formFuncionalPeca}
            mensagem={mensagemFuncionalPeca}
            emptyText="Nenhuma peça funcional cadastrada ainda."
            addLabel="INCLUIR"
            onClose={() => {
              setMostrarPopupFuncionalPeca(false);
              setMensagemFuncionalPeca("");
            }}
            onChangeCodigo={(v) => setCodigoComDescricao(setFormFuncionalPeca, setMensagemFuncionalPeca, v)}
            onChangeDescricao={(v) => {
              setFormFuncionalPeca((p) => ({ ...p, descricao: v }));
              setMensagemFuncionalPeca("");
            }}
            onAdd={() =>
              addItemGenerico(formFuncionalPeca, setFormFuncionalPeca, setFuncionaisPeca, setMensagemFuncionalPeca, {
                vincularModelo: true,
                dupWithin: funcionaisPeca,
              })
            }
            lista={funcionaisPeca.filter((x) => (x.modeloId || 0) === (modeloSelecionadoId || 0))}
            onRemover={(id) => setFuncionaisPeca((p) => p.filter((x) => x.id !== id))}
            sugestoes={PECAS_FUNCIONAIS_PADRAO}
          />

          <ModalPecas
            open={mostrarPopupFuncionalidade}
            title="Cadastro de Funcionalidades"
            master={master}
            form={{ descricao: formFuncionalidade.descricao }}
            mensagem={mensagemFuncionalidade}
            emptyText="Nenhuma funcionalidade cadastrada ainda."
            addLabel="INCLUIR"
            onClose={() => {
              setMostrarPopupFuncionalidade(false);
              setMensagemFuncionalidade("");
            }}
            onChangeDescricao={(v) => {
              setFormFuncionalidade({ descricao: v });
              setMensagemFuncionalidade("");
            }}
            onAdd={addFuncionalidade}
            lista={funcionalidades}
            onRemover={(id) => setFuncionalidades((p) => p.filter((x) => x.id !== id))}
            sugestoes={FUNCS_PADRAO}
          />

          <ModalArquivos
            open={getArquivosInfo.open}
            title={getArquivosInfo.title}
            accept={getArquivosInfo.accept}
            files={getArquivosInfo.files}
            onClose={closeArquivos}
            onAdd={getArquivosInfo.onAdd}
            onRemove={getArquivosInfo.onRemove}
          />

          <ModalShell
            open={mostrarModalSucesso}
            title="Produto salvo com sucesso"
            subtitle="Cadastro concluido"
            onClose={() => setMostrarModalSucesso(false)}
            maxW="max-w-md"
          >
            <div className="space-y-4">
              <div className="text-[12px] text-slate-600">O produto foi salvo no banco de dados.</div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold">EAN / GTIN:</span> {master.ean || "-"}
                </div>
                <div>
                  <span className="font-semibold">Modelo Referencia:</span> {master.modeloReferencia || "-"}
                </div>
                <div>
                  <span className="font-semibold">Fabricante:</span> {master.fabricante || "-"}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMostrarModalSucesso(false)}
                  className="h-9 px-3 rounded-xl text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800"
                >
                  OK
                </button>
              </div>
            </div>
          </ModalShell>

          <ModalAjuda open={mostrarAjuda} onClose={() => setMostrarAjuda(false)} />
        </div>
      </div>
    </div>
  );
};

export default CadastroNF_EAN_Modelo;
