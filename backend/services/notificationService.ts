// Notification Service

import { Notification, CreateNotificationDTO } from '../models/Notification';
import { mockNotifications } from '../data/mockNotifications';
import { User } from '../models/Auth';

export class NotificationService {
    /**
     * Get notifications for user (filtered by permissions)
     */
    static async getNotifications(user: User): Promise<Notification[]> {
        return mockNotifications.filter(notification => {
            // If notification doesn't require permission, show it
            if (!notification.permission) {
                return true;
            }

            // Admins see all notifications
            if (user.role === 'Administrador') {
                return true;
            }

            // Check if user has permission for this notification
            return user.permissions.includes(notification.permission);
        });
    }

    /**
     * Get unread notifications count
     */
    static async getUnreadCount(user: User): Promise<number> {
        const notifications = await this.getNotifications(user);
        return notifications.filter(n => !n.read).length;
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId: string): Promise<void> {
        const notification = mockNotifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
        }
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(user: User): Promise<void> {
        const userNotifications = await this.getNotifications(user);
        userNotifications.forEach(n => {
            n.read = true;
        });
    }

    /**
     * Create new notification
     */
    static async createNotification(data: CreateNotificationDTO): Promise<Notification> {
        const newNotification: Notification = {
            id: String(mockNotifications.length + 1),
            type: data.type,
            title: data.title,
            message: data.message,
            timestamp: 'Agora',
            read: false,
            link: data.link,
            permission: data.permission
        };

        mockNotifications.unshift(newNotification);
        return newNotification;
    }
}
