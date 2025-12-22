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
export interface ProductFormData {
  modeloFabricante?: string;
  ean: string;
  codigo?: string;
  modeloRef?: string;
  modelosFabricante?: string[];
  acessorios?: string[];
  marca?: string;
  categoria?: string;
  modelo?: string;
  descricao?: string;
}
