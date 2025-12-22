export enum LoginStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  branchId: string;
  branches?: { branch_name: string };
  role?: string; // Cargo do usuário (ex: "Atendente", "Administrador")
  photoUrl?: string; // URL da foto de perfil
  permissions?: string[]; // Permissões do usuário (ex: ["cadastro", "orcamentos", "nfe"])
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}
