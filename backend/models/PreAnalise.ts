// Pre-Analise Models

export type PreAnaliseStatus = 'pendente' | 'em_analise' | 'aprovado' | 'reprovado';

export interface PreAnalise {
  id: string;
  codigo: string;
  modelo: string;
  ean: string;
  status: PreAnaliseStatus;
  analisadoPor?: string;
  dataAnalise?: string;
}

export interface CreatePreAnaliseDTO {
  produtoId: string;
  codigo: string;
  modelo: string;
  ean: string;
  codigoNF?: string;
  modeloRef?: string;
  gtin?: string;
  nfReceb?: string;
  recebidoPor?: string;
  respostas?: Record<string, unknown>;
}

export interface UpdatePreAnaliseDTO {
  status?: PreAnaliseStatus;
  analisadoPor?: string;
  respostas?: Record<string, unknown>;
}

export interface PreAnaliseResult {
  id: string;
  codigo: string;
  modelo: string;
  resultado: 'aprovado' | 'reprovado';
  motivo?: string;
  dataAnalise: string;
}
export interface PreAnaliseProduto {
  id: string;
  produtoId: string;
  data: string;
  recebidoPor: string;
  codigoNF: string;
  modeloRef: string;
  gtin: string;
  nfReceb: string;
  status: PreAnaliseStatus;
  respostas?: Record<string, unknown>;
  analisadoPor?: string;
  dataAnalise?: string;
  updatedAt?: string;
}
