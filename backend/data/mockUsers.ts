// Mock Users Data

import { User } from '../models/Auth';

export const mockUsers: User[] = [
    {
        id: '1',
        name: 'Administrador',
        email: 'admin@empresa.com',
        branchId: 'MATRIZ',
        role: 'Administrador',
        photoUrl: undefined,
        permissions: ['admin', 'cadastro', 'orcamentos', 'nfe', 'recebimento', 'pre-analise'],
        active: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLogin: new Date()
    },
    {
        id: '2',
        name: 'Eduardo Silva',
        email: 'eduardo@empresa.com',
        branchId: 'MATRIZ',
        role: 'Atendente',
        photoUrl: undefined,
        permissions: ['cadastro', 'orcamentos'],
        active: true,
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date('2024-02-15'),
        lastLogin: new Date()
    },
    {
        id: '3',
        name: 'Fernanda Costa',
        email: 'fernanda@empresa.com',
        branchId: 'FILIAL01',
        role: 'Atendente',
        photoUrl: undefined,
        permissions: ['cadastro', 'orcamentos'],
        active: true,
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-03-10'),
        lastLogin: new Date()
    }
];

// Mock passwords (in production, these would be hashed)
export const mockPasswords: Record<string, string> = {
    'admin@empresa.com': 'admin123',
    'eduardo@empresa.com': '123456',
    'fernanda@empresa.com': '123456'
};
