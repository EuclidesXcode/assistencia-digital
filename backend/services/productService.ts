import { supabase } from '@/lib/supabase';
import { CreateProductDTO } from '../models/Product';

export class ProductService {
    static async createProduct(data: CreateProductDTO): Promise<void> {
        // Check if EAN already exists
        const existing = await this.findByEan(data.ean);
        if (existing) {
            throw new Error(`O produto com EAN ${data.ean} já está cadastrado.`);
        }

        const { error } = await supabase.from('produtos').insert([{
            ean: data.ean,
            modelo_referencia: data.modeloRef,
            fabricante: data.marca,
            nfs_data: data.nfs,
            modelos_data: data.modelos,
            embalagem: data.embalagem,
            acessorios: data.acessorios,
            estetica: data.estetica,
            funcional: data.funcional,
            funcionalidade: data.funcionalidade,
            fotos: data.fotos,
            manual_url: data.manualUrl,
            estoque_atual: 0
        }]);

        if (error) {
            console.error('Error creating product:', error);
            if (error.code === '23505') throw new Error('Este EAN já está cadastrado.');
            throw new Error('Erro ao salvar produto no banco de dados');
        }
    }

    static async findByEan(ean: string): Promise<any | null> {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('ean', ean)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error finding product by EAN:', error);
            throw new Error('Erro ao buscar produto');
        }

        if (data) {
            // Map DB columns (snake_case) to Domain Model (camelCase)
            return {
                id: data.id,
                ean: data.ean,
                modeloRef: data.modelo_referencia,
                marca: data.fabricante,
                nfs: data.nfs_data || [],
                modelos: data.modelos_data || [],
                embalagem: data.embalagem || [],
                acessorios: data.acessorios || [],
                estetica: data.estetica || [],
                funcional: data.funcional || [],
                funcionalidade: data.funcionalidade || [], // Root functionality
                fotos: data.fotos || [],
                manualUrl: data.manual_url,
                estoqueAtual: data.estoque_atual,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        }

        return null;
    }

    static async searchProducts(query: string): Promise<any[]> {
        if (!query || query.length < 3) return [];

        const { data, error } = await supabase
            .from('produtos')
            .select('ean, modelo_referencia, fabricante')
            .or(`ean.ilike.%${query}%,modelo_referencia.ilike.%${query}%,fabricante.ilike.%${query}%`)
            .limit(20);

        if (error) {
            console.error('Error searching products:', error);
            return [];
        }

        return (data || []).map(item => ({
            ean: item.ean,
            modeloRef: item.modelo_referencia,
            marca: item.fabricante
        }));
    }

    static async getLatestProducts(): Promise<any[]> {
        const { data, error } = await supabase
            .from('produtos')
            .select('ean, modelo_referencia, fabricante')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching latest products:', error);
            return [];
        }

        return (data || []).map(item => ({
            ean: item.ean,
            modeloRef: item.modelo_referencia,
            marca: item.fabricante
        }));
    }
}

