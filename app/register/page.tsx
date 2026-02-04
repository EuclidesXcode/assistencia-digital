'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Mail, Lock, User as UserIcon, LayoutDashboard, AlertCircle } from 'lucide-react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { registerUser } from '@/lib/authService';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: '',
        branchCode: '0001', // Default to Head Office for now
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem.');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                name: formData.name,
                branchCode: formData.branchCode,
                email: formData.email,
                password: formData.password
            };
            console.log('--- REGISTER DEBUG ---');
            console.log('Enviando payload cadastro:', { ...payload, password: '***' });

            const result = await registerUser(payload);

            console.log('Resultado cadastro:', result);

            if (!result.ok) {
                throw new Error(result.error || 'Cadastro indisponivel no momento.');
            }

            setSuccess(true);
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Erro ao realizar cadastro.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserIcon size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Cadastro realizado!</h2>
                    <p className="text-slate-600 mb-6">
                        Sua conta foi criada com sucesso. Voce ja pode fazer login.
                    </p>
                    <Link href="/">
                        <Button className="w-full">Ir para Login</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden font-sans selection:bg-purple-500/30">
            {/* Background futurista animado */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            </div>

            <div className="relative z-10 w-full max-w-lg">
                {/* Branding minimalista */}
                <div className="text-center mb-8 group">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20 mb-4 group-hover:scale-110 transition-transform duration-500">
                        <LayoutDashboard className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Gromit Control</h1>
                    <p className="text-slate-400 font-medium">Crie sua conta administrativa</p>
                </div>

                {/* Card de Cadastro com Glassmorphism */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8 md:p-10">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            id="name"
                            name="name"
                            label="Nome Completo"
                            labelClassName="text-gray-300"
                            placeholder="Seu nome"
                            type="text"
                            icon={UserIcon}
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="bg-slate-950/40 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-950/60 focus:ring-blue-500/20 transition-all"
                        />

                        <Input
                            id="email"
                            name="email"
                            label="Email"
                            labelClassName="text-gray-300"
                            placeholder="seu@email.com"
                            type="email"
                            icon={Mail}
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="bg-slate-950/40 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-950/60 focus:ring-blue-500/20 transition-all"
                        />

                        <Input
                            id="branchCode"
                            name="branchCode"
                            label="Código da Filial (Opcional)"
                            labelClassName="text-gray-300"
                            placeholder="Ex: 0001"
                            type="text"
                            icon={Building2}
                            value={formData.branchCode}
                            onChange={handleChange}
                            className="bg-slate-950/40 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-950/60 focus:ring-blue-500/20 transition-all"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                required
                                className="bg-slate-950/40 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-950/60 focus:ring-blue-500/20 transition-all"
                            />

                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                label="Confirmar"
                                labelClassName="text-gray-300"
                                placeholder="••••••••"
                                type="password"
                                icon={Lock}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="bg-slate-950/40 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-950/60 focus:ring-blue-500/20 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 animate-shake">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-none shadow-lg shadow-blue-600/20 text-white font-semibold text-base transition-all active:scale-[0.98]"
                            isLoading={loading}
                        >
                            Criar Conta
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-slate-400 text-sm">
                            Já tem uma conta?{' '}
                            <Link href="/" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors inline-flex items-center gap-1 group">
                                Fazer Login
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer contextual */}
                <p className="text-center mt-8 text-slate-500 text-xs tracking-wider uppercase">
                    Plataforma Segura & Encriptada
                </p>
            </div>
        </div>
    );
}
