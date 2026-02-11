import { supabase } from '@/lib/supabase';
import { CreateProductDTO } from '../models/Product';

export class ProductService {
    static async createProduct(data: CreateProductDTO): Promise<void> {
        // Removida a verificação de EAN existente para permitir múltiplos registros (unidades) com o mesmo EAN.
        // O que diferencia cada registro é o ID único (uuid) gerado pelo banco.

        const { error } = await supabase.from('produtos').insert([{
            ean: data.ean,
            marca: data.marca,
            manual_url: data.manualUrl,
            fotos: data.fotos,
            nfs_data: data.nfs,
            modelos_data: data.modelos,
            embalagem: data.embalagem,
            acessorios: data.acessorios,
            funcionalidade: data.funcionalidade,
            estoque_atual: 0
        }]);

        if (error) {
            console.error('Error creating product:', error);
            throw new Error('Erro ao salvar produto no banco de dados: ' + error.message);
        }
    }

    private static mapProduct(data: any): any {
        return {
            id: data.id,
            ean: data.ean,
            modeloRef: data.modelo_ref,
            marca: data.marca || 'N/A',
            nfs: data.nfs_data || [],
            modelos: data.modelos_data || [],
            embalagem: data.embalagem || [],
            acessorios: data.acessorios || [],
            estetica: data.estetica || [],
            funcional: data.funcional || [],
            funcionalidade: data.funcionalidade || [],
            fotos: data.fotos || [],
            manualUrl: data.manual_url,
            estoqueAtual: data.estoque_atual,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    static async findByEan(ean: string): Promise<any | null> {
        // Busca o registro mais recente para este EAN para servir de template
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('ean', ean)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error finding product by EAN:', error);
            throw new Error('Erro ao buscar produto');
        }

        return data ? this.mapProduct(data) : null;
    }

    static async searchProducts(query: string, page: number = 1, pageSize: number = 20): Promise<{ data: any[], total: number, page: number, pageSize: number, totalPages: number }> {
        if (!query || query.length < 3) return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await supabase
            .from('produtos')
            .select('*', { count: 'exact' })
            .or(`ean.ilike.%${query}%,modelo_ref.ilike.%${query}%`)
            .range(from, to)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error searching products:', error);
            return { data: [], total: 0, page: 1, pageSize, totalPages: 0 };
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / pageSize);

        return {
            data: (data || []).map((item: any) => this.mapProduct(item)),
            total,
            page,
            pageSize,
            totalPages
        };
    }

    static async getLatestProducts(): Promise<any[]> {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching latest products:', error);
            return [];
        }

        return (data || []).map((item: any) => this.mapProduct(item));
    }


}

