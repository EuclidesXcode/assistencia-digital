// Mock User Management Data

import { Usuario, AtividadeUsuario } from '../models/UserManagement';

export const mockUsuarios: Usuario[] = [
    {
        id: "1",
        nome: "Eduardo Silva",
        email: "eduardo@empresa.com",
        filial: "Matriz",
        cargo: "Administrador",
        permissoes: ["admin", "cadastro", "orcamentos", "nfe", "recebimento", "pre-analise"],
        ativo: true,
        ultimoAcesso: "14/12/2025 13:45",
        dataCriacao: "01/01/2024"
    },
    {
        id: "2",
        nome: "Fernanda Costa",
        email: "fernanda@empresa.com",
        filial: "Filial 01",
        cargo: "Atendente",
        permissoes: ["cadastro", "orcamentos"],
        ativo: true,
        ultimoAcesso: "14/12/2025 12:30",
        dataCriacao: "15/02/2024"
    },
    {
        id: "3",
        nome: "João Santos",
        email: "joao@empresa.com",
        filial: "Filial 02",
        cargo: "Técnico",
        permissoes: ["recebimento", "pre-analise"],
        ativo: true,
        ultimoAcesso: "13/12/2025 18:20",
        dataCriacao: "10/03/2024"
    },
    {
        id: "4",
        nome: "Carla Mendes",
        email: "carla@empresa.com",
        filial: "Matriz",
        cargo: "Supervisor",
        permissoes: ["cadastro", "orcamentos", "recebimento"],
        ativo: false,
        ultimoAcesso: "10/12/2025 09:15",
        dataCriacao: "20/01/2024"
    },
    {
        id: "5",
        nome: "Marcos Oliveira",
        email: "marcos@empresa.com",
        filial: "Filial 03",
        cargo: "Atendente",
        permissoes: ["cadastro", "nfe"],
        ativo: true,
        ultimoAcesso: "14/12/2025 14:00",
        dataCriacao: "05/04/2024"
    }
];

export const mockAtividades: AtividadeUsuario[] = [
    {
        id: "1",
        usuarioId: "1",
        acao: "Criou produto",
        modulo: "Cadastro",
        data: "14/12/2025 13:45",
        detalhes: "Produto ID: A1234567"
    },
    {
        id: "2",
        usuarioId: "2",
        acao: "Gerou orçamento",
        modulo: "Orçamentos",
        data: "14/12/2025 12:30",
        detalhes: "Orçamento #12345"
    },
    {
        id: "3",
        usuarioId: "3",
        acao: "Efetuou recebimento",
        modulo: "Recebimento",
        data: "13/12/2025 18:20",
        detalhes: "NF 000123"
    },
    {
        id: "4",
        usuarioId: "1",
        acao: "Editou permissões",
        modulo: "Usuários",
        data: "13/12/2025 16:10",
        detalhes: "Usuário: Fernanda Costa"
    },
    {
        id: "5",
        usuarioId: "5",
        acao: "Carregou XML",
        modulo: "NF-e",
        data: "14/12/2025 14:00",
        detalhes: "Nota 000456"
    }
];
