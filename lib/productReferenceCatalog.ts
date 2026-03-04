export type ProductSuggestionCategory =
  | 'linhas'
  | 'funcionalidades'
  | 'esteticas'
  | 'embalagens'
  | 'acessorios'
  | 'pecas_funcionais';

export type ProductReferenceSuggestionItem = {
  id: string;
  category: ProductSuggestionCategory;
  value: string;
};

export type ProductSuggestionCatalog = Record<ProductSuggestionCategory, string[]>;

const uniqueSorted = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );

const normalizeCompare = (value: unknown) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

export const DEFAULT_PRODUCT_SUGGESTIONS: ProductSuggestionCatalog = {
  linhas: [
    'TV',
    'SOUNDBAR',
    'AUDIO',
    'AR CONDICIONADO',
    'REFRIGERADOR',
    'GELADEIRA',
    'LAVADORA',
    'SECADORA',
    'FOGAO',
    'COOKTOP',
    'MICRO-ONDAS',
    'ASPIRADOR',
    'PURIFICADOR',
    'CERVEJEIRA',
    'FREEZER'
  ],
  funcionalidades: ['TELA', 'AUDIO', 'HDMI', 'WI-FI', 'BLUETOOTH', 'USB', 'SINTONIZADOR'],
  esteticas: ['TELA', 'GABINETE FRONTAL', 'TAMPA TRASEIRA'],
  embalagens: ['EMBALAGEM', 'FUNDO', 'CALCO SUPERIOR', 'CALCO INFERIOR'],
  acessorios: ['Controle remoto', 'Cabo de energia', 'Base/Pedestal', 'Manual', 'Parafusos'],
  pecas_funcionais: ['Placa principal', 'Fonte', 'PCI WI-FI', 'Display']
};

export function createEmptyProductSuggestionCatalog(): ProductSuggestionCatalog {
  return {
    linhas: [],
    funcionalidades: [],
    esteticas: [],
    embalagens: [],
    acessorios: [],
    pecas_funcionais: []
  };
}

export function normalizeProductSuggestionCategory(value: unknown): ProductSuggestionCategory | null {
  const normalized = String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (!normalized) return null;
  if (normalized === 'linhas' || normalized === 'linha') return 'linhas';
  if (normalized === 'funcionalidades' || normalized === 'funcionalidade') return 'funcionalidades';
  if (normalized === 'esteticas' || normalized === 'estetica') return 'esteticas';
  if (normalized === 'embalagens' || normalized === 'embalagem') return 'embalagens';
  if (normalized === 'acessorios' || normalized === 'acessorio') return 'acessorios';
  if (
    normalized === 'pecas_funcionais' ||
    normalized === 'peca_funcional' ||
    normalized === 'pecas_funcional' ||
    normalized === 'pecas' ||
    normalized === 'funcionais'
  ) {
    return 'pecas_funcionais';
  }

  return null;
}

export function normalizeProductSuggestionCatalog(
  catalog?: Partial<Record<ProductSuggestionCategory, Array<string | null | undefined>>>
): ProductSuggestionCatalog {
  const normalizedCatalog = createEmptyProductSuggestionCatalog();

  (Object.keys(normalizedCatalog) as ProductSuggestionCategory[]).forEach((category) => {
    normalizedCatalog[category] = uniqueSorted(
      ((catalog?.[category] as Array<string | null | undefined> | undefined) || []).map((value) =>
        String(value || '').trim()
      )
    );
  });

  return normalizedCatalog;
}

export function mergeProductSuggestionCatalog(
  catalog?: Partial<Record<ProductSuggestionCategory, Array<string | null | undefined>>>
): ProductSuggestionCatalog {
  const merged = createEmptyProductSuggestionCatalog();

  (Object.keys(merged) as ProductSuggestionCategory[]).forEach((category) => {
    merged[category] = uniqueSorted([
      ...DEFAULT_PRODUCT_SUGGESTIONS[category],
      ...((catalog?.[category] as Array<string | null | undefined> | undefined) || [])
    ]);
  });

  return merged;
}

export function buildProductSuggestionCatalogFromItems(
  items?: Array<Pick<ProductReferenceSuggestionItem, 'category' | 'value'> | null | undefined>
): ProductSuggestionCatalog {
  const grouped = createEmptyProductSuggestionCatalog();

  (items || []).forEach((item) => {
    const category = normalizeProductSuggestionCategory(item?.category);
    const value = String(item?.value || '').trim();
    if (!category || !value) return;
    grouped[category].push(value);
  });

  return normalizeProductSuggestionCatalog(grouped);
}

export function buildFallbackSuggestionItemsFromCatalog(
  catalog?: Partial<Record<ProductSuggestionCategory, Array<string | null | undefined>>>,
  idPrefix: string = 'fallback'
): ProductReferenceSuggestionItem[] {
  const normalized = normalizeProductSuggestionCatalog(catalog);
  const items: ProductReferenceSuggestionItem[] = [];

  (Object.keys(normalized) as ProductSuggestionCategory[]).forEach((category) => {
    normalized[category].forEach((value) => {
      const compare = normalizeCompare(value).replace(/[^A-Z0-9]+/g, '_');
      items.push({
        id: `${idPrefix}:${category}:${compare}`,
        category,
        value
      });
    });
  });

  return items;
}
