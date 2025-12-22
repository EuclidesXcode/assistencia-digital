import { supabase } from '@/lib/supabase';
import { ProductFormData } from '../models/Product';

export class ProductService {
    static async createProduct(data: ProductFormData): Promise<void> {
        const { error } = await supabase.from('produtos').insert([{
            codigo_nf: data.codigo,
            ean: data.ean,
            modelo_ref: data.modeloRef,
            modelo_fabricante: data.modelosFabricante,
            acessorios: data.acessorios,
            estoque_atual: 0 // Default
        }]);

        if (error) {
            console.error('Error creating product:', error);
            throw new Error('Erro ao salvar produto no banco de dados');
        }
    }

    static async validateProduct(data: ProductFormData): Promise<Record<string, string>> {
        const errors: Record<string, string> = {};

        if (!data.marca) errors.marca = 'Marca é obrigatória';
        if (!data.categoria) errors.categoria = 'Categoria é obrigatória';
        if (!data.modelo) errors.modelo = 'Modelo é obrigatório';
        if (!data.descricao) errors.descricao = 'Descrição é obrigatória';

        return errors;
    }
}
