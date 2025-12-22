import { supabase } from '@/lib/supabase';
import { Notification, CreateNotificationDTO } from '../models/Notification';
import { User } from '../models/Auth';

export class NotificationService {
    /**
     * Get notifications for user
     */
    static async getNotifications(user: User): Promise<Notification[]> {
        // Fetch notifications from 'notifications' table
        // filtering by user_id OR global notifications (if implemented)
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .or(`user_id.eq.${user.id},global.eq.true`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            // Return empty if table doesn't exist
            return [];
        }

        return data || [];
    }

    /**
     * Get unread notifications count
     */
    static async getUnreadCount(user: User): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .or(`user_id.eq.${user.id},global.eq.true`)
            .eq('read', false);

        if (error) return 0;
        return count || 0;
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId: string): Promise<void> {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(user: User): Promise<void> {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id);
    }

    /**
     * Create new notification
     */
    static async createNotification(data: CreateNotificationDTO): Promise<Notification> {
        const { data: newNotification, error } = await supabase
            .from('notifications')
            .insert([{
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
                permission: data.permission,
                read: false,
                created_at: new Date()
            }])
            .select()
            .single();

        if (error) throw error;
        return newNotification;
    }
}
