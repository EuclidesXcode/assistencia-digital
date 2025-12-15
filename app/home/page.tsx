'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Truck,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock
} from 'lucide-react';
import { User } from '@/types';
import { hasPermission } from '@/lib/permissions';

interface DashboardStats {
  orcamentosPendentes: number;
  recebimentosAguardando: number;
  preAnalisesEmAndamento: number;
  nfeProcessadas: number;
}

interface RecentActivity {
  id: string;
  type: 'orcamento' | 'produto' | 'recebimento' | 'nfe' | 'pre-analise' | 'cadastro';
  title: string;
  timestamp: string;
  link: string;
  permission: string;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    orcamentosPendentes: 0,
    recebimentosAguardando: 0,
    preAnalisesEmAndamento: 0,
    nfeProcessadas: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setLoading(false);
        return;
      }

      const currentUser = JSON.parse(userData);
      setUser(currentUser);

      try {
        // Import DashboardService dynamically
        const { DashboardService } = await import('@/backend/services/dashboardService');

        // Load dashboard data
        const dashboardData = await DashboardService.getDashboardData(currentUser);
        setStats(dashboardData.stats);
        setRecentActivities(dashboardData.recentActivities);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'orcamento':
        return <DollarSign className="w-4 h-4" />;
      case 'produto':
        return <Package className="w-4 h-4" />;
      case 'recebimento':
        return <Truck className="w-4 h-4" />;
      case 'nfe':
        return <FileText className="w-4 h-4" />;
      case 'pre-analise':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'cadastro':
        return <Package className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'orcamento':
        return 'bg-blue-100 text-blue-600';
      case 'produto':
        return 'bg-green-100 text-green-600';
      case 'recebimento':
        return 'bg-purple-100 text-purple-600';
      case 'nfe':
        return 'bg-indigo-100 text-indigo-600';
      case 'pre-analise':
        return 'bg-emerald-100 text-emerald-600';
      case 'cadastro':
        return 'bg-green-100 text-green-600';
    }
  };

  // Filter activities based on permissions
  const filteredActivities = recentActivities.filter(activity =>
    hasPermission(user, activity.permission)
  );

  // Dashboard card component with permission check
  const DashboardCard = ({
    href,
    permission,
    icon: Icon,
    iconBg,
    iconColor,
    borderColor,
    value,
    label,
    actionColor
  }: {
    href: string;
    permission: string;
    icon: any;
    iconBg: string;
    iconColor: string;
    borderColor: string;
    value: number;
    label: string;
    actionColor: string;
  }) => {
    const hasAccess = hasPermission(user, permission);

    if (!hasAccess) {
      return (
        <div className="relative">
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <Lock className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-400">{value}</h3>
            <p className="text-sm text-slate-400 mt-1">{label}</p>
            <div className="mt-3 flex items-center text-xs text-slate-400 font-medium">
              Sem permissão
            </div>
          </div>
        </div>
      );
    }

    return (
      <Link href={href} className="group">
        <div className={`bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-all hover:${borderColor}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <TrendingUp className={`w-5 h-5 ${iconColor}`} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
          <p className="text-sm text-slate-600 mt-1">{label}</p>
          <div className={`mt-3 flex items-center text-xs ${actionColor} font-medium`}>
            Ver todos <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>
      </Link>
    );
  };

  // Quick action component with permission check
  const QuickAction = ({ href, permission, icon: Icon, iconBg, iconColor, title, subtitle }: {
    href: string;
    permission: string;
    icon: any;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
  }) => {
    const hasAccess = hasPermission(user, permission);

    if (!hasAccess) {
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed">
          <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center opacity-50`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
          <Lock className="w-4 h-4 text-slate-400" />
        </div>
      );
    }

    return (
      <Link
        href={href}
        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
      >
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600" />
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-600 mt-1">Bem-vindo de volta, {user.name}! Matriz: {user.branchId}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          href="/home/orcamentos"
          permission="orcamentos"
          icon={DollarSign}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          borderColor="border-blue-300"
          value={stats.orcamentosPendentes}
          label="Orçamentos Pendentes"
          actionColor="text-blue-600"
        />

        <DashboardCard
          href="/home/recebimento"
          permission="recebimento"
          icon={Truck}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          borderColor="border-purple-300"
          value={stats.recebimentosAguardando}
          label="Recebimentos Aguardando"
          actionColor="text-purple-600"
        />

        <DashboardCard
          href="/home/pre-analise"
          permission="pre-analise"
          icon={CheckCircle2}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          borderColor="border-green-300"
          value={stats.preAnalisesEmAndamento}
          label="Pré-análises em Andamento"
          actionColor="text-green-600"
        />

        <DashboardCard
          href="/home/nfe-xml"
          permission="nfe"
          icon={FileText}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          borderColor="border-indigo-300"
          value={stats.nfeProcessadas}
          label="NF-e Processadas Hoje"
          actionColor="text-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividades Recentes */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Atividades Recentes</h2>
            <Link href="/home/notificacoes" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Ver todas
            </Link>
          </div>

          <div className="space-y-4">
            {filteredActivities.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nenhuma atividade disponível</p>
            ) : (
              filteredActivities.map((activity) => (
                <Link
                  key={activity.id}
                  href={activity.link}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 group-hover:text-primary-600 transition-colors">
                      {activity.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{activity.timestamp}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600 transition-colors flex-shrink-0" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Ações Rápidas</h2>

          <div className="space-y-3">
            <QuickAction
              href="/home/cadastro"
              permission="cadastro"
              icon={Package}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              title="Novo Produto"
              subtitle="Cadastrar produto"
            />

            <QuickAction
              href="/home/orcamentos"
              permission="orcamentos"
              icon={DollarSign}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              title="Novo Orçamento"
              subtitle="Criar orçamento"
            />

            <QuickAction
              href="/home/nfe-xml"
              permission="nfe"
              icon={FileText}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
              title="Upload NF-e"
              subtitle="Processar XML"
            />

            <QuickAction
              href="/home/recebimento"
              permission="recebimento"
              icon={Truck}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
              title="Recebimento"
              subtitle="Iniciar processo"
            />
          </div>

          {/* Alertas */}
          {hasPermission(user, 'orcamentos') && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Atenção</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    5 orçamentos próximos do prazo limite
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
