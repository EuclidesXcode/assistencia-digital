"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon, Mail, Building2, Camera, Lock, Bell, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { User } from "@/types";

export default function ConfiguracoesPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        branchId: "",
        role: "",
        photoUrl: ""
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/');
            return;
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setFormData({
            name: parsedUser.name || "",
            email: parsedUser.email || "",
            branchId: parsedUser.branchId || "",
            role: parsedUser.role || "Usuário",
            photoUrl: parsedUser.photoUrl || ""
        });
    }, [router]);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photoUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = () => {
        if (!user) return;
        const updatedUser = { ...user, ...formData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        alert('Perfil atualizado com sucesso!');
        // Recarregar a página para atualizar o sidebar
        window.location.reload();
    };

    const handleChangePassword = () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres!');
            return;
        }
        alert('Senha alterada com sucesso!');
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    };

    if (!user) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/home" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
                    <p className="text-slate-600 mt-1">Gerencie seu perfil e preferências</p>
                </div>
            </div>

            {/* Perfil */}
            <section className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-6">Informações do Perfil</h2>

                {/* Foto de Perfil */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6 pb-6 border-b border-slate-200">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                            {formData.photoUrl ? (
                                <img src={formData.photoUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-12 h-12 text-slate-400" />
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 transition-colors">
                            <Camera className="w-4 h-4 text-white" />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-800">{formData.name}</h3>
                        <p className="text-sm text-slate-600">{formData.role}</p>
                        <p className="text-xs text-slate-500 mt-1">Clique no ícone da câmera para alterar a foto</p>
                    </div>
                </div>

                {/* Formulário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <UserIcon className="w-4 h-4 inline mr-2" />
                            Nome Completo
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Mail className="w-4 h-4 inline mr-2" />
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Building2 className="w-4 h-4 inline mr-2" />
                            Matriz
                        </label>
                        <input
                            type="text"
                            value={formData.branchId}
                            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <UserIcon className="w-4 h-4 inline mr-2" />
                            Cargo
                        </label>
                        <input
                            type="text"
                            value={formData.role}
                            disabled
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                            title="Apenas administradores podem alterar cargos"
                        />
                        <p className="text-xs text-slate-600 mt-1">Apenas administradores podem alterar cargos</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSaveProfile}
                        className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Perfil
                    </button>
                </div>
            </section>

            {/* Alterar Senha */}
            <section className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-6">Alterar Senha</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Lock className="w-4 h-4 inline mr-2" />
                            Senha Atual
                        </label>
                        <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Lock className="w-4 h-4 inline mr-2" />
                            Nova Senha
                        </label>
                        <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Lock className="w-4 h-4 inline mr-2" />
                            Confirmar Senha
                        </label>
                        <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleChangePassword}
                        className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-900 transition-colors"
                    >
                        <Lock className="w-4 h-4" />
                        Alterar Senha
                    </button>
                </div>
            </section>
        </div>
    );
}