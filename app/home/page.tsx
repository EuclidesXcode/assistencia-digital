'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  ClipboardCheck
} from 'lucide-react';
import { User } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Verificar se o usuário está logado
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    
    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed md:relative z-30 bg-white border-r border-slate-200 h-full min-h-screen transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-100">
          {sidebarOpen ? (
            <span className="text-xl font-bold text-primary-600 tracking-tight">Lorem</span>
          ) : (
             <span className="text-xl font-bold text-primary-600">L</span>
          )}
        </div>

        <nav className="p-4 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active isOpen={sidebarOpen} />
          <SidebarItem icon={Package} label="Cadastro" isOpen={sidebarOpen} />
          <SidebarItem icon={DollarSign} label="Orçamentos" isOpen={sidebarOpen} />
          <SidebarItem icon={FileText} label="NF-e (XML)" isOpen={sidebarOpen} />
          <SidebarItem icon={Truck} label="Recebimento" isOpen={sidebarOpen} />
          <SidebarItem icon={ClipboardCheck} label="Pré-análise" isOpen={sidebarOpen} />
        </nav>
        
        {/* User profile snippet at bottom of sidebar */}
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-100 bg-white">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0)}
                </div>
                {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.branchId}</p>
                    </div>
                )}
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500/20">
                <Search size={16} className="text-slate-400 mr-2" />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="bg-transparent border-none focus:outline-none text-sm text-slate-700 w-48 placeholder-slate-400"
                />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
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
        <div className="flex-1 p-8 overflow-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 min-h-[400px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <LayoutDashboard size={32} className="text-slate-400" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-500 mt-2">Bem-vindo ao dashboard {user.branchId}</p>
            </div>
        </div>

      </main>
    </div>
  );
}

// Helper sub-component for sidebar
interface SidebarItemProps {
  icon: any;
  label: string;
  active?: boolean;
  isOpen: boolean;
}

const SidebarItem = ({ icon: Icon, label, active, isOpen }: SidebarItemProps) => (
  <button 
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200
      ${active 
        ? 'bg-primary-50 text-primary-700 font-medium' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }
      ${!isOpen && 'justify-center'}
    `}
  >
    <Icon size={20} className={active ? 'text-primary-600' : 'text-slate-400'} />
    {isOpen && <span>{label}</span>}
  </button>
);
