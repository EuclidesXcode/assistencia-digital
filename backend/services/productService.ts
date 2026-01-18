import { supabase } from '@/lib/supabase';
import { CreateProductDTO } from '../models/Product';

export class ProductService {
    static async createProduct(data: CreateProductDTO): Promise<void> {
        const { error } = await supabase.from('produtos').insert([{
            ean: data.ean,
            modelo_ref: data.modeloRef,
            marca: data.marca,
            nfs_data: data.nfs,
            modelos_data: data.modelos,
            embalagem: data.embalagem,
            acessorios: data.acessorios,
            fotos: data.fotos,
            manual_url: data.manualUrl,
            estoque_atual: 0 // Default
        }]);

        if (error) {
            console.error('Error creating product:', error);
            throw new Error('Erro ao salvar produto no banco de dados');
        }
    }
}

