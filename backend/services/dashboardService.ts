// Dashboard Service

import { DashboardData, DashboardStats, RecentActivity } from '../models/Dashboard';
import { mockDashboardStats, mockRecentActivities } from '../data/mockDashboard';
import { User } from '../models/Auth';

export class DashboardService {
    /**
     * Get dashboard data for user (filtered by permissions)
     */
    static async getDashboardData(user: User): Promise<DashboardData> {
        // Filter activities based on user permissions
        const filteredActivities = mockRecentActivities.filter(activity => {
            // Admins see all activities
            if (user.role === 'Administrador') {
                return true;
            }

            // Check if user has permission for this activity
            return user.permissions.includes(activity.permission);
        });

        return {
            stats: mockDashboardStats,
            recentActivities: filteredActivities
        };
    }

    /**
     * Get dashboard statistics
     */
    static async getStats(): Promise<DashboardStats> {
        return mockDashboardStats;
    }

    /**
     * Get recent activities (filtered by permissions)
     */
    static async getRecentActivities(user: User): Promise<RecentActivity[]> {
        return mockRecentActivities.filter(activity => {
            if (user.role === 'Administrador') {
                return true;
            }
            return user.permissions.includes(activity.permission);
        });
    }
}
