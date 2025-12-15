// Dashboard Models

export interface DashboardStats {
  orcamentosPendentes: number;
  recebimentosAguardando: number;
  preAnalisesEmAndamento: number;
  nfeProcessadas: number;
}

export interface RecentActivity {
  id: string;
  type: 'orcamento' | 'produto' | 'recebimento' | 'nfe' | 'pre-analise' | 'cadastro';
  title: string;
  timestamp: string;
  link: string;
  permission: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivities: RecentActivity[];
}
