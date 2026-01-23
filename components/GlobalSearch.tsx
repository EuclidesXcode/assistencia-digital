"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, FileText, Package, Truck, Bell, DollarSign, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type PageKey =
    | "cadastro"
    | "recebimento"
    | "nfe-xml"
    | "notificacoes"
    | "orcamentos"
    | "pre-analise";

interface SearchResult {
    id: string;

    /** termo buscado (ex: "tv") */
    query: string;

    /** o que foi encontrado (ex: "TV Samsung 55") */
    match: string;

    /** texto secundário (ex: "EAN 789... • Samsung") */
    subtitle?: string;

    page: PageKey;
    pageName: string;
    href: string;

    icon: any;
    iconColor: string;
}

const PAGE_META: Record<PageKey, { name: string; icon: any; iconColor: string; href: string }> = {
    cadastro: { name: "Cadastro", icon: Package, iconColor: "text-green-600", href: "/home/cadastro" },
    recebimento: { name: "Recebimento", icon: Truck, iconColor: "text-purple-600", href: "/home/recebimento" },
    "nfe-xml": { name: "NF-e XML", icon: FileText, iconColor: "text-indigo-600", href: "/home/nfe-xml" },
    notificacoes: { name: "Notificações", icon: Bell, iconColor: "text-amber-600", href: "/home/notificacoes" },
    orcamentos: { name: "Orçamentos", icon: DollarSign, iconColor: "text-blue-600", href: "/home/orcamentos" },
    "pre-analise": { name: "Pré-Análise", icon: CheckCircle2, iconColor: "text-emerald-600", href: "/home/pre-analise" },
};

function buildHref(page: PageKey, q: string) {
    const base = PAGE_META[page].href;
    const params = new URLSearchParams();
    params.set("q", q);
    return `${base}?${params.toString()}`;
}

