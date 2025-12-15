// Mock Dashboard Data

import { DashboardStats, RecentActivity } from '../models/Dashboard';

export const mockDashboardStats: DashboardStats = {
    orcamentosPendentes: 8,
    recebimentosAguardando: 3,
    preAnalisesEmAndamento: 5,
    nfeProcessadas: 12
};

export const mockRecentActivities: RecentActivity[] = [
    {
        id: '1',
        type: 'orcamento',
        title: 'Orçamento A1234567 criado',
        timestamp: 'Há 5 minutos',
        link: '/home/orcamentos',
        permission: 'orcamentos'
    },
    {
        id: '2',
        type: 'produto',
        title: 'Produto 50UT8050PSA cadastrado',
        timestamp: 'Há 15 minutos',
        link: '/home/cadastro',
        permission: 'cadastro'
    },
    {
        id: '3',
        type: 'recebimento',
        title: 'Recebimento B7654321 concluído',
        timestamp: 'Há 1 hora',
        link: '/home/recebimento',
        permission: 'recebimento'
    },
    {
        id: '4',
        type: 'nfe',
        title: 'NF-e 000123 processada',
        timestamp: 'Há 2 horas',
        link: '/home/nfe-xml',
        permission: 'nfe'
    },
    {
        id: '5',
        type: 'pre-analise',
        title: 'Pré-análise P9876 finalizada',
        timestamp: 'Há 3 segundos',
        link: '/home/pre-analise',
        permission: 'pre-analise'
    }
];
