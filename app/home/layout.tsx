'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LogOut,
  Menu,
  Bell,
  Search,
  LayoutDashboard,
  Package,
  DollarSign,
  FileText,
  Truck,
  ClipboardCheck,
  Users,
  Settings
} from 'lucide-react';
import { User } from '@/types';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    const currentUser = JSON.parse(userData);
    setUser(currentUser);

    // Load unread notifications count
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

    // Initialize sidebar state based on viewport width (open on md and above)
    const initOpen = window.innerWidth >= 768;
    setSidebarOpen(initOpen);

    const onResize = () => {
      // keep behavior: when resizing to desktop, open sidebar; when going to small, keep current user preference
      if (window.innerWidth >= 768) setSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  // Close on Escape for accessibility
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  // Lock body scroll when sidebar is open on small screens
  useEffect(() => {
    const shouldLock = sidebarOpen && window.innerWidth < 768;
    if (shouldLock) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-x-hidden">
      {/* Sidebar */}
      {/* Backdrop shown on mobile when sidebar open */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 bg-white border-r border-slate-200 h-full min-h-screen transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-0 md:w-20'} md:sticky md:top-0 md:h-screen overflow-hidden`}
        id="sidebar"
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-100">
          {sidebarOpen ? (
            <span className="text-xl font-bold text-primary-600 tracking-tight">Lorem</span>
          ) : (
            <span className="text-xl font-bold text-primary-600">L</span>
          )}
        </div>



        <nav className="p-4 space-y-2">
          {/* Dashboard - always visible */}
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={pathname === '/home'} isOpen={sidebarOpen} href="/home" onNavigate={() => window.innerWidth < 768 && setSidebarOpen(false)} />

          {/* Cadastro - only if user has 'cadastro' permission or is admin */}
          {(user?.role === 'Administrador' || user?.permissions?.includes('cadastro')) && (
            <SidebarItem icon={Package} label="Cadastro" active={pathname === '/home/cadastro'} isOpen={sidebarOpen} href="/home/cadastro" onNavigate={() => window.innerWidth < 768 && setSidebarOpen(false)} />
          )}

          {/* Orçamentos - only if user has 'orcamentos' permission or is admin */}
          {(user?.role === 'Administrador' || user?.permissions?.includes('orcamentos')) && (
            <SidebarItem icon={DollarSign} label="Orçamentos" active={pathname === '/home/orcamentos'} isOpen={sidebarOpen} href="/home/orcamentos" onNavigate={() => window.innerWidth < 768 && setSidebarOpen(false)} />
          )}

          {/* NF-e (XML) - only if user has 'nfe' permission or is admin */}
          {(user?.role === 'Administrador' || user?.permissions?.includes('nfe')) && (
            <SidebarItem icon={FileText} label="NF-e (XML)" active={pathname === '/home/nfe-xml'} isOpen={sidebarOpen} href="/home/nfe-xml" onNavigate={() => window.innerWidth < 768 && setSidebarOpen(false)} />
          )}

          {/* Recebimento - only if user has 'recebimento' permission or is admin */}
          {(user?.role === 'Administrador' || user?.permissions?.includes('recebimento')) && (
            <SidebarItem icon={Truck} label="Recebimento" active={pathname === '/home/recebimento'} isOpen={sidebarOpen} href="/home/recebimento" onNavigate={() => window.innerWidth < 768 && setSidebarOpen(false)} />
          )}

          {/* Pré-análise - only if user has 'pre-analise' permission or is admin */}
          {(user?.role === 'Administrador' || user?.permissions?.includes('pre-analise')) && (
            <SidebarItem icon={ClipboardCheck} label="Pré-análise" active={pathname === '/home/pre-analise'} isOpen={sidebarOpen} href="/home/pre-analise" onNavigate={() => window.innerWidth < 768 && setSidebarOpen(false)} />
          )}

          {/* Usuários - only for Administrators */}
          {user?.role === 'Administrador' && (
            <SidebarItem icon={Users} label="Usuários" active={pathname === '/home/usuarios'} isOpen={sidebarOpen} href="/home/usuarios" onNavigate={() => window.innerWidth < 768 && setSidebarOpen(false)} />
          )}
        </nav>

        {/* User profile snippet at bottom of sidebar */}
        <Link href="/home/configuracoes" className="absolute bottom-0 w-full p-4 border-t border-slate-100 bg-white hover:bg-slate-50 transition-colors">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) ?? 'U'
              )}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{user?.name ?? 'Usuário'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.role ?? 'Usuário'}</p>
              </div>
            )}
          </div>
        </Link>
      </aside>

      {/* Main Content */}

      <main className="min-w-0 flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500/20">
              <Search size={16} className="text-slate-600 mr-2" />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-transparent border-none focus:outline-none text-sm text-slate-700 w-48 placeholder:text-slate-600"
              />
            </div>
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

        {/* Dashboard Content Area */}
        <div className="min-w-0 flex-1 p-8 overflow-auto">
          {children}
        </div>

      </main>
    </div>
  );
}

interface SidebarItemProps {
  icon: any;
  label: string;
  active?: boolean;
  isOpen: boolean;
  href?: string;
  onNavigate?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, isOpen, href, onNavigate }: SidebarItemProps) => {
  const className = `
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200
      ${active
      ? 'bg-primary-50 text-primary-700 font-medium'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }
      ${!isOpen && 'justify-center'}
    `;

  const inner = (
    <>
      <Icon size={24} className={`${active ? 'text-primary-600' : 'text-slate-600'} flex-shrink-0`} />
      {isOpen && <span>{label}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} onClick={onNavigate}>
        {inner}
      </Link>
    );
  }

  return (
    <button className={className} onClick={onNavigate}>
      {inner}
    </button>
  );
};
