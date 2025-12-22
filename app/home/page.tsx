'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  DollarSign,
  Truck,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock,
  PieChart
} from 'lucide-react';
import { User } from '@/types';
import { hasPermission } from '@/lib/permissions';
import { DashboardData, RevenueChartData, StatusDistributionData } from '@/backend/models/Dashboard';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueChart, StatusChart } from '@/components/dashboard/DashboardCharts';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
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
        const { DashboardService } = await import('@/backend/services/dashboardService');
        const dashboardData = await DashboardService.getDashboardData(currentUser);
        setData(dashboardData);
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

  const getActivityIcon = (type: any) => {
    switch (type) {
      case 'orcamento': return <DollarSign className="w-4 h-4" />;
      case 'produto': return <Package className="w-4 h-4" />;
      case 'recebimento': return <Truck className="w-4 h-4" />;
      case 'nfe': return <FileText className="w-4 h-4" />;
      case 'pre-analise': return <CheckCircle2 className="w-4 h-4" />;
      case 'cadastro': return <Package className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: any) => {
    switch (type) {
      case 'orcamento': return 'bg-blue-100 text-blue-600';
      case 'produto': return 'bg-green-100 text-green-600';
      case 'recebimento': return 'bg-purple-100 text-purple-600';
      case 'nfe': return 'bg-indigo-100 text-indigo-600';
      case 'pre-analise': return 'bg-emerald-100 text-emerald-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const QuickAction = ({ href, permission, icon: Icon, iconBg, iconColor, title, subtitle }: any) => {
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
          <h1 className="text-2xl font-bold text-slate-800">Dashboard de Controle</h1>
          <p className="text-slate-600 mt-1">Visão geral da operação - {user.branches?.branch_name || user.branchId}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Orçamentos Pendentes"
          value={data?.stats.orcamentosPendentes || 0}
          icon={DollarSign}
          color="blue"
          trend="+12%"
          trendUp={true}
        />
        <StatCard
          title="Aguardando Recebimento"
          value={data?.stats.recebimentosAguardando || 0}
          icon={Truck}
          color="purple"
          trend="-5%"
          trendUp={false}
        />
        <StatCard
          title="Pré-Análises"
          value={data?.stats.preAnalisesEmAndamento || 0}
          icon={CheckCircle2}
          color="green"
          trend="+8%"
          trendUp={true}
        />
        <StatCard
          title="NF-e Processadas"
          value={data?.stats.nfeProcessadas || 0}
          icon={FileText}
          color="indigo"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Receita Mensal (Estimada)
            </h3>
          </div>
          <div className="h-64">
            {data?.revenueChart && <RevenueChart data={data.revenueChart} />}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              Status dos Serviços
            </h3>
          </div>
          <div className="h-64 flex justify-center">
            {data?.statusDistribution && <StatusChart data={data.statusDistribution} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividades Recentes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Atividades Recentes</h2>
            <Link href="/home/notificacoes" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Ver todas
            </Link>
          </div>

          <div className="space-y-4">
            {data?.recentActivities.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nenhuma atividade disponível</p>
            ) : (
              data?.recentActivities.map((activity) => (
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
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Ações Rápidas</h2>

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
        </div>
      </div>
    </div>
  );
}
