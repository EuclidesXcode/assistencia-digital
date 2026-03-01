export type AnaliseTecnicaStatus = 'aguardando' | 'em_analise' | 'concluido';

export interface AnaliseTecnicaRegistro {
  id: string;
  produtoId: string;
  preAnaliseId: string;
  dataEntrada: string;
  origem: string;
  codigoNF: string;
  modeloRef: string;
  ean?: string;
  recebidoPor?: string;
  analisadoPor?: string;
  status: AnaliseTecnicaStatus;
  laudoTecnico?: string;
  observacoes?: string;
  dadosPreAnalise?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAnaliseTecnicaDTO {
  produtoId: string;
  preAnaliseId: string;
  origem?: string;
  codigoNF?: string;
  modeloRef?: string;
  ean?: string;
  recebidoPor?: string;
  status?: AnaliseTecnicaStatus;
  dadosPreAnalise?: Record<string, unknown>;
  laudoTecnico?: string;
  observacoes?: string;
}

export interface UpdateAnaliseTecnicaDTO {
  analisadoPor?: string;
  status?: AnaliseTecnicaStatus;
  laudoTecnico?: string;
  observacoes?: string;
}