export default function GlobalSearch() {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // evita race-condition: só aplica o resultado da última busca
    const requestIdRef = useRef(0);

    const normalize = (s: any) => String(s ?? "").toLowerCase();
    const safeStr = (s: any) => String(s ?? "");
    const includesQ = (text: string, q: string) => normalize(text).includes(q);

    const searchAllPages = async (searchQuery: string) => {
        const q = searchQuery.toLowerCase().trim();

        if (!q) {
            setResults([]);
            return;
        }

        const reqId = ++requestIdRef.current;
        setLoading(true);

        const out: SearchResult[] = [];

        try {
            // roda tudo em paralelo e não derruba tudo se uma falhar
            await Promise.allSettled([
                // 1) Cadastro / Produtos
                (async () => {
                    const { ProductService } = await import("@/backend/services/productService");
                    // @ts-ignore
                    const produtosResult = await ProductService.searchProducts(q);

                    const items = produtosResult?.data ?? [];
                    for (const prod of items) {
                        const match =
                            prod?.nome ||
                            prod?.descricao ||
                            prod?.modeloRef ||
                            prod?.modelo ||
                            prod?.ean ||
                            "Produto";

                        const subtitleParts = [
                            prod?.marca ? safeStr(prod.marca) : null,
                            prod?.modeloRef ? safeStr(prod.modeloRef) : null,
                            prod?.ean ? `EAN ${safeStr(prod.ean)}` : null,
                        ].filter(Boolean);

                        out.push({
                            id: `cadastro-${prod?.id || prod?.ean || Math.random()}`,
                            query: q,
                            match: safeStr(match),
                            subtitle: subtitleParts.length ? subtitleParts.join(" • ") : undefined,
                            page: "cadastro",
                            pageName: PAGE_META.cadastro.name,
                            href: buildHref("cadastro", q),
                            icon: PAGE_META.cadastro.icon,
                            iconColor: PAGE_META.cadastro.iconColor,
                        });
                    }
                })(),

                // 2) Recebimento (getTudo e filtra local)
                (async () => {
                    const { RecebimentoService } = await import("@/backend/services/recebimentoService");
                    // @ts-ignore
                    const recebimentos = await RecebimentoService.getRegistros();

                    for (const rec of recebimentos ?? []) {
                        const fields = [
                            rec?.id,
                            rec?.nf,
                            rec?.codigoNF,
                            rec?.fornecedor,
                            rec?.modeloFabricante,
                            rec?.ean,
                            rec?.status,
                            rec?.data,
                            rec?.analisadoPor,
                        ];
                        const searchText = fields.map(safeStr).join(" ").toLowerCase();
                        if (!searchText.includes(q)) continue;

                        const match =
                            rec?.modeloFabricante ||
                            (rec?.nf ? `NF ${safeStr(rec.nf)}` : null) ||
                            rec?.id ||
                            "Recebimento";

                        const subtitleParts = [
                            rec?.fornecedor ? safeStr(rec.fornecedor) : null,
                            rec?.ean ? `EAN ${safeStr(rec.ean)}` : null,
                            rec?.data ? safeStr(rec.data) : null,
                        ].filter(Boolean);

                        out.push({
                            id: `recebimento-${rec?.id || Math.random()}`,
                            query: q,
                            match: safeStr(match),
                            subtitle: subtitleParts.length ? subtitleParts.join(" • ") : undefined,
                            page: "recebimento",
                            pageName: PAGE_META.recebimento.name,
                            href: buildHref("recebimento", q),
                            icon: PAGE_META.recebimento.icon,
                            iconColor: PAGE_META.recebimento.iconColor,
                        });
                    }
                })(),

                // 3) NF-e XML (getTudo e filtra local)
                (async () => {
                    const { NfeService } = await import("@/backend/services/nfeService");
                    const notas = await NfeService.getNotas();

                    for (const nota of notas ?? []) {
                        const fields = [nota?.chave, nota?.numero, nota?.emissao, nota?.status, nota?.itens];
                        const searchText = fields.map(safeStr).join(" ").toLowerCase();
                        if (!searchText.includes(q)) continue;

                        const match = nota?.numero ? `NF-e ${safeStr(nota.numero)}` : "NF-e";
                        const subtitleParts = [
                            nota?.status ? safeStr(nota.status) : null,
                            nota?.emissao ? safeStr(nota.emissao) : null,
                            nota?.chave ? safeStr(nota.chave).slice(0, 18) + "…" : null,
                        ].filter(Boolean);

                        out.push({
                            id: `nfe-${nota?.chave || Math.random()}`,
                            query: q,
                            match,
                            subtitle: subtitleParts.length ? subtitleParts.join(" • ") : undefined,
                            page: "nfe-xml",
                            pageName: PAGE_META["nfe-xml"].name,
                            href: buildHref("nfe-xml", q),
                            icon: PAGE_META["nfe-xml"].icon,
                            iconColor: PAGE_META["nfe-xml"].iconColor,
                        });
                    }
                })(),

                // 4) Notificações (ideal: NotificationService.search / fallback: getAll e filtra)
                (async () => {
                    try {
                        const { NotificationService } = await import("@/backend/services/notificationService");
                        // se existir searchNotifications melhor; se não, tenta list
                        const hasSearch = typeof (NotificationService as any)?.searchNotifications === "function";
                        const items = hasSearch
                            ? await (NotificationService as any).searchNotifications(q)
                            : await (NotificationService as any).getNotifications?.();

                        const list = Array.isArray(items) ? items : items?.data ?? [];
                        for (const n of list ?? []) {
                            const fields = [n?.title, n?.message, n?.createdAt, n?.type, n?.status];
                            const searchText = fields.map(safeStr).join(" ").toLowerCase();
                            if (!searchText.includes(q)) continue;

                            const match = n?.title || n?.message || "Notificação";
                            const subtitle = n?.message ? safeStr(n.message).slice(0, 60) : undefined;

                            out.push({
                                id: `notif-${n?.id || Math.random()}`,
                                query: q,
                                match: safeStr(match),
                                subtitle,
                                page: "notificacoes",
                                pageName: PAGE_META.notificacoes.name,
                                href: buildHref("notificacoes", q),
                                icon: PAGE_META.notificacoes.icon,
                                iconColor: PAGE_META.notificacoes.iconColor,
                            });
                        }
                    } catch (e) {
                        // não quebra a busca global
                    }
                })(),

                // 5) Orçamentos (ideal: OrcamentosService.search / fallback: getAll e filtra)
                (async () => {
                    try {
                        const { OrcamentoService } = await import("@/backend/services/orcamentoService");
                        const hasSearch = typeof (OrcamentoService as any)?.search === "function";
                        const items = hasSearch ? await (OrcamentoService as any).search(q) : await (OrcamentoService as any).getRegistros?.();

                        const list = Array.isArray(items) ? items : items?.data ?? [];
                        for (const o of list ?? []) {
                            const fields = [
                                o?.id,
                                o?.numero,
                                o?.cliente,
                                o?.fornecedor,
                                o?.status,
                                o?.createdAt,
                                o?.total,
                            ];
                            const searchText = fields.map(safeStr).join(" ").toLowerCase();
                            if (!searchText.includes(q)) continue;

                            const match = o?.numero ? `Orçamento ${safeStr(o.numero)}` : (o?.cliente ? safeStr(o.cliente) : "Orçamento");
                            const subtitleParts = [
                                o?.cliente ? `Cliente: ${safeStr(o.cliente)}` : null,
                                o?.status ? `Status: ${safeStr(o.status)}` : null,
                            ].filter(Boolean);

                            out.push({
                                id: `orc-${o?.id || Math.random()}`,
                                query: q,
                                match: safeStr(match),
                                subtitle: subtitleParts.length ? subtitleParts.join(" • ") : undefined,
                                page: "orcamentos",
                                pageName: PAGE_META.orcamentos.name,
                                href: buildHref("orcamentos", q),
                                icon: PAGE_META.orcamentos.icon,
                                iconColor: PAGE_META.orcamentos.iconColor,
                            });
                        }
                    } catch (e) { }
                })(),

                // 6) Pré-análise (ideal: PreAnaliseService.search / fallback: getAll e filtra)
                (async () => {
                    try {
                        const { PreAnaliseService } = await import("@/backend/services/preAnaliseService");
                        const hasSearch = typeof (PreAnaliseService as any)?.search === "function";
                        const items = hasSearch ? await (PreAnaliseService as any).search(q) : await (PreAnaliseService as any).getItems?.();

                        const list = Array.isArray(items) ? items : items?.data ?? [];
                        for (const p of list ?? []) {
                            const fields = [
                                p?.id,
                                p?.status,
                                p?.cliente,
                                p?.fornecedor,
                                p?.produto,
                                p?.createdAt,
                                p?.responsavel,
                                p?.observacao,
                            ];
                            const searchText = fields.map(safeStr).join(" ").toLowerCase();
                            if (!searchText.includes(q)) continue;

                            const match = p?.produto || p?.id || "Pré-análise";
                            const subtitleParts = [
                                p?.status ? `Status: ${safeStr(p.status)}` : null,
                                p?.cliente ? `Cliente: ${safeStr(p.cliente)}` : null,
                            ].filter(Boolean);

                            out.push({
                                id: `pre-${p?.id || Math.random()}`,
                                query: q,
                                match: safeStr(match),
                                subtitle: subtitleParts.length ? subtitleParts.join(" • ") : undefined,
                                page: "pre-analise",
                                pageName: PAGE_META["pre-analise"].name,
                                href: buildHref("pre-analise", q),
                                icon: PAGE_META["pre-analise"].icon,
                                iconColor: PAGE_META["pre-analise"].iconColor,
                            });
                        }
                    } catch (e) { }
                })(),
            ]);

            if (requestIdRef.current !== reqId) return;

            // ranking simples
            const scored = out
                .map((r) => {
                    const m = normalize(r.match);
                    const score = (m.startsWith(q) ? 2 : 0) + (m.includes(q) ? 1 : 0);
                    return { r, score };
                })
                .sort((a, b) => b.score - a.score || a.r.pageName.localeCompare(b.r.pageName))
                .map((x) => x.r);

            setResults(scored);
        } catch (error) {
            console.error("Error searching:", error);
            if (requestIdRef.current !== reqId) return;
            setResults([]);
        } finally {
            if (requestIdRef.current !== reqId) return;
            setLoading(false);
        }
    };

    // Debounce
    useEffect(() => {
        const t = setTimeout(() => searchAllPages(query), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    // Agrupar
    const groupedResults = useMemo(() => {
        const groups: Record<string, SearchResult[]> = {};
        results.forEach((r) => ((groups[r.page] ||= []).push(r)));
        return groups;
    }, [results]);

    // clique fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                inputRef.current &&
                !inputRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
                setQuery("");
                setResults([]);
            }
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, []);

    const clear = () => {
        setQuery("");
        setResults([]);
        inputRef.current?.focus();
    };

    return (
        <div className="relative z-[100]">
            <div className="hidden md:flex items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20">
                <Search size={16} className="text-slate-600 mr-2" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Buscar em todas as páginas..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="bg-transparent border-none focus:outline-none text-sm text-slate-700 w-64 placeholder:text-slate-600"
                />
                {query && (
                    <button onClick={clear} className="ml-2 text-slate-400 hover:text-slate-700" aria-label="Limpar">
                        <X size={16} />
                    </button>
                )}
            </div>

            {isOpen && query && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[520px] overflow-auto z-[100]"
                >
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto" />
                            <p className="text-sm text-slate-500 mt-3">Buscando...</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-8 text-center">
                            <Search size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500">Nenhum resultado encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Tente nome, EAN, NF, chave, cliente, status...</p>
                        </div>
                    ) : (
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-black uppercase text-slate-400">
                                {results.length} resultado{results.length !== 1 ? "s" : ""} para{" "}
                                <span className="text-slate-700">“{query.trim()}”</span>
                            </div>

                            {Object.entries(groupedResults).map(([page, pageResults]) => (
                                <div key={page} className="mb-3">
                                    <div className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg mb-1">
                                        {pageResults[0].pageName} ({pageResults.length})
                                    </div>

                                    {pageResults.map((r) => {
                                        const Icon = r.icon;
                                        return (
                                            <Link
                                                key={r.id}
                                                href={r.href}
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    setQuery("");
                                                }}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors group"
                                            >
                                                <div
                                                    className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-white ${r.iconColor}`}
                                                >
                                                    <Icon size={16} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    {/* formato "tv — Nome da Página" */}
                                                    <p className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-700">
                                                        {r.query} <span className="text-slate-300 font-black">—</span>{" "}
                                                        <span className="text-slate-700">{r.pageName}</span>
                                                    </p>

                                                    <p className="text-xs text-slate-600 truncate">
                                                        Encontrado em: <span className="font-semibold">{r.match}</span>
                                                    </p>

                                                    {r.subtitle && <p className="text-[11px] text-slate-500 truncate">{r.subtitle}</p>}
                                                </div>

                                                <div className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700">
                                                    {r.pageName}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
