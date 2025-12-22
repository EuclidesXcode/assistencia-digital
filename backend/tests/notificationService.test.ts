import { NotificationService } from '../services/notificationService';
import { CreateNotificationDTO } from '../models/Notification';

// Mock data is used internally. We can just test the public API.
// Note: tests modify the shared mock array, so order matters or we should reset.
// Since we can't easily reset an imported module in Jest without creating a mock for it,
// we will assume the tests run sequentially.

describe('NotificationService', () => {
    const mockUser = { id: '1', role: 'Administrador', permissions: [] } as any;

    it('should create a notification', async () => {
        const dto: CreateNotificationDTO = { title: 'T', message: 'M', type: 'alerta' };
        const notif = await NotificationService.createNotification(dto);
        expect(notif.title).toBe('T');
    });

    it('should get notifications for admin', async () => {
        const notifs = await NotificationService.getNotifications(mockUser);
        expect(Array.isArray(notifs)).toBe(true);
    });

    it('should get unread count', async () => {
        const count = await NotificationService.getUnreadCount(mockUser);
        expect(typeof count).toBe('number');
    });

    it('should mark as read', async () => {
        // Create one first to be sure
        const dto: CreateNotificationDTO = { title: 'T', message: 'M', type: 'alerta' };
        const notif = await NotificationService.createNotification(dto);
        await NotificationService.markAsRead(notif.id);
        const notifs = await NotificationService.getNotifications(mockUser);
        const found = notifs.find(n => n.id === notif.id);
        if (found) expect(found.read).toBe(true);
    });

    it('should mark all as read', async () => {
        await NotificationService.markAllAsRead(mockUser);
        const count = await NotificationService.getUnreadCount(mockUser);
        expect(count).toBe(0);
    });
});
