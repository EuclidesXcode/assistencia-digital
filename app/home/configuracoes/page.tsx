"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon, Mail, Building2, Camera, Lock, Bell, Save, ArrowLeft, Shield, Check, Key, Edit2, X } from "lucide-react";
import Link from "next/link";
import { User } from "@/types";
import { Button } from "@/components/Button";

export default function ConfiguracoesPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);

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

    const handleTriggerUpload = () => {
        if (isEditing && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (e.g., max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert("A imagem é muito grande. Escolha uma imagem menor que 2MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = () => {
        if (!user) return;

        try {
            const updatedUser = { ...user, ...formData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setIsEditing(false);
            alert('Perfil atualizado com sucesso!');
            // Force reload to update sidebar avatar immediately
            window.location.reload();
        } catch (error) {
            console.error("Erro ao salvar perfil:", error);
            alert("Erro ao salvar. A imagem pode ser muito grande para o armazenamento local.");
        }
    };

    const handleCancelEdit = () => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                branchId: user.branchId || "",
                role: user.role || "Usuário",
                photoUrl: user.photoUrl || ""
            });
        }
        setIsEditing(false);
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
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* --- Floating Header (Glassmorphism) --- */}
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 px-8 py-4 flex items-center justify-between shadow-sm transition-all duration-200">
                <div className="flex items-center gap-4">
                    <Link href="/home" className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">Configurações</h1>
                        <p className="text-slate-500 font-medium text-sm">Gerencie preferências e segurança da conta.</p>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto p-8 space-y-8">

                {/* --- Profile Card --- */}
                <section className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden relative">
                    {/* Cover Banner */}
                    <div className="h-48 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    </div>

                    <div className="px-8 pb-8">
                        <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 mb-8 gap-6">
                            {/* Avatar */}
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full bg-white p-1 shadow-2xl">
                                    <div
                                        onClick={handleTriggerUpload}
                                        className={`w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden relative ${!isEditing ? 'pointer-events-none' : 'cursor-pointer hover:opacity-90 transition-opacity'}`}
                                    >
                                        {formData.photoUrl ? (
                                            <img src={formData.photoUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-12 h-12 text-slate-300" />
                                        )}
                                        {isEditing && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="w-8 h-8 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        className="hidden"
                                    />
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={handleTriggerUpload}
                                        className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-10"
                                        title="Alterar foto"
                                    >
                                        <Camera size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="text-center md:text-left flex-1">
                                <h2 className="text-3xl font-black text-slate-900 mb-1">{formData.name || 'Usuário Sem Nome'}</h2>
                                <p className="text-slate-500 font-medium flex items-center justify-center md:justify-start gap-2">
                                    <Shield size={16} className="text-indigo-500" />
                                    {formData.role}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {!isEditing ? (
                                    <Button onClick={() => setIsEditing(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-full px-8 font-bold transition-all hover:scale-105 active:scale-95">
                                        <Edit2 size={18} className="mr-2" /> Liberar Edição
                                    </Button>
                                ) : (
                                    <>
                                        <Button onClick={handleCancelEdit} variant="outline" className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 px-6 font-bold">
                                            Cancelar
                                        </Button>
                                        <Button onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 rounded-full px-8 font-bold transition-all hover:scale-105 active:scale-95">
                                            <Check size={18} className="mr-2" /> Salvar
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome Completo</label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        disabled={!isEditing}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-slate-800 ${!isEditing && 'opacity-60 cursor-not-allowed bg-slate-100'}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Email Corporativo</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled={!isEditing}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-slate-800 ${!isEditing && 'opacity-60 cursor-not-allowed bg-slate-100'}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Filial / Unidade</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        value={formData.branchId}
                                        disabled={!isEditing}
                                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-slate-800 ${!isEditing && 'opacity-60 cursor-not-allowed bg-slate-100'}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Cargo / Função</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 opacity-50" />
                                    <input
                                        type="text"
                                        value={formData.role}
                                        disabled
                                        className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                                        title="Contate o administrador para alterar o cargo"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wide flex items-center gap-1">
                                    <Lock size={10} /> Campo gerenciado pelo administrador
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- Security Card --- */}
                <section className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden p-8 relative">
                    <div className={`transition-all duration-300 ${!isEditing ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                <Key size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Segurança</h3>
                                <p className="text-sm text-slate-500 font-medium">Atualize sua senha de acesso.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Senha Atual</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    disabled={!isEditing}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nova Senha</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    disabled={!isEditing}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Confirmar Senha</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    disabled={!isEditing}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Repita a nova senha"
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button onClick={handleChangePassword} variant="outline" disabled={!isEditing} className="rounded-full border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 font-bold px-6">
                                Atualizar Senha
                            </Button>
                        </div>
                    </div>
                    {!isEditing && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                            <div className="bg-slate-900/5 backdrop-blur-[1px] absolute inset-0 rounded-[2rem]"></div>
                            <div className="bg-white px-6 py-3 rounded-full shadow-xl border border-slate-100 flex items-center gap-2 text-slate-500 font-bold text-sm transform -translate-y-8 z-20">
                                <Lock size={16} /> Edição Bloqueada
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}