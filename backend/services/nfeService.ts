import { supabase } from '@/lib/supabase';
import { Nota } from '../models/NfeXml';

export class NfeService {
    static async getNotas(): Promise<Nota[]> {
        const { data, error } = await supabase.from('nfe_xmls').select('*');
        if (error) {
            console.error('Error fetching NFEs:', error);
            return [];
        }
        return data || [];
    }

    static async carregarXml(file?: File): Promise<Nota> {
        if (!file) throw new Error('Nenhum arquivo selecionado.');

        const text = await file.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

        const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
        if (!infNFe) throw new Error('XML inválido: tag infNFe não encontrada.');

        const ide = xmlDoc.getElementsByTagName("ide")[0];
        const nNF = ide?.getElementsByTagName("nNF")[0]?.textContent || '';
        const dhEmi = ide?.getElementsByTagName("dhEmi")[0]?.textContent || ide?.getElementsByTagName("dEmi")[0]?.textContent || new Date().toISOString();
        const itens = xmlDoc.getElementsByTagName("det").length;

        let chave = infNFe.getAttribute("Id") || '';
        if (chave.startsWith('NFe')) {
            chave = chave.substring(3);
        }

        const nota: Nota = {
            chave,
            numero: nNF,
            emissao: new Date(dhEmi).toLocaleDateString('pt-BR'),
            itens,
            status: 'PENDENTE'
        };

        const { error } = await supabase.from('nfe_xmls').insert([{
            chave: nota.chave,
            numero: nota.numero,
            emissao: dhEmi, // Save ISO string to DB
            itens: nota.itens,
            status: nota.status,
            xml_data: text
        }]);

        if (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('Nota Fiscal já importada (Chave duplicada).');
            }
            console.error('Error saving NFe:', error);
            throw new Error('Erro ao salvar NFe no banco.');
        }

        return nota;
    }

    static async getStats() {
        // Simple distinct count or fetch all and filter (optimized for now)
        const notas = await this.getNotas();
        return {
            total: notas.length,
            pendentes: notas.filter(n => n.status === 'PENDENTE').length,
            parciais: notas.filter(n => n.status === 'PARCIAL').length,
            divergentes: notas.filter(n => n.status === 'DIVERGENTE').length,
            conferidas: notas.filter(n => n.status === 'CONFERIDA').length,
        };
    }
}
