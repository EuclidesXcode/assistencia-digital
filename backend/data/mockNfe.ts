import { Nota } from '../models/NfeXml';

export const mockNotas: Nota[] = [
    { chave: 'ABCD1234EFGH5678', numero: '000123', emissao: '01/12/2025', itens: 3, status: 'PENDENTE' },
    { chave: 'XYZT9876UVWX5432', numero: '000124', emissao: '02/12/2025', itens: 2, status: 'PARCIAL' },
    { chave: 'MNOP4567QRST8901', numero: '000125', emissao: '03/12/2025', itens: 1, status: 'CONFERIDA' },
];
