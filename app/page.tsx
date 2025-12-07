'use client';

import { useRouter } from 'next/navigation';
import { Login } from '@/components/Login';
import { User } from '@/types';

export default function Home() {
  const router = useRouter();

  const handleLogin = (user: User) => {
    // Salvar dados do usuário no localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    // Redirecionar para a página home
    router.push('/home');
  };

  return (
    <Login onLogin={handleLogin} />
  );
}

