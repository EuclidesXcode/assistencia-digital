import { DashboardService } from '../services/dashboardService';

describe('DashboardService', () => {
    const mockUser = { id: '1', role: 'Administrador', permissions: [] } as any;

    it('should get dashboard data', async () => {
        const data = await DashboardService.getDashboardData(mockUser);
        expect(data.stats).toBeDefined();
        expect(Array.isArray(data.recentActivities)).toBe(true);
    });

    it('should get stats', async () => {
        const stats = await DashboardService.getStats();
        expect(stats).toBeDefined();
    });

    it('should get recent activities', async () => {
        const activities = await DashboardService.getRecentActivities(mockUser);
        expect(Array.isArray(activities)).toBe(true);
    });
});
