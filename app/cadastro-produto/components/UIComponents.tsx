
"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, X, ZoomIn } from "lucide-react";

// --- Shared Components ---

export const IconBtn: React.FC<{
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

export const CountPill: React.FC<{ n: number }> = ({ n }) => {
    if (!n) return null;
    return (
        <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-slate-900 text-white text-[10px] font-semibold">
            {n}
        </span>
    );
};

export const ModalShell: React.FC<{
    open: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    maxW?: string;
}> = ({ open, title, subtitle, onClose, children, maxW = "max-w-3xl" }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className={`w-full ${maxW} bg-white rounded-2xl shadow-2xl p-5 md:p-6 space-y-4`}>
                <div className="flex items-start justify-between gap-3">
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

export type FileMeta = { id: number; file: File; name: string; createdAt: string; createdBy: string };

export const ModalArquivos: React.FC<{
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
        return () => { alive = false; };
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

            <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-auto max-h-[360px]">
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
                                                        title: f.name,
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
                <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setView(null)}>
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
