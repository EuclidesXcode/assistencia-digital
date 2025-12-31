"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, Edit2, Power, Activity, Search, X, AlertCircle, Shield, CheckCircle2, User, Key, BarChart3, Filter, Check, Mail, Building2 } from "lucide-react";
import { Button } from "@/components/Button";

interface Usuario {
    id: string;
    nome: string;
    email: string;
    filial: string;
    cargo: string;
    permissoes: string[];
    ativo: boolean;
    ultimoAcesso: string;
    dataCriacao: string;
}

interface AtividadeUsuario {
    id: string;
    usuarioId: string;
    acao: string;
    modulo: string;
    data: string;
    detalhes: string;
}

export default function UsuariosPage() {
    const router = useRouter();
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);

    // Check user permissions
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/');
            return;
        }

        const user = JSON.parse(userData);
        // Only allow access if user is Administrator
        if (user.role !== 'Administrador') {
            setHasAccess(false);
            // Redirect after showing message
            setTimeout(() => {
                router.push('/home');
            }, 3000);
        } else {
            setHasAccess(true);
        }
    }, [router]);

    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [atividades, setAtividades] = useState<Record<string, AtividadeUsuario[]>>({});
    const [stats, setStats] = useState({ total: 0, ativos: 0, inativos: 0, atividadesHoje: 0 });
    const [loading, setLoading] = useState(true);

    // Load users on mount
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const { UserManagementService } = await import('@/backend/services/userManagementService');
                const [users, statistics] = await Promise.all([
                    UserManagementService.getUsuarios(),
                    UserManagementService.getStats()
                ]);
                setUsuarios(users);
                setStats(statistics);
            } catch (error) {
                console.error('Error loading users:', error);
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, []);

    const [searchQuery, setSearchQuery] = useState("");
    const [filialFilter, setFilialFilter] = useState("TODAS");
    const [statusFilter, setStatusFilter] = useState("TODOS");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
    const [showActivityReport, setShowActivityReport] = useState(false);
    const [selectedUserActivity, setSelectedUserActivity] = useState<string | null>(null);

    // State for creating new user
    const [newUser, setNewUser] = useState({
        nome: "",
        email: "",
        filial: "",
        cargo: "",
        permissoes: [] as string[],
        password: "",
    });

    // State for editing existing user
    const [editUserData, setEditUserData] = useState({
        nome: "",
        email: "",
        filial: "",
        cargo: "",
        permissoes: [] as string[],
        password: "", // Optional new password
    });

    const permissoesDisponiveis = [
        { id: "admin", label: "Administrador" },
        { id: "cadastro", label: "Cadastro de Produtos" },
        { id: "orcamentos", label: "Orçamentos" },
        { id: "nfe", label: "NF-e (XML)" },
        { id: "recebimento", label: "Recebimento" },
        { id: "pre-analise", label: "Pré-análise" },
    ];

    const filteredUsers = useMemo(() => {
        return usuarios.filter(u => {
            const matchSearch = u.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchFilial = filialFilter === "TODAS" || u.filial === filialFilter;
            const matchStatus = statusFilter === "TODOS" ||
                (statusFilter === "ATIVOS" && u.ativo) ||
                (statusFilter === "INATIVOS" && !u.ativo);
            return matchSearch && matchFilial && matchStatus;
        });
    }, [usuarios, searchQuery, filialFilter, statusFilter]);

    const userActivities = useMemo(() => {
        if (!selectedUserActivity) return [];
        return atividades[selectedUserActivity] || [];
    }, [atividades, selectedUserActivity]);

    const [isEditing, setIsEditing] = useState(false);

    // Populate edit form when a user is selected
    useEffect(() => {
        if (selectedUser) {
            setEditUserData({
                nome: selectedUser.nome,
                email: selectedUser.email,
                filial: selectedUser.filial,
                cargo: selectedUser.cargo,
                permissoes: selectedUser.permissoes,
                password: "", // Reset password field
            });
            setIsEditing(false); // Reset edit mode
        }
    }, [selectedUser]);



    const toggleUserStatus = async (id: string) => {
        const usuario = usuarios.find(u => u.id === id);
        if (!usuario) return;

        try {
            const { UserManagementService } = await import('@/backend/services/userManagementService');
            await UserManagementService.updateStatus(id, { ativo: !usuario.ativo });
            setUsuarios(prev => prev.map(u =>
                u.id === id ? { ...u, ativo: !u.ativo } : u
            ));
        } catch (error) {
            console.error('Error toggling user status:', error);
        }
    };

    const handleCreateUser = async () => {
        try {
            const { UserManagementService } = await import('@/backend/services/userManagementService');
            const newUsuario = await UserManagementService.createUsuario(newUser);
            setUsuarios(prev => [...prev, newUsuario]);
            setShowCreateModal(false);
            setNewUser({ nome: "", email: "", filial: "", cargo: "", permissoes: [], password: "" });
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    const handleEditUser = async () => {
        if (!selectedUser) return;
        try {
            const { UserManagementService } = await import('@/backend/services/userManagementService');

            // Call the full update method
            await UserManagementService.updateUsuario(selectedUser.id, editUserData);

            setUsuarios(prev => prev.map(u =>
                u.id === selectedUser.id ? {
                    ...u,
                    nome: editUserData.nome,
                    // email: editUserData.email, // Assume email cannot be changed easily or update UI if backend handles it
                    filial: editUserData.filial,
                    cargo: editUserData.cargo,
                    permissoes: editUserData.permissoes
                } : u
            ));

            setShowEditModal(false);
            setSelectedUser(null);
            alert("Usuário atualizado com sucesso!");
        } catch (error) {
            console.error('Error updating user:', error);
            alert("Erro ao atualizar usuário. Verifique o console.");
        }
    };

    // Helper for editing permissions in the edit modal
    const toggleEditPermission = (permissao: string) => {
        setEditUserData({
            ...editUserData,
            permissoes: editUserData.permissoes.includes(permissao)
                ? editUserData.permissoes.filter(p => p !== permissao)
                : [...editUserData.permissoes, permissao]
        });
    };

    const toggleNewUserPermission = (permissao: string) => {
        setNewUser({
            ...newUser,
            permissoes: newUser.permissoes.includes(permissao)
                ? newUser.permissoes.filter(p => p !== permissao)
                : [...newUser.permissoes, permissao]
        });
    };

    // Show access denied message if user doesn't have permission
    if (hasAccess === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Acesso Restrito</h2>
                    <p className="text-slate-600 mb-6">
                        Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar usuários.
                    </p>
                    <div className="text-sm font-bold text-slate-500 bg-slate-100 py-2 px-4 rounded-full inline-block">
                        Redirecionando...
                    </div>
                </div>
            </div>
        );
    }

    if (loading || hasAccess === null) {
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
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Gestão de Acessos</h1>
                    <p className="text-slate-500 font-medium text-sm">Controle de usuários, permissões e segurança.</p>
                </div>
                <div className="flex gap-3">
                    <div className="hidden md:flex items-center bg-slate-100 px-3 py-2 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <Search size={16} className="text-slate-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Buscar usuário..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm text-slate-700 w-48 placeholder:text-slate-400"
                        />
                    </div>
                    <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-full px-6 font-semibold transition-all hover:scale-105 active:scale-95">
                        <UserPlus size={18} className="mr-2" /> Novo Usuário
                    </Button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-8 space-y-8">
                {/* --- Stats Cards (Bento Style) --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <Users size={20} />
                            </div>
                        </div>
                        <div className="text-xs font-bold uppercase text-slate-400 mb-1">Total Usuários</div>
                        <div className="text-3xl font-black text-slate-800">{usuarios.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100">
                                <CheckCircle2 size={20} />
                            </div>
                        </div>
                        <div className="text-xs font-bold uppercase text-emerald-600 mb-1">Ativos</div>
                        <div className="text-3xl font-black text-slate-800">{usuarios.filter(u => u.ativo).length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 border border-red-100">
                                <Power size={20} />
                            </div>
                        </div>
                        <div className="text-xs font-bold uppercase text-red-600 mb-1">Inativos</div>
                        <div className="text-3xl font-black text-slate-800">{usuarios.filter(u => !u.ativo).length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
                                <Activity size={20} />
                            </div>
                        </div>
                        <div className="text-xs font-bold uppercase text-blue-600 mb-1">Acessos Hoje</div>
                        <div className="text-3xl font-black text-slate-800">{stats.atividadesHoje}</div>
                    </div>
                </div>

                {/* --- Filters & Actions --- */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 flex items-center gap-2 w-full">
                        <Filter size={18} className="text-slate-400" />
                        <select
                            value={filialFilter}
                            onChange={(e) => setFilialFilter(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 border-none focus:ring-0 cursor-pointer"
                        >
                            <option value="TODAS">Todas as Filiais</option>
                            <option value="Matriz">Matriz</option>
                            <option value="Filial 01">Filial 01</option>
                            <option value="Filial 02">Filial 02</option>
                            <option value="Filial 03">Filial 03</option>
                        </select>
                        <div className="h-4 w-px bg-slate-300 mx-2" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 border-none focus:ring-0 cursor-pointer"
                        >
                            <option value="TODOS">Todos os Status</option>
                            <option value="ATIVOS">Ativos</option>
                            <option value="INATIVOS">Inativos</option>
                        </select>
                    </div>
                </div>

                {/* --- Users Table --- */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="p-4">Colaborador</th>
                                    <th className="p-4 hidden md:table-cell">Filial</th>
                                    <th className="p-4 hidden lg:table-cell">Cargo</th>
                                    <th className="p-4 hidden lg:table-cell">Último Acesso</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-400 italic">
                                            Nenhum usuário encontrado com os filtros atuais.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((usuario) => (
                                        <tr key={usuario.id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-200">
                                                        {usuario.nome.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{usuario.nome}</div>
                                                        <div className="text-xs text-slate-500">{usuario.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600 hidden md:table-cell font-medium">{usuario.filial}</td>
                                            <td className="p-4 text-slate-600 hidden lg:table-cell">
                                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                                                    {usuario.cargo}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-500 hidden lg:table-cell font-mono text-xs">{usuario.ultimoAcesso}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${usuario.ativo
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-red-50 text-red-600 border-red-100'
                                                    }`}>
                                                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(usuario);
                                                            setShowEditModal(true);
                                                        }}
                                                        className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-full text-slate-400 hover:text-indigo-600 shadow-sm transition-all"
                                                        title="Editar usuário completo"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const { UserManagementService } = await import('@/backend/services/userManagementService');
                                                                const userAtvs = await UserManagementService.getAtividades(usuario.id);
                                                                setAtividades(prev => ({ ...prev, [usuario.id]: userAtvs }));
                                                                setSelectedUserActivity(usuario.id);
                                                                setShowActivityReport(true);
                                                            } catch (error) {
                                                                console.error('Error loading activities:', error);
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-full text-slate-400 hover:text-blue-600 shadow-sm transition-all"
                                                        title="Histórico"
                                                    >
                                                        <Activity size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleUserStatus(usuario.id)}
                                                        className={`p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-full shadow-sm transition-all ${usuario.ativo ? 'text-slate-400 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-700'
                                                            }`}
                                                        title={usuario.ativo ? 'Desativar' : 'Ativar'}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- Modals (Modernized) --- */}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                    <UserPlus size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Novo Colaborador</h2>
                                    <p className="text-xs text-slate-500 font-medium">Preencha os dados do novo usuário.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            value={newUser.nome}
                                            onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                            placeholder="Ex: Ana Souza"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Email Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-800"
                                            placeholder="ana.souza@empresa.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Filial</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <select
                                            value={newUser.filial}
                                            onChange={(e) => setNewUser({ ...newUser, filial: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-800 appearance-none"
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="Matriz">Matriz</option>
                                            <option value="Filial 01">Filial 01</option>
                                            <option value="Filial 02">Filial 02</option>
                                            <option value="Filial 03">Filial 03</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Cargo</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <select
                                            value={newUser.cargo}
                                            onChange={(e) => setNewUser({ ...newUser, cargo: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-800 appearance-none"
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="Administrador">Administrador</option>
                                            <option value="Supervisor">Supervisor</option>
                                            <option value="Atendente">Atendente</option>
                                            <option value="Técnico">Técnico</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Senha Inicial</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            value={newUser.password || ''}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                            placeholder="Padrão: Mudar123!"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                                    <Shield size={14} /> Permissões de Acesso
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {permissoesDisponiveis.map(perm => (
                                        <label key={perm.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${newUser.permissoes.includes(perm.id)
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-indigo-200'
                                            }`}>
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${newUser.permissoes.includes(perm.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
                                                }`}>
                                                {newUser.permissoes.includes(perm.id) && <Check size={12} className="text-white" />}
                                                <input
                                                    type="checkbox"
                                                    checked={newUser.permissoes.includes(perm.id)}
                                                    onChange={() => toggleNewUserPermission(perm.id)}
                                                    className="hidden"
                                                />
                                            </div>
                                            <span className={`text-sm font-medium ${newUser.permissoes.includes(perm.id) ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                {perm.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white hover:shadow-sm transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateUser}
                                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all text-sm"
                            >
                                Criar Conta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal (Expanded) */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                    <Edit2 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Editar Usuário</h2>
                                    <p className="text-xs text-slate-500 font-medium">{selectedUser.nome}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">

                            {/* --- General Info --- */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            value={editUserData.nome}
                                            disabled={!isEditing}
                                            onChange={(e) => setEditUserData({ ...editUserData, nome: e.target.value })}
                                            className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-slate-800 ${!isEditing && 'opacity-60 cursor-not-allowed bg-slate-100'}`}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Email Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 opacity-50" />
                                        <input
                                            type="email"
                                            value={editUserData.email}
                                            disabled
                                            className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                                            title="Email não pode ser alterado diretamente"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Filial</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <select
                                            value={editUserData.filial}
                                            disabled={!isEditing}
                                            onChange={(e) => setEditUserData({ ...editUserData, filial: e.target.value })}
                                            className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-800 appearance-none ${!isEditing && 'opacity-60 cursor-not-allowed bg-slate-100'}`}
                                        >
                                            <option value="Matriz">Matriz</option>
                                            <option value="Filial 01">Filial 01</option>
                                            <option value="Filial 02">Filial 02</option>
                                            <option value="Filial 03">Filial 03</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Cargo</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <select
                                            value={editUserData.cargo}
                                            disabled={!isEditing}
                                            onChange={(e) => setEditUserData({ ...editUserData, cargo: e.target.value })}
                                            className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-800 appearance-none ${!isEditing && 'opacity-60 cursor-not-allowed bg-slate-100'}`}
                                        >
                                            <option value="Administrador">Administrador</option>
                                            <option value="Supervisor">Supervisor</option>
                                            <option value="Atendente">Atendente</option>
                                            <option value="Técnico">Técnico</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Redefinir Senha (Opcional)</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            value={editUserData.password || ''}
                                            disabled={!isEditing}
                                            onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                                            className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400 ${!isEditing && 'opacity-60 cursor-not-allowed bg-slate-100'}`}
                                            placeholder={!isEditing ? "Bloqueado para edição" : "Deixe em branco para manter a atual"}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* --- Permissions --- */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-4 block">Permissões</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {permissoesDisponiveis.map(perm => (
                                        <label key={perm.id} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border transition-all ${editUserData.permissoes.includes(perm.id)
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                            : isEditing
                                                ? 'bg-white border-slate-200 hover:border-indigo-200'
                                                : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-70'
                                            }`}>
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${editUserData.permissoes.includes(perm.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
                                                }`}>
                                                {editUserData.permissoes.includes(perm.id) && <Check size={12} className="text-white" />}
                                                <input
                                                    type="checkbox"
                                                    checked={editUserData.permissoes.includes(perm.id)}
                                                    disabled={!isEditing}
                                                    onChange={() => isEditing && toggleEditPermission(perm.id)}
                                                    className="hidden"
                                                />
                                            </div>
                                            <span className={`text-sm font-bold ${editUserData.permissoes.includes(perm.id) ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                {perm.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            {!isEditing ? (
                                <>
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white hover:shadow-sm transition-all text-sm"
                                    >
                                        Fechar
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all text-sm flex items-center gap-2"
                                    >
                                        <Edit2 size={16} /> Liberar Edição
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            // Reset to original values
                                            if (selectedUser) {
                                                setEditUserData({
                                                    nome: selectedUser.nome,
                                                    email: selectedUser.email,
                                                    filial: selectedUser.filial,
                                                    cargo: selectedUser.cargo,
                                                    permissoes: selectedUser.permissoes,
                                                    password: ""
                                                });
                                            }
                                        }}
                                        className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white hover:shadow-sm transition-all text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleEditUser}
                                        className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all text-sm flex items-center gap-2"
                                    >
                                        <Check size={16} /> Salvar Alterações
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Report Modal */}
            {showActivityReport && selectedUserActivity && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] max-w-4xl w-full max-h-[85vh] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Relatório de Atividade</h2>
                                    <p className="text-xs text-slate-500 font-medium">Histórico de ações de {usuarios.find(u => u.id === selectedUserActivity)?.nome}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowActivityReport(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-0 overflow-y-auto flex-1 bg-slate-50/30">
                            {userActivities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                    <Activity size={48} className="mb-4 opacity-20" />
                                    <p className="font-medium">Nenhuma atividade registrada.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {userActivities.map(atividade => (
                                        <div key={atividade.id} className="p-6 hover:bg-white transition-colors flex gap-4">
                                            <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 flex-shrink-0" />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-slate-800 text-sm">{atividade.acao}</span>
                                                    <span className="text-xs text-slate-400 font-mono">{atividade.data}</span>
                                                </div>
                                                <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-2">
                                                    {atividade.modulo}
                                                </div>
                                                <p className="text-sm text-slate-600 leading-relaxed">{atividade.detalhes}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setShowActivityReport(false)}
                                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white hover:shadow-sm transition-all text-sm"
                            >
                                Fechar Relatório
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
