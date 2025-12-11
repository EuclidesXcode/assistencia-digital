"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, LayoutDashboard } from "lucide-react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function EsqueciSenhaPage() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setError("Por favor, insira seu email.");
            return;
        }

        setIsLoading(true);
        setError("");

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setSubmitted(true);
        }, 1500);
    };

    if (submitted) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] p-4">
                {/* Background decoration */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-200/30 blur-3xl"></div>
                    <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-200/30 blur-3xl"></div>
                </div>

                <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-8 md:p-12 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Email Enviado!</h2>
                    <p className="text-slate-600 mb-6">
                        Enviamos instruções para recuperação de senha para <strong>{email}</strong>.
                        Verifique sua caixa de entrada e spam.
                    </p>

                    <div className="space-y-3">
                        <Link href="/" className="block">
                            <Button className="w-full">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar para Login
                            </Button>
                        </Link>

                        <button
                            onClick={() => {
                                setSubmitted(false);
                                setEmail("");
                            }}
                            className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                        >
                            Não recebeu o email? Reenviar
                        </button>
                    </div>
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
                            Recupere seu acesso
                        </h1>
                        <p className="text-slate-300 text-lg">
                            Não se preocupe! Acontece com todo mundo. Digite seu email e enviaremos instruções para redefinir sua senha.
                        </p>
                    </div>

                    <div className="relative z-10 mt-8 md:mt-0">
                        <p className="text-sm text-slate-400">© 2025 Lorem Ipsum</p>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12">
                    <div className="max-w-md mx-auto">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900">Esqueceu sua senha?</h2>
                            <p className="text-slate-500 mt-1">Digite seu email para receber instruções de recuperação.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <Input
                                id="email"
                                name="email"
                                label="Email"
                                placeholder="exemplo@email.com"
                                type="email"
                                icon={Mail}
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError("");
                                }}
                                autoFocus
                            />

                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    isLoading={isLoading}
                                >
                                    Enviar Instruções
                                </Button>
                            </div>

                            <div className="text-center mt-4">
                                <Link href="/" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors inline-flex items-center gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar para Login
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
