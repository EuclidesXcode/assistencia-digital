// Mock Notifications Data

import { Notification } from '../models/Notification';

export const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'orcamento',
        title: 'Novos produtos aguardando orçamento',
        message: '8 produtos analisados estão pendentes de elaboração de orçamento',
        timestamp: 'Há 5 minutos',
        read: false,
        link: '/home/orcamentos',
        permission: 'orcamentos'
    },
    {
        id: '2',
        type: 'recebimento',
        title: 'Recebimento pendente',
        message: '3 produtos aguardando processo de recebimento',
        timestamp: 'Há 15 minutos',
        read: false,
        link: '/home/recebimento',
        permission: 'recebimento'
    },
    {
        id: '3',
        type: 'pre-analise',
        title: 'Pré-análise concluída',
        message: 'Produto A1234567 foi pré-analisado e está pronto para orçamento',
        timestamp: 'Há 1 hora',
        read: false,
        link: '/home/pre-analise',
        permission: 'pre-analise'
    },
    {
        id: '4',
        type: 'nfe',
        title: 'NF-e processada',
        message: 'Nota Fiscal 000123 foi processada com sucesso',
        timestamp: 'Há 2 horas',
        read: true,
        link: '/home/nfe-xml',
        permission: 'nfe'
    },
    {
        id: '5',
        type: 'alerta',
        title: 'Atenção: Prazo de orçamento',
        message: '5 produtos estão próximos do prazo limite para orçamento',
        timestamp: 'Há 3 horas',
        read: true,
        link: '/home/orcamentos',
        permission: 'orcamentos'
    },
    {
        id: '6',
        type: 'cadastro',
        title: 'Cadastro atualizado',
        message: 'Informações do produto B7654321 foram atualizadas',
        timestamp: 'Ontem',
        read: true,
        link: '/home/cadastro',
        permission: 'cadastro'
    }
];
