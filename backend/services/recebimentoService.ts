import { supabase } from '@/lib/supabase';
import {
  CreateRecebimentoDTO,
  FotosEtiquetas,
  EtiquetasMissing,
  LoteStatus,
  RecebimentoRegistro,
  RecebimentoStatus,
  TipoRecebimento,
  UpdateRecebimentoDTO
} from '../models/Recebimento';

function asString(value: unknown): string {
  return String(value ?? '').trim();
}

function asNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item ?? '')).filter(Boolean) : [];
}

function asObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T;
  }
  return fallback;
}

function mapRecebimento(row: Record<string, any>): RecebimentoRegistro {
  return {
    id: asString(row.id),
    data: asString(row.data),
    analisadoPor: asString(row.analisado_por),
    codigoNF: asString(row.codigo_nf),
    modeloFabricante: asString(row.modelo_fabricante),
    ean: asString(row.ean),
    nf: asString(row.nf),
    status: (asString(row.status) || 'aguardando') as RecebimentoStatus,
    dataRecebimento: row.data_recebimento ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    tipoRecebimento: (row.tipo_recebimento ?? null) as TipoRecebimento | null,
    loteNumero: asNullableNumber(row.lote_numero),
    loteStatus: (row.lote_status ?? null) as LoteStatus | null,
    loteCriadoPor: asString(row.lote_criado_por),
    loteIniciadoEm: row.lote_iniciado_em ?? null,
    loteFinalizadoEm: row.lote_finalizado_em ?? null,
    numeroItem: asNullableNumber(row.numero_item),
    recebidoPor: asString(row.recebido_por || row.analisado_por),
    codigoUnico: asString(row.codigo_unico),
    numeroSerie: asString(row.numero_serie),
    modeloReferencia: asString(row.modelo_referencia || row.modelo_fabricante),
    fornecedor: asString(row.fornecedor),
    finalizadoEm: row.finalizado_em ?? null,
    observacoes: asString(row.observacoes),
    fotosEtiquetas: asObject<FotosEtiquetas>(row.fotos_etiquetas, {}),
    etiquetasMissing: asObject<EtiquetasMissing>(row.etiquetas_missing, {}),
    pendencias: asStringArray(row.pendencias)
  };
}

function buildPayload(data: CreateRecebimentoDTO | UpdateRecebimentoDTO) {
  const payload: Record<string, unknown> = {};

  if ('tipoRecebimento' in data && data.tipoRecebimento !== undefined) payload.tipo_recebimento = data.tipoRecebimento;
  if ('loteNumero' in data && data.loteNumero !== undefined) payload.lote_numero = data.loteNumero;
  if ('loteStatus' in data && data.loteStatus !== undefined) payload.lote_status = data.loteStatus;
  if ('loteCriadoPor' in data && data.loteCriadoPor !== undefined) payload.lote_criado_por = data.loteCriadoPor;
  if ('loteIniciadoEm' in data && data.loteIniciadoEm !== undefined) payload.lote_iniciado_em = data.loteIniciadoEm;
  if ('loteFinalizadoEm' in data && data.loteFinalizadoEm !== undefined) payload.lote_finalizado_em = data.loteFinalizadoEm;
  if ('numeroItem' in data && data.numeroItem !== undefined) payload.numero_item = data.numeroItem;
  if ('recebidoPor' in data && data.recebidoPor !== undefined) payload.recebido_por = data.recebidoPor;
  if ('analisadoPor' in data && data.analisadoPor !== undefined) payload.analisado_por = data.analisadoPor;
  if ('codigoUnico' in data && data.codigoUnico !== undefined) payload.codigo_unico = data.codigoUnico;
  if ('codigoNF' in data && data.codigoNF !== undefined) payload.codigo_nf = data.codigoNF;
  if ('numeroSerie' in data && data.numeroSerie !== undefined) payload.numero_serie = data.numeroSerie;
  if ('modeloReferencia' in data && data.modeloReferencia !== undefined) payload.modelo_referencia = data.modeloReferencia;
  if ('modeloFabricante' in data && data.modeloFabricante !== undefined) payload.modelo_fabricante = data.modeloFabricante;
  if ('ean' in data && data.ean !== undefined) payload.ean = data.ean;
  if ('nf' in data && data.nf !== undefined) payload.nf = data.nf;
  if ('fornecedor' in data && data.fornecedor !== undefined) payload.fornecedor = data.fornecedor;
  if ('status' in data && data.status !== undefined) payload.status = data.status;
  if ('dataRecebimento' in data && data.dataRecebimento !== undefined) payload.data_recebimento = data.dataRecebimento;
  if ('finalizadoEm' in data && data.finalizadoEm !== undefined) payload.finalizado_em = data.finalizadoEm;
  if ('observacoes' in data && data.observacoes !== undefined) payload.observacoes = data.observacoes;
  if ('fotosEtiquetas' in data && data.fotosEtiquetas !== undefined) payload.fotos_etiquetas = data.fotosEtiquetas ?? {};
  if ('etiquetasMissing' in data && data.etiquetasMissing !== undefined) payload.etiquetas_missing = data.etiquetasMissing ?? {};
  if ('pendencias' in data && data.pendencias !== undefined) payload.pendencias = data.pendencias ?? [];

  return payload;
}

