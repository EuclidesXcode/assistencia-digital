'use client';

import React, { useState } from 'react';
import { Building2, Mail, Lock, ArrowRight, LayoutDashboard } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { LoginStatus, User } from '@/types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    branchId: '',
    email: '',
    password: ''
  });
  const [status, setStatus] = useState<LoginStatus>(LoginStatus.IDLE);
  const [error, setError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(LoginStatus.LOADING);

    // Simulate API call
    setTimeout(() => {
      if (!formData.branchId || !formData.email || !formData.password) {
        setError('Por favor, preencha todos os campos.');
        setStatus(LoginStatus.ERROR);
        return;
      }

      // Mock successful login
      const mockUser: User = {
        name: 'Administrador',
        email: formData.email,
        branchId: formData.branchId
      };
      
      setStatus(LoginStatus.SUCCESS);
      onLogin(mockUser);
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-200/30 blur-3xl"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-200/30 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
        
        {/* Left Side - Hero/Branding */}
        <div className="w-full md:w-1/2 bg-slate-900 p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-slate-900 opacity-90"></div>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-primary-200 mb-2">
              <LayoutDashboard size={24} />
              <span className="font-semibold tracking-wide">LOREM IPSUM</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Lorem ipsum dolor sit amet consectetur.
            </h1>
            <p className="text-slate-300 text-lg">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          <div className="relative z-10 mt-8 md:mt-0">
            <p className="text-sm text-slate-400">© 2025 Lorem Ipsum</p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12">
          <div className="max-w-md mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h2>
              <p className="text-slate-500 mt-1">Insira suas credenciais para acessar o painel.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="branchId"
                name="branchId"
                label="Matriz"
                placeholder="Digite a matriz"
                type="text"
                icon={Building2}
                value={formData.branchId}
                onChange={handleChange}
                autoFocus
              />

              <Input
                id="email"
                name="email"
                label="Email"
                placeholder="exemplo@email.com"
                type="email"
                icon={Mail}
                value={formData.email}
                onChange={handleChange}
              />

              <Input
                id="password"
                name="password"
                label="Senha"
                placeholder="••••••••"
                type="password"
                icon={Lock}
                value={formData.password}
                onChange={handleChange}
              />

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full group" 
                  isLoading={status === LoginStatus.LOADING}
                >
                  Login
                  {status !== LoginStatus.LOADING && (
                     <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  )}
                </Button>
              </div>

              <div className="text-center mt-4">
                <a href="#" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  Esqueceu sua senha?
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
