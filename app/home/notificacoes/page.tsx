"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Package,
    Truck,
    FileText,
    ClipboardCheck,
    DollarSign,
    AlertCircle,
    CheckCircle2,
    Clock,
    ChevronRight
} from "lucide-react";

interface Notification {
    id: string;
    type: 'orcamento' | 'recebimento' | 'pre-analise' | 'nfe' | 'alerta' | 'sucesso';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    link?: string;
}

export default function NotificacoesPage() {
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: '1',
            type: 'orcamento',
            title: 'Novos produtos aguardando orçamento',
            message: '8 produtos analisados estão pendentes de elaboração de orçamento',
            timestamp: 'Há 5 minutos',
            read: false,
            link: '/home/orcamentos'
        },
        {
            id: '2',
            type: 'recebimento',
            title: 'Recebimento pendente',
            message: '3 produtos aguardando processo de recebimento',
            timestamp: 'Há 15 minutos',
            read: false,
            link: '/home/recebimento'
        },
        {
            id: '3',
            type: 'pre-analise',
            title: 'Pré-análise concluída',
            message: 'Produto A1234567 foi pré-analisado e está pronto para orçamento',
            timestamp: 'Há 1 hora',
            read: false,
            link: '/home/pre-analise'
        },
        {
            id: '4',
            type: 'nfe',
            title: 'NF-e processada',
            message: 'Nota Fiscal 000123 foi processada com sucesso',
            timestamp: 'Há 2 horas',
            read: true,
            link: '/home/nfe-xml'
        },
        {
            id: '5',
            type: 'alerta',
            title: 'Atenção: Prazo de orçamento',
            message: '5 produtos estão próximos do prazo limite para orçamento',
            timestamp: 'Há 3 horas',
            read: true,
            link: '/home/orcamentos'
        },
        {
            id: '6',
            type: 'sucesso',
            title: 'Cadastro atualizado',
            message: 'Informações do produto B7654321 foram atualizadas',
            timestamp: 'Ontem',
            read: true,
            link: '/home/cadastro'
        },
    ]);

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'orcamento':
                return <DollarSign className="w-5 h-5" />;
            case 'recebimento':
                return <Truck className="w-5 h-5" />;
            case 'pre-analise':
                return <ClipboardCheck className="w-5 h-5" />;
            case 'nfe':
                return <FileText className="w-5 h-5" />;
            case 'alerta':
                return <AlertCircle className="w-5 h-5" />;
            case 'sucesso':
                return <CheckCircle2 className="w-5 h-5" />;
        }
    };

    const getNotificationColor = (type: Notification['type']) => {
        switch (type) {
            case 'orcamento':
                return 'bg-blue-100 text-blue-600';
            case 'recebimento':
                return 'bg-purple-100 text-purple-600';
            case 'pre-analise':
                return 'bg-green-100 text-green-600';
            case 'nfe':
                return 'bg-indigo-100 text-indigo-600';
            case 'alerta':
                return 'bg-yellow-100 text-yellow-600';
            case 'sucesso':
                return 'bg-emerald-100 text-emerald-600';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">Notificações</h1>
                    <p className="text-sm text-slate-600">
                        {unreadCount > 0 ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}` : 'Todas as notificações foram lidas'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                        Marcar todas como lidas
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`bg-white rounded-lg border transition-all ${notification.read
                            ? 'border-slate-200'
                            : 'border-primary-200 bg-primary-50/30'
                            }`}
                    >
                        <div className="p-4">
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getNotificationColor(notification.type)} flex items-center justify-center`}>
                                    {getNotificationIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                        <h3 className={`font-semibold ${!notification.read && 'font-bold'}`} style={{ color: '#6b7280' }}>
                                            {notification.title}
                                        </h3>
                                        {!notification.read && (
                                            <span className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2"></span>
                                        )}
                                    </div>
                                    <p className="text-sm mb-2" style={{ color: '#6b7280' }}>{notification.message}</p>
                                    <div className="flex items-center gap-3 text-xs text-slate-600">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {notification.timestamp}
                                        </div>
                                    </div>
                                </div>

                                {/* Action */}
                                {notification.link && (
                                    <Link
                                        href={notification.link}
                                        onClick={() => markAsRead(notification.id)}
                                        className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-primary-600 transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State (if no notifications) */}
            {notifications.length === 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma notificação</h3>
                    <p className="text-sm text-slate-600">Você está em dia! Não há notificações no momento.</p>
                </div>
            )}
        </div>
    );
}
