import { Notification, CreateNotificationDTO } from '../models/Notification';
import { User } from '../models/Auth';

export class NotificationService {
    /**
     * Get notifications for user
     */
    static async getNotifications(user: User): Promise<Notification[]> {
        const response = await fetch(`/api/notifications?userId=${user.id}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.notifications || [];
    }

    /**
     * Get unread notifications count
     */
    static async getUnreadCount(user: User): Promise<number> {
        const response = await fetch(`/api/notifications/unread-count?userId=${user.id}`);
        if (!response.ok) return 0;
        const data = await response.json();
        return data.count || 0;
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId: string): Promise<void> {
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: notificationId })
        });
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(user: User): Promise<void> {
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true, userId: user.id })
        });
    }

    /**
     * Create new notification
     */
    static async createNotification(data: CreateNotificationDTO): Promise<Notification> {
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Erro ao criar notificacao');
        }

        return response.json();
    }
}
