'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, LayoutDashboard, Sparkles } from 'lucide-react';
import { Input } from './Input';
import { createAuditLog } from '@/lib/audit';
import { Button } from './Button';
import { LoginStatus, User } from '@/types';
import { login } from '@/lib/authService';

interface LoginProps {
  onLogin: (user: User) => void;
}

type FieldName = 'email' | 'password';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [status, setStatus] = useState<LoginStatus>(LoginStatus.IDLE);
  const [error, setError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});

  useEffect(() => {
    const target = document.getElementById('email');
    if (target instanceof HTMLInputElement) {
      target.focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as FieldName;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt started for:', formData.email);
    setStatus(LoginStatus.LOADING);

    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!formData.email) {
      nextErrors.email = 'Informe seu usuário ou email.';
    }
    if (!formData.password) {
      nextErrors.password = 'Informe sua senha.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError('');
      setStatus(LoginStatus.ERROR);
      return;
    }

    setFieldErrors({});

    try {
      const payload = {
        email: formData.email,
        password: formData.password
      };
      console.log('--- LOGIN DEBUG ---');
      console.log('Enviando payload:', { ...payload, password: '***' });

      const result = await login(payload);

      console.log('Resultado do servidor:', result);

      if (!result.ok || !result.user) {
        setError(result.error || 'Credenciais inválidas ou serviço indisponível.');
        setStatus(LoginStatus.ERROR);
        return;
      }

      const user: User = result.user;

      await createAuditLog({
        userId: user.id || '',
        action: 'LOGIN',
        resource: 'auth',
        details: { method: 'email_password' }
      });

      setStatus(LoginStatus.SUCCESS);
      onLogin(user);
    } catch (err) {
      console.error('Unexpected login error:', err);
      setError('Erro inesperado. Tente novamente.');
      setStatus(LoginStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative w-full max-w-5xl flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-sm">

        {/* Left Side - Visual/Branding */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-indigo-700 via-blue-800 to-slate-900 p-8 md:p-12 flex flex-col justify-between text-white relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 text-blue-200 mb-8">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                <LayoutDashboard size={28} className="text-white" />
              </div>
              <span className="font-bold text-xl tracking-wider uppercase">Gromit Control</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                Gestão Inteligente para sua <span className="text-blue-400">Assistência.</span>
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed">
                Transforme sua operação com controle total. Uma ferramenta sistemática que orienta decisões e otimiza resultados.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-12 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-blue-300">
              <Sparkles size={16} />
              <span className="text-xs font-semibold uppercase tracking-widest">Inovação</span>
            </div>
            <p className="text-sm text-slate-300 italic">
              "A eficiência é o que acontece quando o sistema trabalha para você, não o contrário."
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-7/12 bg-slate-900/40 backdrop-blur-xl p-8 md:p-16 flex flex-col justify-center border-l border-white/5">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-white mb-2">Login</h2>
              <p className="text-slate-400">Acesse sua conta para continuar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="group transition-all">
                  <Input
                    id="email"
                    name="email"
                    label="E-mail ou Usuário"
                    labelClassName="text-gray-300"
                    placeholder="nome@empresa.com"
                    type="text"
                    icon={Mail}
                    value={formData.email}
                    onChange={handleChange}
                    error={fieldErrors.email}
                    className="bg-slate-950/40 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-950/60 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div className="group transition-all">
                  <Input
                    id="password"
                    name="password"
                    label="Senha"
                    labelClassName="text-gray-300"
                    placeholder="••••••••"
                    type="password"
                    icon={Lock}
                    value={formData.password}
                    onChange={handleChange}
                    error={fieldErrors.password}
                    className="bg-slate-950/40 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-950/60 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 animate-shake">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  {error}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 text-white font-bold text-lg rounded-xl transition-all active:scale-[0.98] group"
                  isLoading={status === LoginStatus.LOADING}
                >
                  Entrar no Sistema
                  {status !== LoginStatus.LOADING && (
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  )}
                </Button>
              </div>

              <div className="flex flex-col gap-4 items-center mt-8">
                <Link href="/esqueci-senha" title="Recuperar senha" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
                  Esqueceu sua senha?
                </Link>

                <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>

                <p className="text-sm text-slate-500">
                  Não possui acesso? <Link href="/register" title="Criar conta" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Solicite aqui</Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-600 text-xs tracking-widest uppercase flex items-center gap-4">
        <span>© 2025 Gromit Control</span>
        <div className="w-1 h-1 rounded-full bg-slate-800"></div>
        <span>Security Verified</span>
      </div>
    </div>
  );
};
