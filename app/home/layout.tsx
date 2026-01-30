'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LogOut,
  Menu,
  Bell,
  LayoutDashboard,
  Package,
  DollarSign,
  Truck,
  ClipboardCheck,
  Users,
  Settings,
  Wrench,
  MapPin,
  BadgeCheck,
  Box,
  Ship,
  Search,
  Building2,
  UserPlus,
} from 'lucide-react';
import { User } from '@/types';
import GlobalSearch from '@/components/GlobalSearch';
import Sidebar, { Group, MenuData, Screen, ScreenKey } from '@/components/Sidebar';
import { hasPermission } from '@/lib/permissions';

const SYSTEM_NAME = 'Gromit';
const SYSTEM_DOT = 'Gromit.Control';

const SCREEN_ROUTES: Record<ScreenKey, string> = {
  dashboard: '/home',
  recebimento: '/home/recebimento',
  recebimento_com_nf: '/home/recebimento/com-nf',
  recebimento_sem_nf: '/home/recebimento/sem-nf',
  pre_analise: '/home/pre-analise',
  analise_tecnica: '/home/analise-tecnica',
  endereco: '/home/endereco',
  conserto: '/home/conserto',
  qualidade: '/home/qualidade',
  embalagem: '/home/embalagem',
  expedicao: '/home/expedicao',
  cadastro_produtos: '/home/produtos',
  orcamento: '/home/orcamentos',
  verificar_disponibilidade: '/home/verificar-disponibilidade',
  cadastro_empresas: '/home/cadastro-empresas',
  cadastro_clientes: '/home/cadastro-clientes',
  cadastro_usuario: '/home/usuarios',
};

const SCREEN_LABELS: Record<ScreenKey, string> = {
  dashboard: 'Dashboard',
  recebimento: '01 - Recebimento',
  recebimento_com_nf: 'Com NF',
  recebimento_sem_nf: 'Sem NF',
  pre_analise: 'Pre-analise',
  analise_tecnica: 'Analise tecnica',
  endereco: 'Endereco',
  conserto: 'Conserto',
  qualidade: 'Qualidade',
  embalagem: 'Embalagem',
  expedicao: 'Expedicao',
  cadastro_produtos: 'Cadastro de produtos',
  orcamento: 'Orcamento',
  verificar_disponibilidade: 'Verificar disponibilidade',
  cadastro_empresas: 'Cadastro de empresas',
  cadastro_clientes: 'Cadastro de clientes',
  cadastro_usuario: 'Cadastro de usuario',
};

const SCREEN_GROUPS: Record<ScreenKey, Group> = {
  dashboard: 'GERAL',
  recebimento: 'PRODUCAO',
  recebimento_com_nf: 'PRODUCAO',
  recebimento_sem_nf: 'PRODUCAO',
  pre_analise: 'PRODUCAO',
  analise_tecnica: 'PRODUCAO',
  endereco: 'PRODUCAO',
  conserto: 'PRODUCAO',
  qualidade: 'PRODUCAO',
  embalagem: 'PRODUCAO',
  expedicao: 'PRODUCAO',
  cadastro_produtos: 'ADMINISTRATIVO',
  orcamento: 'ADMINISTRATIVO',
  verificar_disponibilidade: 'ADMINISTRATIVO',
  cadastro_empresas: 'ADMINISTRATIVO',
  cadastro_clientes: 'ADMINISTRATIVO',
  cadastro_usuario: 'ADMIN',
};

const SCREEN_ICONS: Record<ScreenKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  recebimento: Truck,
  recebimento_com_nf: Truck,
  recebimento_sem_nf: Truck,
  pre_analise: ClipboardCheck,
  analise_tecnica: Wrench,
  endereco: MapPin,
  conserto: Settings,
  qualidade: BadgeCheck,
  embalagem: Box,
  expedicao: Ship,
  cadastro_produtos: Package,
  orcamento: DollarSign,
  verificar_disponibilidade: Search,
  cadastro_empresas: Building2,
  cadastro_clientes: Users,
  cadastro_usuario: UserPlus,
};

const SCREEN_PERMISSIONS: Partial<Record<ScreenKey, string>> = {
  recebimento: 'recebimento',
  recebimento_com_nf: 'recebimento',
  recebimento_sem_nf: 'recebimento',
  pre_analise: 'pre-analise',
  analise_tecnica: 'recebimento',
  endereco: 'recebimento',
  conserto: 'recebimento',
  qualidade: 'recebimento',
  embalagem: 'recebimento',
  expedicao: 'recebimento',
  cadastro_produtos: 'cadastro',
  orcamento: 'orcamentos',
  verificar_disponibilidade: 'orcamentos',
  cadastro_empresas: 'cadastro',
  cadastro_clientes: 'cadastro',
  cadastro_usuario: 'admin',
};

const PRODUCAO_KEYS: ScreenKey[] = [
  'pre_analise',
  'analise_tecnica',
  'endereco',
  'conserto',
  'qualidade',
  'embalagem',
  'expedicao',
];

const ADMINISTRATIVO_KEYS: ScreenKey[] = [
  'cadastro_produtos',
  'orcamento',
  'verificar_disponibilidade',
  'cadastro_empresas',
  'cadastro_clientes',
];

const ADMIN_KEYS: ScreenKey[] = ['cadastro_usuario'];

