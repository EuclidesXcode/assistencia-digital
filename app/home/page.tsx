"use client";

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
  PieChart,
  Calendar,
  MoreHorizontal,
  Bell
} from 'lucide-react';
import { User } from '@/types';
import { hasPermission } from '@/lib/permissions';
import { DashboardData } from '@/backend/models/Dashboard';
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
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
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed">
          <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center opacity-50`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-500">{title}</p>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
          <Lock className="w-4 h-4 text-slate-400" />
        </div>
      );
    }

    return (
      <Link
        href={href}
        className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:shadow-indigo-100 transition-all group bg-white"
      >
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* --- Floating Header (Glassmorphism) --- */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 px-8 py-4 flex items-center justify-between shadow-sm transition-all duration-200">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 font-medium text-sm">Visão geral da operação - {user.branches?.branch_name || user.branchId}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 text-indigo-700 text-sm font-semibold">
            <Calendar size={14} className="mr-2" />
            <span suppressHydrationWarning>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8 space-y-8">

        {/* --- Stats Grid --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1 */}
          <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
                <DollarSign size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Orçamentos</p>
            <h3 className="text-3xl font-black text-slate-800 mb-2">{data?.stats.orcamentosPendentes || 0}</h3>
            <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
              <TrendingUp size={12} className="mr-1" /> +12% vs mês anterior
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 border border-purple-100">
                <Truck size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Recebimento</p>
            <h3 className="text-3xl font-black text-slate-800 mb-2">{data?.stats.recebimentosAguardando || 0}</h3>
            <div className="flex items-center text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full w-fit">
              Estável
            </div>
          </div>

          {/* Stat 3 */}
          <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Pré-Análises</p>
            <h3 className="text-3xl font-black text-slate-800 mb-2">{data?.stats.preAnalisesEmAndamento || 0}</h3>
            <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
              <TrendingUp size={12} className="mr-1" /> +8% demanda
            </div>
          </div>

          {/* Stat 4 */}
          <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100">
                <FileText size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">NF-e Processadas</p>
            <h3 className="text-3xl font-black text-slate-800 mb-2">{data?.stats.nfeProcessadas || 0}</h3>
            <div className="flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full w-fit">
              Hoje
            </div>
          </div>
        </div>

        {/* --- Charts Section --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Receita Mensal (Estimada)
              </h3>
              <button onClick={() => alert("Opções do gráfico de receita")} className="text-slate-400 hover:text-indigo-600"><MoreHorizontal size={20} /></button>
            </div>
            <div className="h-72 w-full">
              {data?.revenueChart && <RevenueChart data={data.revenueChart} />}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Status Serviços
              </h3>
              <button onClick={() => alert("Opções do gráfico de status")} className="text-slate-400 hover:text-purple-600"><MoreHorizontal size={20} /></button>
            </div>
            <div className="h-72 w-full flex justify-center">
              {data?.statusDistribution && <StatusChart data={data.statusDistribution} />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* --- Recent Activity --- */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Atividades Recentes</h2>
                <p className="text-sm text-slate-500">Últimas atualizações do sistema.</p>
              </div>
              <Link href="/home/notificacoes" className="text-sm text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-4 py-2 rounded-full transition-colors">
                Ver todas
              </Link>
            </div>

            <div className="space-y-4">
              {data?.recentActivities.length === 0 ? (
                <div className="text-center text-slate-400 py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  Nenhuma atividade recente.
                </div>
              ) : (
                data?.recentActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={activity.link}
                    className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)} shadow-sm`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {activity.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">{activity.timestamp}</span>
                      </div>
                    </div>
                    <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-5 h-5 text-indigo-400" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* --- Quick Actions --- */}
          <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Package className="text-indigo-600" />
              Ações Rápidas
            </h2>

            <div className="space-y-3">
              <QuickAction
                href="/home/cadastro"
                permission="cadastro"
                icon={Package}
                iconBg="bg-green-100"
                iconColor="text-green-600"
                title="Novo Produto"
                subtitle="Cadastrar SKU"
              />

              <QuickAction
                href="/home/orcamentos"
                permission="orcamentos"
                icon={DollarSign}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                title="Novo Orçamento"
                subtitle="Criar proposta"
              />

              <QuickAction
                href="/home/nfe-xml"
                permission="nfe"
                icon={FileText}
                iconBg="bg-indigo-100"
                iconColor="text-indigo-600"
                title="Upload NF-e"
                subtitle="Importar XML"
              />

              <QuickAction
                href="/home/recebimento"
                permission="recebimento"
                icon={Truck}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
                title="Recebimento"
                subtitle="Check-in"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
