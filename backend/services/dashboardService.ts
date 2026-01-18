// Dashboard Service

import { supabase } from '@/lib/supabase';
import { DashboardData, DashboardStats, RecentActivity } from '../models/Dashboard';
import { User } from '../models/Auth';

export class DashboardService {
    /**
     * Get dashboard data for user
     */
    static async getDashboardData(user: User): Promise<DashboardData> {
        const stats = await this.getStats();
        const recentActivities = await this.getRecentActivities(user);

        return {
            stats,
            recentActivities,
            revenueChart: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                values: [0, 0, 0, 0, 0, 0] // Placeholder until Revenue table exists
            },
            statusDistribution: {
                labels: ['Em Análise', 'Aguardando Peça', 'Aprovado', 'Concluído'],
                values: [0, 0, 0, 0], // Placeholder until Status logic is confirmed
                colors: ['#F59E0B', '#EF4444', '#10B981', '#3B82F6']
            }
        };
    }

    /**
     * Get dashboard statistics from real DB counts
     */
    /**
     * Get dashboard statistics from real DB counts
     */
    static async getStats(): Promise<DashboardStats> {
        try {
            const [
                { count: orcamentosPendentes },
                { count: preAnalisesEmAndamento },
                { count: recebimentosAguardando },
                { count: nfeProcessadas }
            ] = await Promise.all([
                // Pending Budgets
                supabase.from('orcamentos').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
                // Pending Analyses
                // Pending Analyses
                supabase.from('pre_analise').select('*', { count: 'exact', head: true }).eq('status', 'em_analise'), // or 'pendente' depending on definition
                // Waiting Receipts
                supabase.from('recebimentos').select('*', { count: 'exact', head: true }).eq('status', 'aguardando'),
                // Processed NFEs
                supabase.from('nfe_xmls').select('*', { count: 'exact', head: true }).eq('status', 'processada')
            ]);

            return {
                orcamentosPendentes: orcamentosPendentes || 0,
                recebimentosAguardando: recebimentosAguardando || 0,
                preAnalisesEmAndamento: preAnalisesEmAndamento || 0,
                nfeProcessadas: nfeProcessadas || 0
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return {
                orcamentosPendentes: 0,
                recebimentosAguardando: 0,
                preAnalisesEmAndamento: 0,
                nfeProcessadas: 0
            };
        }
    }

    /**
     * Get recent activities from Audit Logs
     */
    static async getRecentActivities(user: User): Promise<RecentActivity[]> {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching activities:', error);
            return [];
        }

        return data.map((log: any) => ({
            id: log.id,
            type: 'orcamento', // Default or map from log.resource
            title: `${log.action} - ${log.resource}`,
            timestamp: new Date(log.created_at).toLocaleTimeString(),
            link: '#',
            permission: 'view_logs'
        }));
    }
}
