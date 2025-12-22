"use client";

import { useState, useEffect, useMemo } from "react";
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
import { User } from "@/types";
import { hasPermission } from "@/lib/permissions";

interface Notification {
    id: string;
    type: 'orcamento' | 'recebimento' | 'pre-analise' | 'nfe' | 'alerta' | 'sucesso' | 'cadastro';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    link?: string;
    permission?: string;
}

export default function NotificacoesPage() {
    const [user, setUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadNotifications = async () => {
            const userData = localStorage.getItem('user');
            if (!userData) {
                setLoading(false);
                return;
            }

            const currentUser = JSON.parse(userData);
            setUser(currentUser);

            try {
                const { NotificationService } = await import('@/backend/services/notificationService');
                const userNotifications = await NotificationService.getNotifications(currentUser as any);
                setNotifications(userNotifications);
            } catch (error) {
                console.error('Error loading notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        loadNotifications();
    }, []);

    // Filter notifications based on user permissions
    const filteredNotifications = useMemo(() => {
        if (!user) return [];

        return notifications.filter(notification => {
            if (!notification.permission) return true;
            return hasPermission(user, notification.permission);
        });
    }, [notifications, user]);

    const markAsRead = async (id: string) => {
        try {
            const { NotificationService } = await import('@/backend/services/notificationService');
            await NotificationService.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        try {
            const { NotificationService } = await import('@/backend/services/notificationService');
            await NotificationService.markAllAsRead(user as any);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const unreadCount = filteredNotifications.filter(n => !n.read).length;

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
            case 'cadastro':
                return <Package className="w-5 h-5" />;
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
            case 'cadastro':
                return 'bg-green-100 text-green-600';
        }
    };

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

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
                {filteredNotifications.length === 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma notificação</h3>
                        <p className="text-sm text-slate-600">Você está em dia! Não há notificações no momento.</p>
                    </div>
                ) : (
                    filteredNotifications.map((notification) => (
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
                                            <h3 className={`text-sm font-semibold ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
                                                {notification.title}
                                            </h3>
                                            {!notification.read && (
                                                <span className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-1.5"></span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 mb-2">{notification.message}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock className="w-3 h-3" />
                                            <span>{notification.timestamp}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-4 flex items-center gap-3 pt-3 border-t border-slate-100">
                                    {notification.link && (
                                        <Link
                                            href={notification.link}
                                            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                        >
                                            Ver detalhes
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    )}
                                    {!notification.read && (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            className="text-sm text-slate-600 hover:text-slate-700"
                                        >
                                            Marcar como lida
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
