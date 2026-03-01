import { supabase } from '@/lib/supabase';
import {
    AnaliseTecnicaRegistro,
    CreateAnaliseTecnicaDTO
} from '../models/AnaliseTecnica';

function sanitizeObject(value: Record<string, unknown> | undefined) {
    return value && typeof value === 'object' ? value : {};
}

function mapAnaliseTecnicaRow(data: any): AnaliseTecnicaRegistro {
    return {
        id: String(data?.id || ''),
        produtoId: String(data?.produto_id || ''),
        preAnaliseId: String(data?.pre_analise_id || ''),
        dataEntrada: String(data?.data_entrada || data?.created_at || ''),
        origem: String(data?.origem || ''),
        codigoNF: String(data?.codigo_nf || ''),
        modeloRef: String(data?.modelo_ref || ''),
        ean: String(data?.ean || ''),
        recebidoPor: String(data?.recebido_por || ''),
        analisadoPor: String(data?.analisado_por || ''),
        status: (data?.status || 'aguardando') as AnaliseTecnicaRegistro['status'],
        laudoTecnico: String(data?.laudo_tecnico || ''),
        observacoes: String(data?.observacoes || ''),
        dadosPreAnalise:
            (data?.pre_analise?.respostas && typeof data.pre_analise.respostas === 'object'
                ? data.pre_analise.respostas
                : data?.dados_pre_analise && typeof data.dados_pre_analise === 'object'
                    ? data.dados_pre_analise
                    : {}),
        createdAt: String(data?.created_at || ''),
        updatedAt: String(data?.updated_at || '')
    };
}

export class AnaliseTecnicaService {
    static async getFila(): Promise<AnaliseTecnicaRegistro[]> {
        const { data, error } = await supabase
            .from('analise_tecnica')
            .select('*, pre_analise:pre_analise_id ( respostas )')
            .in('status', ['aguardando', 'em_analise'])
            .order('data_entrada', { ascending: true });

        if (error) {
            console.error('Error fetching analise tecnica queue:', error);
            return [];
        }

        return (data || []).map(mapAnaliseTecnicaRow);
    }

    static async getHistorico(): Promise<AnaliseTecnicaRegistro[]> {
        const { data, error } = await supabase
            .from('analise_tecnica')
            .select('*, pre_analise:pre_analise_id ( respostas )')
            .eq('status', 'concluido')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching analise tecnica history:', error);
            return [];
        }

        return (data || []).map(mapAnaliseTecnicaRow);
    }

    static async ensureFromPreAnalise(data: CreateAnaliseTecnicaDTO): Promise<AnaliseTecnicaRegistro> {
        const produtoId = String(data?.produtoId || '').trim();
        const preAnaliseId = String(data?.preAnaliseId || '').trim();

        if (!produtoId) {
            throw new Error('produto_id obrigatorio para criar Analise Tecnica.');
        }

        if (!preAnaliseId) {
            throw new Error('pre_analise_id obrigatorio para criar Analise Tecnica.');
        }

        const { data: existing, error: findError } = await supabase
            .from('analise_tecnica')
            .select('*, pre_analise:pre_analise_id ( respostas )')
            .eq('pre_analise_id', preAnaliseId)
            .limit(1)
            .maybeSingle();

        if (findError) {
            console.error('Error checking analise tecnica by pre_analise_id:', findError);
            throw new Error('Erro ao verificar Analise Tecnica existente.');
        }

        if (existing?.id) {
            const recebidoPor = String(data?.recebidoPor || '').trim();
            if (!String(existing?.recebido_por || '').trim() && recebidoPor) {
                const { data: updatedExisting, error: updateExistingError } = await supabase
                    .from('analise_tecnica')
                    .update({ recebido_por: recebidoPor })
                    .eq('id', existing.id)
                    .select('*, pre_analise:pre_analise_id ( respostas )')
                    .single();

                if (!updateExistingError && updatedExisting) {
                    return mapAnaliseTecnicaRow(updatedExisting);
                }
            }

            return mapAnaliseTecnicaRow(existing);
        }

        const { data: created, error: insertError } = await supabase
            .from('analise_tecnica')
            .insert([
                {
                    produto_id: produtoId,
                    pre_analise_id: preAnaliseId,
                    origem: String(data?.origem || 'pre_analise').trim() || 'pre_analise',
                    codigo_nf: String(data?.codigoNF || '').trim() || null,
                    modelo_ref: String(data?.modeloRef || '').trim() || null,
                    ean: String(data?.ean || '').trim() || null,
                    recebido_por: String(data?.recebidoPor || '').trim() || null,
                    status: data?.status || 'aguardando',
                    observacoes: null,
                    laudo_tecnico: null,
                }
            ])
            .select('*, pre_analise:pre_analise_id ( respostas )')
            .single();

        if (insertError) {
            console.error('Error creating analise tecnica:', insertError);
            throw new Error('Erro ao criar Analise Tecnica.');
        }

        return mapAnaliseTecnicaRow(created);
    }

    static async iniciarAnalise(analiseTecnicaId: string, usuario: string): Promise<AnaliseTecnicaRegistro> {
        const id = String(analiseTecnicaId || '').trim();
        const usuarioAtual = String(usuario || '').trim();
        if (!id) {
            throw new Error('ID da Analise Tecnica obrigatorio.');
        }

        const { data, error } = await supabase
            .from('analise_tecnica')
            .update({
                status: 'em_analise',
                analisado_por: usuarioAtual || null,
                recebido_por: usuarioAtual || null,
            })
            .eq('id', id)
            .select('*, pre_analise:pre_analise_id ( respostas )')
            .single();

        if (error) {
            console.error('Error starting analise tecnica:', error);
            throw new Error('Erro ao iniciar Analise Tecnica.');
        }

        return mapAnaliseTecnicaRow(data);
    }

    static async finalizarAnalise(params: {
        analiseTecnicaId: string;
        usuario: string;
        laudoTecnico: string;
        observacoes?: string;
    }): Promise<AnaliseTecnicaRegistro> {
        const analiseTecnicaId = String(params?.analiseTecnicaId || '').trim();
        const usuario = String(params?.usuario || '').trim();
        const laudoTecnico = String(params?.laudoTecnico || '').trim();
        const observacoes = String(params?.observacoes || '').trim();

        if (!analiseTecnicaId) {
            throw new Error('ID da Analise Tecnica obrigatorio.');
        }

        if (!laudoTecnico) {
            throw new Error('Laudo tecnico obrigatorio para concluir.');
        }

        const { data, error } = await supabase
            .from('analise_tecnica')
            .update({
                status: 'concluido',
                analisado_por: usuario || null,
                laudo_tecnico: laudoTecnico,
                observacoes: observacoes || null,
            })
            .eq('id', analiseTecnicaId)
            .select('*, pre_analise:pre_analise_id ( respostas )')
            .single();

        if (error) {
            console.error('Error finishing analise tecnica:', error);
            throw new Error('Erro ao concluir Analise Tecnica.');
        }

        return mapAnaliseTecnicaRow(data);
    }
}
