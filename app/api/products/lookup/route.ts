
import { NextResponse } from 'next/server';
import { ProductService } from '@/backend/services/productService';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ean = searchParams.get('ean');

    if (!ean) {
        return NextResponse.json({ error: 'EAN is required' }, { status: 400 });
    }

    try {
        const product = await ProductService.findByEan(ean);
        if (!product) {
            return NextResponse.json({ found: false }, { status: 404 });
        }
        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
