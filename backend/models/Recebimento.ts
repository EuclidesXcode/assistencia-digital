export type RecebimentoStatus = 'aguardando' | 'em_processo' | 'concluido' | 'recebido';
export type TipoRecebimento = 'com_nf' | 'sem_nf';
export type LoteStatus = 'aberto' | 'finalizado';
export type EtiquetaFotoKey = 'codigo_unico' | 'vistoria_revenda' | 'sat';

export interface EtiquetaFotoData {
  fileName?: string;
  mimeType?: string;
  previewUrl?: string;
  storagePath?: string;
  capturedAt?: string;
}

export type FotosEtiquetas = Partial<Record<EtiquetaFotoKey, EtiquetaFotoData>>;
export type EtiquetasMissing = Partial<Record<EtiquetaFotoKey, boolean>>;

export interface RecebimentoRegistro {
  id: string;
  data: string;
  analisadoPor: string;
  codigoNF: string;
  modeloFabricante: string;
  ean: string;
  nf: string;
  status: RecebimentoStatus;
  dataRecebimento?: string | null;
  createdAt?: string;
  updatedAt?: string;
  tipoRecebimento?: TipoRecebimento | null;
  loteNumero?: number | null;
  loteStatus?: LoteStatus | null;
  loteCriadoPor?: string;
  loteIniciadoEm?: string | null;
  loteFinalizadoEm?: string | null;
  numeroItem?: number | null;
  recebidoPor?: string;
  codigoUnico?: string;
  numeroSerie?: string;
  modeloReferencia?: string;
  fornecedor?: string;
  finalizadoEm?: string | null;
  observacoes?: string;
  fotosEtiquetas?: FotosEtiquetas;
  etiquetasMissing?: EtiquetasMissing;
  pendencias?: string[];
}

export interface CreateRecebimentoDTO {
  tipoRecebimento: TipoRecebimento;
  loteNumero: number;
  loteStatus?: LoteStatus;
  loteCriadoPor?: string;
  loteIniciadoEm?: string;
  numeroItem: number;
  recebidoPor: string;
  codigoUnico: string;
  codigoNF?: string;
  numeroSerie?: string;
  modeloReferencia?: string;
  modeloFabricante?: string;
  ean?: string;
  nf?: string;
  fornecedor?: string;
  status?: RecebimentoStatus;
  dataRecebimento?: string;
  observacoes?: string;
  fotosEtiquetas?: FotosEtiquetas;
  etiquetasMissing?: EtiquetasMissing;
  pendencias?: string[];
}

export interface UpdateRecebimentoDTO {
  tipoRecebimento?: TipoRecebimento;
  loteNumero?: number;
  loteStatus?: LoteStatus;
  loteCriadoPor?: string;
  loteIniciadoEm?: string | null;
  loteFinalizadoEm?: string | null;
  numeroItem?: number;
  recebidoPor?: string;
  analisadoPor?: string;
  codigoUnico?: string;
  codigoNF?: string;
  numeroSerie?: string;
  modeloReferencia?: string;
  modeloFabricante?: string;
  ean?: string;
  nf?: string;
  fornecedor?: string;
  status?: RecebimentoStatus;
  dataRecebimento?: string | null;
  finalizadoEm?: string | null;
  observacoes?: string;
  fotosEtiquetas?: FotosEtiquetas;
  etiquetasMissing?: EtiquetasMissing;
  pendencias?: string[];
}
