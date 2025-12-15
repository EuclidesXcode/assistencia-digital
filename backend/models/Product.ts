// Product Models

export interface Product {
  id: string;
  modeloFabricante: string;
  ean: string;
  itensVinculados: number;
  ultimaAtualizacao: string;
  status: 'ativo' | 'inativo';
}

export interface CreateProductDTO {
  modeloFabricante: string;
  ean: string;
}

export interface UpdateProductDTO {
  modeloFabricante?: string;
  ean?: string;
  status?: 'ativo' | 'inativo';
}
