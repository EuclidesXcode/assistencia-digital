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
            modelo_ref: data.modeloRef,
            marca: data.marca,
            nfs_data: data.nfs,
            modelos_data: data.modelos,
            embalagem: data.embalagem,
            acessorios: data.acessorios,
            estetica: data.estetica,
            funcional: data.funcional,
            funcionalidade: data.funcionalidade,
            fotos: data.fotos,
            manual_url: data.manualUrl,
            estoque_atual: 0 // Default
        }]);

        if (error) {
            console.error('Error creating product:', error);
            // Handle unique constraint error specifically if needed, though check above covers most cases
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
            if (error.code === 'PGRST116') return null; // Not found
            console.error('Error finding product by EAN:', error);
            throw new Error('Erro ao buscar produto');
        }

        return data;
    }

    static async searchProducts(query: string): Promise<any[]> {
        if (!query || query.length < 3) return [];

        const { data, error } = await supabase
            .from('produtos')
            .select('ean, modelo_ref, marca')
            .or(`ean.ilike.%${query}%,modelo_ref.ilike.%${query}%,marca.ilike.%${query}%`)
            .limit(20);

        if (error) {
            console.error('Error searching products:', error);
            return [];
        }
        return data || [];
    }
}

