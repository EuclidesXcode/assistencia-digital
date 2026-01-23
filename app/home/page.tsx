"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Package,
  DollarSign,
  Truck,
  FileText,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock,
  PieChart,
  Calendar,
  MoreHorizontal,
  Bell,
  Search,
  X,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import { User } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { DashboardData } from "@/backend/models/Dashboard";
import { RevenueChart, StatusChart } from "@/components/dashboard/DashboardCharts";

type ActivityType =
  | "orcamento"
  | "produto"
  | "recebimento"
  | "nfe"
  | "pre-analise"
  | "cadastro"
  | string;

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-3 w-full">
          <div className="h-3 w-24 bg-slate-100 rounded-full" />
          <div className="h-8 w-16 bg-slate-100 rounded-xl" />
          <div className="h-5 w-32 bg-slate-100 rounded-full" />
        </div>
        <div className="h-10 w-10 bg-slate-100 rounded-full" />
      </div>
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
      <AlertTriangle size={32} className="mx-auto mb-2 opacity-40 text-slate-500" />
      <p className="text-slate-700 font-bold">{title}</p>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

const ACTIVITY_META: Record<string, { icon: any; color: string }> = {
  orcamento: { icon: DollarSign, color: "bg-blue-100 text-blue-600" },
  produto: { icon: Package, color: "bg-green-100 text-green-600" },
  recebimento: { icon: Truck, color: "bg-purple-100 text-purple-600" },
  nfe: { icon: FileText, color: "bg-indigo-100 text-indigo-600" },
  "pre-analise": { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
  cadastro: { icon: Package, color: "bg-green-100 text-green-600" },
};

function getActivityVisual(type: ActivityType) {
  return ACTIVITY_META[type] || { icon: Package, color: "bg-gray-100 text-gray-600" };
}

function QuickAction({
  href,
  permission,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  user,
}: {
  href: string;
  permission: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  user: User;
}) {
  const hasAccess = hasPermission(user, permission);

  if (!hasAccess) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white/70 opacity-60 cursor-not-allowed">
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center opacity-50`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-slate-500">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            BLOQUEADO
          </span>
          <Lock className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:shadow-indigo-100 transition-all group bg-white"
    >
      <div
        className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}
      >
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-black text-slate-800 group-hover:text-indigo-700 transition-colors">
          {title}
        </p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
    </Link>
  );
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [activityQuery, setActivityQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;

    if (!silent) setLoading(true);
    setRefreshing(true);

    const userData = localStorage.getItem("user");
    if (!userData) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const currentUser = JSON.parse(userData);
    setUser(currentUser);

    try {
      const { DashboardService } = await import("@/backend/services/dashboardService");
      const dashboardData = await DashboardService.getDashboardData(currentUser);
      setData(dashboardData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentActivities = data?.recentActivities || [];
  const filteredActivities = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    if (!q) return recentActivities;
    return recentActivities.filter((a) => {
      const hay = `${a.title} ${a.timestamp} ${a.type}`.toLowerCase();
      return hay.includes(q);
    });
  }, [recentActivities, activityQuery]);

  if (loading || !user) return <Spinner />;

  const branchName = user.branches?.branch_name || user.branchId || "—";
  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 px-6 sm:px-8 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 font-medium text-sm">
            Visão geral da operação — <span className="font-black text-slate-700">{branchName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 text-indigo-700 text-sm font-semibold">
            <Calendar size={14} className="mr-2" />
            <span suppressHydrationWarning>
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>

          <Link
            href="/home/notificacoes"
            className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
            title="Notificações"
          >
            <Bell size={18} />
          </Link>

          <button
            onClick={() => load({ silent: true })}
            className={`h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors ${refreshing ? "opacity-60 cursor-wait" : ""
              }`}
            title="Atualizar"
            disabled={refreshing}
          >
            <RefreshCcw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 sm:p-8 space-y-8">
        {/* Stats Grid (sem texto fixo de tendência) */}
        {!data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
                  <DollarSign size={20} />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">Orçamentos</p>
              <h3 className="text-3xl font-black text-slate-800">{stats?.orcamentosPendentes ?? 0}</h3>
            </div>

            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 border border-purple-100">
                  <Truck size={20} />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">Recebimento</p>
              <h3 className="text-3xl font-black text-slate-800">{stats?.recebimentosAguardando ?? 0}</h3>
            </div>

            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pré-Análises</p>
              <h3 className="text-3xl font-black text-slate-800">{stats?.preAnalisesEmAndamento ?? 0}</h3>
            </div>

            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <FileText size={20} />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">NF-e Processadas</p>
              <h3 className="text-3xl font-black text-slate-800">{stats?.nfeProcessadas ?? 0}</h3>
            </div>
          </div>
        )}

        {/* Charts (sem menu/export mockado) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Receita Mensal
              </h3>
            </div>

            <div className="h-72 w-full">
              {data?.revenueChart ? (
                <RevenueChart data={data.revenueChart} />
              ) : (
                <EmptyState title="Sem dados de receita" subtitle="O backend não retornou receitaChart." />
              )}
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Status Serviços
              </h3>
            </div>

            <div className="h-72 w-full flex justify-center">
              {data?.statusDistribution ? (
                <StatusChart data={data.statusDistribution} />
              ) : (
                <EmptyState title="Sem distribuição de status" subtitle="O backend não retornou statusDistribution." />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Atividades Recentes</h2>
                <p className="text-sm text-slate-500">Últimas atualizações do sistema.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    value={activityQuery}
                    onChange={(e) => setActivityQuery(e.target.value)}
                    placeholder="Buscar atividade..."
                    className="h-10 pl-10 pr-10 rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  {activityQuery && (
                    <button
                      onClick={() => setActivityQuery("")}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                      aria-label="Limpar busca"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <Link
                  href="/home/notificacoes"
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-black bg-indigo-50 px-4 py-2 rounded-full transition-colors"
                >
                  Ver todas
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {filteredActivities.length === 0 ? (
                <div className="text-center text-slate-400 py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  {recentActivities.length === 0 ? "Nenhuma atividade recente." : "Nada encontrado com esse filtro."}
                </div>
              ) : (
                filteredActivities.map((activity) => {
                  const meta = getActivityVisual(activity.type);
                  const Icon = meta.icon;

                  return (
                    <Link
                      key={activity.id}
                      href={activity.link}
                      className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${meta.color} shadow-sm`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 py-1">
                        <p className="text-sm font-black text-slate-800 group-hover:text-indigo-700 transition-colors">
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
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Actions (sem badge PRONTO/ATUALIZANDO mockado) */}
          <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-6 sm:p-8">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
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
                user={user}
              />

              <QuickAction
                href="/home/orcamentos"
                permission="orcamentos"
                icon={DollarSign}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                title="Novo Orçamento"
                subtitle="Criar proposta"
                user={user}
              />

              <QuickAction
                href="/home/nfe-xml"
                permission="nfe"
                icon={FileText}
                iconBg="bg-indigo-100"
                iconColor="text-indigo-600"
                title="Upload NF-e"
                subtitle="Importar XML"
                user={user}
              />

              <QuickAction
                href="/home/recebimento"
                permission="recebimento"
                icon={Truck}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
                title="Recebimento"
                subtitle="Check-in"
                user={user}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
