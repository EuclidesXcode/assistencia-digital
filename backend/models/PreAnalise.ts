// Pre-Analise Models

export interface PreAnalise {
  id: string;
  codigo: string;
  modelo: string;
  ean: string;
  status: 'pendente' | 'em_analise' | 'aprovado' | 'reprovado';
  analisadoPor?: string;
  dataAnalise?: string;
}

export interface CreatePreAnaliseDTO {
  codigo: string;
  modelo: string;
  ean: string;
}

export interface UpdatePreAnaliseDTO {
  status?: 'pendente' | 'em_analise' | 'aprovado' | 'reprovado';
  analisadoPor?: string;
}

export interface PreAnaliseResult {
  id: string;
  codigo: string;
  modelo: string;
  resultado: 'aprovado' | 'reprovado';
  motivo?: string;
  dataAnalise: string;
}
