import { ProductFormData } from '../models/Product';

export class ProductService {
    static async createProduct(data: ProductFormData): Promise<void> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // In a real implementation, this would save to database
        console.log('Produto criado:', data);
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
