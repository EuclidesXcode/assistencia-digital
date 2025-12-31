// Product Models

export interface ProdutoNF {
  codigo: string;
  revenda: string;
}

export interface ItemVinculado {
  tipo: 'estetica' | 'funcional' | 'funcionalidade' | 'embalagem' | 'acessorio';
  nome: string; // Descrição
  codigo?: string; // Código da peça se houver
  quantidade?: number;
}

export interface ModeloFabricante {
  id: string; // UUID para vincular itens
  nome: string; // O modelo em si (ex: 50UT8050PSA)
  categoria: string; // TV, Audio, etc
  codigoTipo?: string; // Código/Tipo extra
  
  // Anexos do modelo
  vistaExplodidaUrl?: string;
  boletimTecnicoUrl?: string;
  esquemaEletricoUrl?: string;

  // Itens específicos deste modelo
  estetica: ItemVinculado[];
  funcional: ItemVinculado[];
  funcionalidades: ItemVinculado[];
}

export interface Product {
  id: string;
  ean: string;
  modeloRef: string; // Master reference
  marca: string; // Fabricante (Philco, etc)
  
  // Master Level Items
  embalagem: ItemVinculado[];
  acessorios: ItemVinculado[];
  
  // Structured Data
  nfs: ProdutoNF[];
  modelos: ModeloFabricante[];
  
  // Assets
  fotos: string[];
  manualUrl?: string;

  estoqueAtual: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDTO {
  ean: string;
  modeloRef: string;
  marca: string;
  nfs: ProdutoNF[];
  modelos: ModeloFabricante[];
  embalagem: ItemVinculado[];
  acessorios: ItemVinculado[];
  fotos: string[];
  manualUrl?: string;
}

