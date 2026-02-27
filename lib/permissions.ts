// Permission helper utilities

export type UserRole = 'admin' | 'administrador' | 'user';

export interface UserLike {
    role?: string;
    permissions?: string[];
}

const ADMIN_ROLES: ReadonlySet<string> = new Set(['admin', 'administrador']);

/** Maps module identifiers to the required permission string. */
const MODULE_PERMISSION_MAP: Readonly<Record<string, string>> = {
    cadastro: 'cadastro',
    orcamentos: 'orcamentos',
    'nfe-xml': 'nfe',
    recebimento: 'recebimento',
    'pre-analise': 'pre-analise',
    usuarios: 'admin',
    configuracoes: 'admin',
};

export function hasPermission(user: UserLike | null, permission: string): boolean {
    if (!user) return false;
    if (ADMIN_ROLES.has(user.role?.toLowerCase() ?? '')) return true;
    return user.permissions?.includes(permission) ?? false;
}

export function canAccessModule(user: UserLike | null, module: string): boolean {
    const requiredPermission = MODULE_PERMISSION_MAP[module];
    // Pages not listed in the map are always accessible (e.g. dashboard)
    if (!requiredPermission) return true;
    return hasPermission(user, requiredPermission);
}
