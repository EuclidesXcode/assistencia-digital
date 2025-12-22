'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, ArrowRight, User as UserIcon, LayoutDashboard, AlertCircle } from 'lucide-react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
    const router = useRouter();
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
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        branch_code: formData.branchCode,
                    }
                }
            });

            if (signUpError) {
                throw signUpError;
            }

            if (data.user) {
                setSuccess(true);
                // Optional: Auto login or wait for email confirmation?
                // Usually, Supabase defaults to "Confirm Email".
            }

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
                        Sua conta foi criada com sucesso. Verifique seu email para confirmar o cadastro antes de fazer login.
                    </p>
                    <Link href="/">
                        <Button className="w-full">Ir para Login</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] p-4">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-200/30 blur-3xl"></div>
                <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-200/30 blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100">

                {/* Left Side - Hero */}
                <div className="w-full md:w-1/2 bg-slate-900 p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-slate-900 opacity-90"></div>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-primary-200 mb-6">
                            <LayoutDashboard size={24} />
                            <span className="font-semibold tracking-wide">Gromit Control</span>
                        </div>
                        <h1 className="text-3xl font-bold leading-tight mb-4">
                            Junte-se a nós
                        </h1>
                        <p className="text-slate-300">
                            Crie sua conta para acessar o sistema de gestão e controle de assistência técnica inteligente.
                        </p>
                    </div>

                    <div className="relative z-10 mt-8">
                        <p className="text-sm text-slate-400">Já tem uma conta? <Link href="/" className="text-white font-medium hover:underline">Fazer Login</Link></p>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12">
                    <div className="max-w-md mx-auto">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Criar Conta</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                id="name"
                                name="name"
                                label="Nome Completo"
                                placeholder="Seu nome"
                                type="text"
                                icon={UserIcon}
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />

                            <Input
                                id="branchCode"
                                name="branchCode"
                                label="Código da Filial"
                                placeholder="Ex: 0001"
                                type="text"
                                icon={Building2}
                                value={formData.branchCode}
                                onChange={handleChange}
                                required
                            />

                            <Input
                                id="email"
                                name="email"
                                label="Email"
                                placeholder="seu@email.com"
                                type="email"
                                icon={Mail}
                                value={formData.email}
                                onChange={handleChange}
                                required
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
                                required
                            />

                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                label="Confirmar Senha"
                                placeholder="••••••••"
                                type="password"
                                icon={Lock}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />

                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full mt-2"
                                isLoading={loading}
                            >
                                Cadastrar
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
