/**
 * Shared product mapper — converts a raw Supabase row into the application
 * product shape. Kept here so it is not duplicated between route handlers.
 */

export interface MappedProduct {
    id: string;
    ean: string;
    modeloRef: string;
    marca: string;
    nfs: unknown[];
    modelos: unknown[];
    embalagem: unknown[];
    acessorios: unknown[];
    estetica: unknown[];
    funcional: unknown[];
    funcionalidade: unknown[];
    fotos: string[];
    manualUrl: string | null;
    estoqueAtual: number;
    createdAt: string;
    updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapProduct(data: Record<string, any>): MappedProduct {
    const marca =
        data.marca ??
        data.fabricante ??
        data.modelo_fabricante ??
        data.brand ??
        data.manufacturer ??
        null;

    return {
        id: data.id,
        ean: data.ean ?? data.gtin ?? '',
        modeloRef: data.modelo_ref ?? data.modelo ?? data.modelo_fabricante ?? '',
        marca: marca || 'N/A',
        nfs: data.nfs_data ?? data.nfs ?? [],
        modelos: data.modelos_data ?? data.modelos ?? [],
        embalagem: data.embalagem || [],
        acessorios: data.acessorios || [],
        estetica: data.estetica || [],
        funcional: data.funcional || [],
        funcionalidade: data.funcionalidade || [],
        fotos: data.fotos || [],
        manualUrl: data.manual_url ?? data.manual ?? null,
        estoqueAtual: data.estoque_atual ?? data.estoque ?? 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}