const ALL_KEYS: ScreenKey[] = [
  'dashboard',
  'recebimento',
  'recebimento_com_nf',
  'recebimento_sem_nf',
  ...PRODUCAO_KEYS,
  ...ADMINISTRATIVO_KEYS,
  ...ADMIN_KEYS,
];

const getScreenFromPath = (pathname: string): ScreenKey => {
  if (pathname === '/home') return 'dashboard';
  if (pathname.startsWith('/home/recebimento/com-nf')) return 'recebimento_com_nf';
  if (pathname.startsWith('/home/recebimento/sem-nf')) return 'recebimento_sem_nf';
  if (pathname.startsWith('/home/recebimento')) return 'recebimento';
  if (pathname.startsWith('/home/pre-analise')) return 'pre_analise';
  if (pathname.startsWith('/home/analise-tecnica')) return 'analise_tecnica';
  if (pathname.startsWith('/home/endereco')) return 'endereco';
  if (pathname.startsWith('/home/conserto')) return 'conserto';
  if (pathname.startsWith('/home/qualidade')) return 'qualidade';
  if (pathname.startsWith('/home/embalagem')) return 'embalagem';
  if (pathname.startsWith('/home/expedicao')) return 'expedicao';
  if (pathname.startsWith('/home/produtos')) return 'cadastro_produtos';
  if (pathname.startsWith('/home/orcamentos')) return 'orcamento';
  if (pathname.startsWith('/home/verificar-disponibilidade')) return 'verificar_disponibilidade';
  if (pathname.startsWith('/home/cadastro-empresas')) return 'cadastro_empresas';
  if (pathname.startsWith('/home/cadastro-clientes')) return 'cadastro_clientes';
  if (pathname.startsWith('/home/usuarios')) return 'cadastro_usuario';
  return 'dashboard';
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMini, setSidebarMini] = useState(false);
  const [recebimentoOpen, setRecebimentoOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    const currentUser = JSON.parse(userData);
    setUser(currentUser);

    const loadUnreadCount = async () => {
      try {
        const { NotificationService } = await import('@/backend/services/notificationService');
        const count = await NotificationService.getUnreadCount(currentUser);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };
    loadUnreadCount();

    const updateViewport = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
        setSidebarMini(false);
      }
    };
    updateViewport();

    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen && !isDesktop) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen, isDesktop]);

  useEffect(() => {
    const shouldLock = sidebarOpen && !isDesktop;
    if (shouldLock) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, isDesktop]);

  useEffect(() => {
    const current = getScreenFromPath(pathname);
    if (current === 'recebimento' || current === 'recebimento_com_nf' || current === 'recebimento_sem_nf') {
      setRecebimentoOpen(true);
    }
  }, [pathname]);

  const screen = getScreenFromPath(pathname);

  const can = (key: ScreenKey) => {
    if (!user) return false;
    if (key === 'dashboard') return true;
    const perm = SCREEN_PERMISSIONS[key];
    if (!perm) return true;
    return hasPermission(user, perm);
  };

  const buildScreen = (key: ScreenKey): Screen => ({
    key,
    label: SCREEN_LABELS[key],
    group: SCREEN_GROUPS[key],
    icon: SCREEN_ICONS[key],
  });

  const menu: MenuData = {
    dashboard: can('dashboard') ? buildScreen('dashboard') : undefined,
    recebimento: buildScreen('recebimento'),
    producao: PRODUCAO_KEYS.map(buildScreen).filter((item) => can(item.key)),
    administrativo: ADMINISTRATIVO_KEYS.map(buildScreen).filter((item) => can(item.key)),
    admin: ADMIN_KEYS.map(buildScreen).filter((item) => can(item.key)),
  };

  const screens = ALL_KEYS.map(buildScreen);

  const handleSetScreen = (key: ScreenKey) => {
    const href = SCREEN_ROUTES[key];
    if (!href) return;
    router.push(href);
    if (!isDesktop) setSidebarOpen(false);
  };

  const handleSidebarToggle = () => {
    if (isDesktop) {
      setSidebarMini((s) => !s);
    } else {
      setSidebarOpen((s) => !s);
    }
  };

  const effectiveSidebarMini = isDesktop ? sidebarMini : false;
  const sidebarVisible = isDesktop || sidebarOpen;
  const sidebarWidth = isDesktop ? (effectiveSidebarMini ? '78px' : '300px') : '0px';
  const mainStyle = { '--sidebar-w': sidebarWidth } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-x-hidden">
      {sidebarOpen && !isDesktop && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <div
        id="sidebar"
        className={`fixed left-0 top-0 z-[60] h-full transition-transform duration-300 ease-in-out ${sidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:static md:translate-x-0 md:shrink-0`}
      >
        <Sidebar
          systemName={SYSTEM_NAME}
          systemDot={SYSTEM_DOT}
          screens={screens}
          menu={menu}
          screen={screen}
          setScreen={handleSetScreen}
          can={can}
          sidebarMini={effectiveSidebarMini}
          recebimentoOpen={recebimentoOpen}
          setRecebimentoOpen={setRecebimentoOpen}
        />
      </div>

      <main className="min-w-0 flex-1 flex flex-col h-screen overflow-hidden" style={mainStyle}>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-[50] flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSidebarToggle}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
            >
              <Menu size={20} />
            </button>
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-4">
            <Link href="/home/notificacoes" className="relative p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors group">
              <Bell size={20} className={unreadCount > 0 ? 'animate-bell-shake' : ''} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
              )}
            </Link>
            <div className="h-6 w-px bg-slate-200"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        <div className="min-w-0 flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
