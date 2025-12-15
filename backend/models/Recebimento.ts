// Recebimento Models

export interface Recebimento {
  id: string;
  data: string;
  analisadoPor: string;
  codigoNF: string;
  modeloFabricante: string;
  ean: string;
  nf: string;
  status: 'aguardando' | 'em_processo' | 'concluido';
}

export interface CreateRecebimentoDTO {
  codigoNF: string;
  modeloFabricante: string;
  ean: string;
  nf: string;
}

export interface UpdateRecebimentoDTO {
  status?: 'aguardando' | 'em_processo' | 'concluido';
  analisadoPor?: string;
}
