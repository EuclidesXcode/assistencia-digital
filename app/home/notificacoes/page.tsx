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
    ChevronRight,
    Bell,
    CheckCheck,
    Trash2,
    Search
} from "lucide-react";
import { User } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/Button";

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
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

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

        let filtered = notifications.filter(notification => {
            if (!notification.permission) return true;
            return hasPermission(user, notification.permission);
        });

        if (filter === 'unread') {
            filtered = filtered.filter(n => !n.read);
        }

        return filtered;
    }, [notifications, user, filter]);

    const markAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
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
            case 'cadastro':
                return <Package className="w-5 h-5" />;
        }
    };

    const getNotificationColor = (type: Notification['type']) => {
        switch (type) {
            case 'orcamento':
                return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'recebimento':
                return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'pre-analise':
                return 'bg-green-50 text-green-600 border-green-100';
            case 'nfe':
                return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'alerta':
                return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'sucesso':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'cadastro':
                return 'bg-teal-50 text-teal-600 border-teal-100';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* --- Floating Header (Glassmorphism) --- */}
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 px-8 py-4 flex items-center justify-between shadow-sm transition-all duration-200">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Central de Notificações</h1>
                    <p className="text-slate-500 font-medium text-sm">Acompanhe as atualizações do sistema.</p>
                </div>
                <div className="flex gap-3">
                    {unreadCount > 0 && (
                        <Button
                            onClick={markAllAsRead}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200 rounded-full px-5 py-2 font-bold transition-all text-sm flex items-center gap-2"
                        >
                            <CheckCheck size={16} /> Marcar tudo como lido
                        </Button>
                    )}
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-8 space-y-8">

                {/* --- Filters (Bento Style Mini) --- */}
                <div className="bg-white p-2 ml-1 rounded-full border border-slate-200 shadow-sm inline-flex items-center gap-1">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === 'all'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${filter === 'unread'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        Não Lidas
                        {unreadCount > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === 'unread' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* --- Notifications List --- */}
                <div className="space-y-4">
                    {filteredNotifications.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-16 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                <Bell className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Tudo limpo por aqui!</h3>
                            <p className="text-slate-500 font-medium max-w-md mx-auto">
                                Você leu todas as notificações. Fique atento, novas atualizações aparecerão aqui.
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`group relative bg-white rounded-[1.5rem] border p-6 transition-all duration-200 ${notification.read
                                        ? 'border-slate-100 shadow-sm opacity-80 hover:opacity-100'
                                        : 'border-indigo-100 shadow-lg shadow-indigo-100/50 scale-[1.01]'
                                    } hover:border-indigo-200 hover:shadow-xl`}
                            >
                                <div className="flex items-start gap-5">
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${getNotificationColor(notification.type)} flex items-center justify-center border shadow-sm`}>
                                        {getNotificationIcon(notification.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div>
                                                <h3 className={`text-base font-bold ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
                                                    {notification.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mt-1 uppercase tracking-wide">
                                                    <Clock size={12} />
                                                    <span>{notification.timestamp}</span>
                                                    {!notification.read && (
                                                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full normal-case tracking-normal">Nova</span>
                                                    )}
                                                </div>
                                            </div>
                                            {!notification.read && (
                                                <button
                                                    onClick={(e) => markAsRead(notification.id, e)}
                                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-300 hover:text-indigo-600 transition-colors"
                                                    title="Marcar como lida"
                                                >
                                                    <CheckCircle2 size={18} />
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-slate-600 text-sm leading-relaxed mb-4 font-medium">
                                            {notification.message}
                                        </p>

                                        {notification.link && (
                                            <Link
                                                href={notification.link}
                                                className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:underline decoration-2 underline-offset-4 transition-all"
                                            >
                                                Ver detalhes <ChevronRight size={16} />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
