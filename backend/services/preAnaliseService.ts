import { supabase } from '@/lib/supabase';
import {
    CreatePreAnaliseDTO,
    PreAnaliseProduto,
    PreAnaliseStatus
} from '../models/PreAnalise';
import { AnaliseTecnicaService } from './analiseTecnicaService';

function mapPreAnaliseRow(data: any): PreAnaliseProduto {
    return {
        id: String(data?.id || ''),
        produtoId: String(data?.produto_id || ''),
        data: String(data?.created_at || ''),
        recebidoPor: String(data?.recebido_por || ''),
        codigoNF: String(data?.codigo_nf || ''),
        modeloRef: String(data?.modelo_ref || ''),
        gtin: String(data?.gtin || data?.ean || ''),
        nfReceb: String(data?.nf_receb || ''),
        status: (data?.status || 'pendente') as PreAnaliseStatus,
        respostas: data?.respostas && typeof data.respostas === 'object' ? data.respostas : {},
        analisadoPor: String(data?.analisado_por || ''),
        dataAnalise: String(data?.data_analise || ''),
        updatedAt: String(data?.updated_at || '')
    };
}

function sanitizeObject(value: Record<string, unknown> | undefined) {
    return value && typeof value === 'object' ? value : {};
}

export class PreAnaliseService {
    static async getPendentes(): Promise<PreAnaliseProduto[]> {
        const { data, error } = await supabase
            .from('pre_analise')
            .select('*')
            .in('status', ['pendente', 'em_analise'])
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching pending analyses:', error);
            return [];
        }

        return (data || []).map(mapPreAnaliseRow);
    }

    static async getResultados(): Promise<PreAnaliseProduto[]> {
        const { data, error } = await supabase
            .from('pre_analise')
            .select('*')
            .in('status', ['aprovado', 'reprovado'])
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching analysis results:', error);
            return [];
        }

        return (data || []).map(mapPreAnaliseRow);
    }

    static async ensureForProduct(data: CreatePreAnaliseDTO): Promise<PreAnaliseProduto> {
        if (!data?.produtoId) {
            throw new Error('produto_id obrigatorio para criar Pre-Analise.');
        }

        const produtoId = String(data.produtoId).trim();
        const payload = {
            produto_id: produtoId,
            codigo: String(data.codigo || data.codigoNF || '').trim(),
            modelo: String(data.modelo || data.modeloRef || '').trim(),
            ean: String(data.ean || '').trim(),
            codigo_nf: String(data.codigoNF || data.codigo || '').trim() || null,
            modelo_ref: String(data.modeloRef || data.modelo || '').trim() || null,
            gtin: String(data.gtin || data.ean || '').trim() || null,
            nf_receb: String(data.nfReceb || '').trim() || null,
            recebido_por: String(data.recebidoPor || '').trim() || null,
            respostas: sanitizeObject(data.respostas),
        };

        const { data: existing, error: findError } = await supabase
            .from('pre_analise')
            .select('*')
            .eq('produto_id', produtoId)
            .limit(1)
            .maybeSingle();

        if (findError) {
            console.error('Error checking pre-analise by produto_id:', findError);
            throw new Error('Erro ao verificar Pre-Analise existente.');
        }

        if (existing?.id) {
            const { data: updated, error: updateError } = await supabase
                .from('pre_analise')
                .update(payload)
                .eq('id', existing.id)
                .select('*')
                .single();

            if (updateError) {
                console.error('Error updating pre-analise:', updateError);
                throw new Error('Erro ao atualizar Pre-Analise do produto.');
            }

            return mapPreAnaliseRow(updated);
        }

        const { data: created, error: insertError } = await supabase
            .from('pre_analise')
            .insert([
                {
                    ...payload,
                    status: 'pendente',
                }
            ])
            .select('*')
            .single();

        if (insertError) {
            console.error('Error creating pre-analise:', insertError);
            throw new Error('Erro ao criar Pre-Analise do produto.');
        }

        return mapPreAnaliseRow(created);
    }

    static async iniciarPreAnalise(preAnaliseId: string, usuario: string): Promise<PreAnaliseProduto> {
        const id = String(preAnaliseId || '').trim();
        if (!id) {
            throw new Error('ID da Pre-Analise obrigatorio.');
        }

        const { data, error } = await supabase
            .from('pre_analise')
            .update({
                status: 'em_analise',
                analisado_por: String(usuario || '').trim() || null,
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            console.error('Error starting pre-analise:', error);
            throw new Error('Erro ao iniciar Pre-Analise.');
        }

        return mapPreAnaliseRow(data);
    }

    static async finalizarPreAnalise(params: {
        preAnaliseId: string;
        usuario: string;
        resultado: 'aprovado' | 'reprovado';
        respostasAdicionais?: Record<string, unknown>;
    }): Promise<PreAnaliseProduto> {
        const preAnaliseId = String(params?.preAnaliseId || '').trim();
        const usuario = String(params?.usuario || '').trim();
        const resultado = params?.resultado;

        if (!preAnaliseId) {
            throw new Error('ID da Pre-Analise obrigatorio.');
        }

        if (!resultado) {
            throw new Error('Status final da Pre-Analise obrigatorio.');
        }

        const { data: current, error: currentError } = await supabase
            .from('pre_analise')
            .select('*')
            .eq('id', preAnaliseId)
            .single();

        if (currentError || !current) {
            console.error('Error fetching pre-analise before finish:', currentError);
            throw new Error('Pre-Analise nao encontrada.');
        }

        if (!current?.produto_id) {
            throw new Error('Pre-Analise sem produto_id nao pode ser finalizada.');
        }

        const respostasBase = sanitizeObject(current?.respostas);
        const respostasAdicionais = sanitizeObject(params.respostasAdicionais);
        const workflowAdicional =
            respostasAdicionais?.workflow && typeof respostasAdicionais.workflow === 'object'
                ? (respostasAdicionais.workflow as Record<string, unknown>)
                : {};
        const respostas = {
            ...respostasBase,
            ...respostasAdicionais,
            workflow: {
                ...(respostasBase?.workflow && typeof respostasBase.workflow === 'object' ? (respostasBase.workflow as Record<string, unknown>) : {}),
                ...workflowAdicional,
                resultado,
                finalizadoPor: usuario || null,
                finalizadoEm: new Date().toISOString(),
            },
        };

        const { data: updated, error: updateError } = await supabase
            .from('pre_analise')
            .update({
                status: resultado,
                analisado_por: usuario || null,
                data_analise: new Date().toISOString(),
                respostas,
            })
            .eq('id', preAnaliseId)
            .select('*')
            .single();

        if (updateError) {
            console.error('Error finishing pre-analise:', updateError);
            throw new Error('Erro ao finalizar Pre-Analise.');
        }

        if (resultado === 'aprovado') {
            await AnaliseTecnicaService.ensureFromPreAnalise({
                produtoId: String(updated.produto_id),
                preAnaliseId: String(updated.id),
                origem: 'pre_analise',
                codigoNF: String(updated.codigo_nf || ''),
                modeloRef: String(updated.modelo_ref || ''),
                ean: String(updated.ean || ''),
                recebidoPor: String(usuario || updated.recebido_por || ''),
                dadosPreAnalise: respostas,
                status: 'aguardando',
            });
        }

        return mapPreAnaliseRow(updated);
    }

    static async efetuarPreAnalise(produtoId: string): Promise<PreAnaliseProduto> {
        return this.iniciarPreAnalise(produtoId, '');
    }
}
