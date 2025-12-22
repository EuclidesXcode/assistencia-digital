"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, Edit2, Power, Activity, Search, X, AlertCircle } from "lucide-react";

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

    const [newUser, setNewUser] = useState({
        nome: "",
        email: "",
        filial: "",
        cargo: "",
        permissoes: [] as string[],
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
            setNewUser({ nome: "", email: "", filial: "", cargo: "", permissoes: [] });
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    const handleEditUser = async () => {
        if (!selectedUser) return;
        try {
            const { UserManagementService } = await import('@/backend/services/userManagementService');
            await UserManagementService.updatePermissoes(selectedUser.id, { permissoes: selectedUser.permissoes });
            setUsuarios(prev => prev.map(u =>
                u.id === selectedUser.id ? selectedUser : u
            ));
            setShowEditModal(false);
            setSelectedUser(null);
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };

    const togglePermission = (permissao: string) => {
        if (selectedUser) {
            setSelectedUser({
                ...selectedUser,
                permissoes: selectedUser.permissoes.includes(permissao)
                    ? selectedUser.permissoes.filter(p => p !== permissao)
                    : [...selectedUser.permissoes, permissao]
            });
        }
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg border border-slate-200 max-w-md text-center">
                    <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-slate-800 mb-2">Acesso Negado</h2>
                    <p className="text-slate-600 mb-4">
                        Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar usuários.
                    </p>
                    <p className="text-sm text-slate-600">
                        Redirecionando para o dashboard...
                    </p>
                </div>
            </div>
        );
    }

    // Show loading while checking permissions
    if (hasAccess === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-slate-600">Verificando permissões...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 min-w-0">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
                        <Users className="w-7 h-7 text-primary-600" />
                        Gestão de Usuários
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">Gerencie usuários, permissões e acompanhe atividades</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary-700 transition-colors w-full md:w-auto justify-center"
                >
                    <UserPlus className="w-5 h-5" />
                    Novo Usuário
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">TOTAL DE USUÁRIOS</div>
                    <div className="text-2xl font-bold text-slate-800">{usuarios.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">USUÁRIOS ATIVOS</div>
                    <div className="text-2xl font-bold text-green-600">{usuarios.filter(u => u.ativo).length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">USUÁRIOS INATIVOS</div>
                    <div className="text-2xl font-bold text-red-600">{usuarios.filter(u => !u.ativo).length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">ATIVIDADES HOJE</div>
                    <div className="text-2xl font-bold text-blue-600">{stats.atividadesHoje}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-600" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md text-sm placeholder:text-slate-600"
                        />
                    </div>
                    <select
                        value={filialFilter}
                        onChange={(e) => setFilialFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-700"
                    >
                        <option value="TODAS">Todas as Filiais</option>
                        <option value="Matriz">Matriz</option>
                        <option value="Filial 01">Filial 01</option>
                        <option value="Filial 02">Filial 02</option>
                        <option value="Filial 03">Filial 03</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-700"
                    >
                        <option value="TODOS">Todos os Status</option>
                        <option value="ATIVOS">Ativos</option>
                        <option value="INATIVOS">Inativos</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-slate-600 bg-slate-50 border-b border-slate-200">
                                <th className="p-3 text-left">USUÁRIO</th>
                                <th className="p-3 text-left hidden md:table-cell">FILIAL</th>
                                <th className="p-3 text-left hidden lg:table-cell">CARGO</th>
                                <th className="p-3 text-left hidden lg:table-cell">ÚLTIMO ACESSO</th>
                                <th className="p-3 text-left">STATUS</th>
                                <th className="p-3 text-left">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-600">Nenhum usuário encontrado.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((usuario, idx) => (
                                    <tr key={usuario.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-primary-50 transition-colors border-b border-slate-100`}>
                                        <td className="p-3">
                                            <div>
                                                <div className="font-medium text-slate-700">{usuario.nome}</div>
                                                <div className="text-xs text-slate-600">{usuario.email}</div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-slate-700 hidden md:table-cell">{usuario.filial}</td>
                                        <td className="p-3 text-slate-700 hidden lg:table-cell">{usuario.cargo}</td>
                                        <td className="p-3 text-slate-700 hidden lg:table-cell">{usuario.ultimoAcesso}</td>
                                        <td className="p-3">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${usuario.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {usuario.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(usuario);
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-2 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"
                                                    title="Editar permissões"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleUserStatus(usuario.id)}
                                                    className={`p-2 hover:bg-slate-100 rounded-md transition-colors ${usuario.ativo ? 'text-red-600' : 'text-green-600'}`}
                                                    title={usuario.ativo ? 'Desativar' : 'Ativar'}
                                                >
                                                    <Power className="w-4 h-4" />
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
                                                    className="p-2 hover:bg-purple-100 rounded-md text-purple-600 transition-colors"
                                                    title="Ver atividades"
                                                >
                                                    <Activity className="w-4 h-4" />
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

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-800">Criar Novo Usuário</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-md">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    value={newUser.nome}
                                    onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-700"
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-700"
                                    placeholder="joao@empresa.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Filial</label>
                                    <select
                                        value={newUser.filial}
                                        onChange={(e) => setNewUser({ ...newUser, filial: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-700"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Matriz">Matriz</option>
                                        <option value="Filial 01">Filial 01</option>
                                        <option value="Filial 02">Filial 02</option>
                                        <option value="Filial 03">Filial 03</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Cargo</label>
                                    <select
                                        value={newUser.cargo}
                                        onChange={(e) => setNewUser({ ...newUser, cargo: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-700"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Administrador">Administrador</option>
                                        <option value="Supervisor">Supervisor</option>
                                        <option value="Atendente">Atendente</option>
                                        <option value="Técnico">Técnico</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Permissões</label>
                                <div className="space-y-2">
                                    {permissoesDisponiveis.map(perm => (
                                        <label key={perm.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-md cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newUser.permissoes.includes(perm.id)}
                                                onChange={() => toggleNewUserPermission(perm.id)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm text-slate-700">{perm.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateUser}
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                            >
                                Criar Usuário
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-800">Editar Permissões - {selectedUser.nome}</h2>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-md">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <div className="text-sm text-slate-600 mb-1">Email: {selectedUser.email}</div>
                                <div className="text-sm text-slate-600 mb-1">Filial: {selectedUser.filial}</div>
                                <div className="text-sm text-slate-600">Cargo: {selectedUser.cargo}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">Permissões</label>
                                <div className="space-y-2">
                                    {permissoesDisponiveis.map(perm => (
                                        <label key={perm.id} className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-md cursor-pointer border border-slate-200">
                                            <input
                                                type="checkbox"
                                                checked={selectedUser.permissoes.includes(perm.id)}
                                                onChange={() => togglePermission(perm.id)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm text-slate-700 font-medium">{perm.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEditUser}
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Report Modal */}
            {showActivityReport && selectedUserActivity && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                                <Activity className="w-6 h-6 text-primary-600" />
                                Relatório de Atividades - {usuarios.find(u => u.id === selectedUserActivity)?.nome}
                            </h2>
                            <button onClick={() => setShowActivityReport(false)} className="p-2 hover:bg-slate-100 rounded-md">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            {userActivities.length === 0 ? (
                                <div className="text-center py-8 text-slate-600">Nenhuma atividade registrada para este usuário.</div>
                            ) : (
                                <div className="space-y-3">
                                    {userActivities.map(atividade => (
                                        <div key={atividade.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="font-medium text-slate-700 mb-1">{atividade.acao}</div>
                                                    <div className="text-sm text-slate-600 mb-1">Módulo: {atividade.modulo}</div>
                                                    <div className="text-xs text-slate-600">{atividade.detalhes}</div>
                                                </div>
                                                <div className="text-xs text-slate-600 whitespace-nowrap">{atividade.data}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setShowActivityReport(false)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
