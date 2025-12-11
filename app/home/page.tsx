'use client';

import { useEffect, useState } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { User } from '@/types';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  if (!user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 min-h-[400px] flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
        <LayoutDashboard size={32} className="text-slate-400" />
      </div>
      <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
      <p className="text-slate-500 mt-2">Bem-vindo ao dashboard {user.branchId}</p>
    </div>
  );
}