export class RecebimentoService {
  static async getRegistros(filters?: {
    tipoRecebimento?: TipoRecebimento;
    loteNumero?: number;
    loteStatus?: LoteStatus;
    limit?: number;
  }): Promise<RecebimentoRegistro[]> {
    let query = supabase
      .from('recebimentos')
      .select('*')
      .order('lote_numero', { ascending: false })
      .order('numero_item', { ascending: true })
      .order('created_at', { ascending: false });

    if (filters?.tipoRecebimento) query = query.eq('tipo_recebimento', filters.tipoRecebimento);
    if (filters?.loteNumero != null) query = query.eq('lote_numero', filters.loteNumero);
    if (filters?.loteStatus) query = query.eq('lote_status', filters.loteStatus);
    if (filters?.limit != null) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching receipts:', error);
      return [];
    }

    return Array.isArray(data) ? data.map((row: any) => mapRecebimento(row)) : [];
  }

  static async getUltimoLoteAberto(tipoRecebimento: TipoRecebimento): Promise<{
    loteNumero: number;
    registros: RecebimentoRegistro[];
  } | null> {
    const { data, error } = await supabase
      .from('recebimentos')
      .select('lote_numero')
      .eq('tipo_recebimento', tipoRecebimento)
      .eq('lote_status', 'aberto')
      .not('lote_numero', 'is', null)
      .order('lote_numero', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching latest open lote:', error);
      return null;
    }

    const loteNumero = asNullableNumber(data?.[0]?.lote_numero);
    if (loteNumero == null) return null;

    const registros = await this.getRegistros({ tipoRecebimento, loteNumero });
    return { loteNumero, registros };
  }

  static async getLote(tipoRecebimento: TipoRecebimento, loteNumero: number): Promise<RecebimentoRegistro[]> {
    return this.getRegistros({ tipoRecebimento, loteNumero });
  }

  static async getRecebimentoById(id: string): Promise<RecebimentoRegistro | null> {
    const { data, error } = await supabase
      .from('recebimentos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Falha ao buscar recebimento.');
    }

    if (!data) return null;
    return mapRecebimento(data as Record<string, any>);
  }

  static async getNextLoteNumero(): Promise<number> {
    const { data, error } = await supabase
      .from('recebimentos')
      .select('lote_numero')
      .not('lote_numero', 'is', null)
      .order('lote_numero', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching next lote number:', error);
      return 1;
    }

    const current = asNullableNumber(data?.[0]?.lote_numero);
    return (current ?? 0) + 1;
  }

  static async createRecebimento(data: CreateRecebimentoDTO): Promise<RecebimentoRegistro> {
    const now = new Date().toISOString();
    const payload = buildPayload({
      ...data,
      loteStatus: data.loteStatus || 'aberto',
      loteIniciadoEm: data.loteIniciadoEm || now,
      dataRecebimento: data.dataRecebimento || now,
      status: data.status || 'recebido'
    });

    payload.data = now;

    const { data: created, error } = await supabase
      .from('recebimentos')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Falha ao criar recebimento.');
    }

    return mapRecebimento(created as Record<string, any>);
  }

  static async updateRecebimento(id: string, data: UpdateRecebimentoDTO): Promise<RecebimentoRegistro> {
    const payload = buildPayload(data);
    if (Object.keys(payload).length === 0) {
      const current = await this.getRecebimentoById(id);
      if (!current) {
        throw new Error('Recebimento nao encontrado.');
      }
      return current;
    }

    const { data: updated, error } = await supabase
      .from('recebimentos')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Falha ao atualizar recebimento.');
    }

    return mapRecebimento(updated as Record<string, any>);
  }

  static async deleteRecebimento(id: string): Promise<void> {
    const { error } = await supabase.from('recebimentos').delete().eq('id', id);
    if (error) {
      throw new Error(error.message || 'Falha ao excluir recebimento.');
    }
  }

  static async finalizarLote(tipoRecebimento: TipoRecebimento, loteNumero: number): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('recebimentos')
      .update({
        lote_status: 'finalizado',
        lote_finalizado_em: now,
        finalizado_em: now
      })
      .eq('tipo_recebimento', tipoRecebimento)
      .eq('lote_numero', loteNumero);

    if (error) {
      throw new Error(error.message || 'Falha ao finalizar lote.');
    }
  }

  static async efetuarRecebimento(ids: string[]): Promise<void> {
    if (!ids.length) return;

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('recebimentos')
      .update({ status: 'recebido', data_recebimento: now })
      .in('id', ids);

    if (error) {
      throw new Error(error.message || 'Falha ao efetuar recebimento.');
    }
  }
}
