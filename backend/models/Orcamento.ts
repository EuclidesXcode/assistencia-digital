// Orcamento Models

export interface Orcamento {
  id: string;
  data: string;
  analisadoPor: string;
  codigoNF: string;
  modeloFabricante: string;
  ean: string;
  nf: string;
  status: 'pendente' | 'em_analise' | 'concluido';
}

export interface CreateOrcamentoDTO {
  codigoNF: string;
  modeloFabricante: string;
  ean: string;
  nf: string;
}

export interface UpdateOrcamentoDTO {
  status?: 'pendente' | 'em_analise' | 'concluido';
  analisadoPor?: string;
}
export interface OrcamentoRegistro {
  id: string;
  data: string;
  analisadoPor: string;
  codigoNF: string;
  modeloFabricante: string;
  ean: string;
  nf: string;
}
