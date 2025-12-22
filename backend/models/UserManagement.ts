// User Management Models

export interface Usuario {
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

export interface AtividadeUsuario {
    id: string;
    usuarioId: string;
    acao: string;
    modulo: string;
    data: string;
    detalhes: string;
}

export interface CreateUsuarioDTO {
    nome: string;
    email: string;
    filial: string;
    cargo: string;
    permissoes: string[];
    password?: string;
}

export interface UpdatePermissoesDTO {
    permissoes: string[];
}

export interface UpdateStatusDTO {
    ativo: boolean;
}
