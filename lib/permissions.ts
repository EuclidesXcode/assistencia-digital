// Permission helper utilities
export function hasPermission(user: { role?: string; permissions?: string[] } | null, permission: string): boolean {
    if (!user) return false;

    // Administrators have all permissions (case-insensitive check)
    const role = user.role?.toLowerCase();
    if (role === 'administrador' || role === 'admin') return true;

    // Check if user has specific permission
    return user.permissions?.includes(permission) || false;
}

export function canAccessModule(user: { role?: string; permissions?: string[] } | null, module: string): boolean {
    const modulePermissionMap: Record<string, string> = {
        'cadastro': 'cadastro',
        'orcamentos': 'orcamentos',
        'nfe-xml': 'nfe',
        'recebimento': 'recebimento',
        'pre-analise': 'pre-analise',
        'usuarios': 'admin',
        'configuracoes': 'admin'
    };

    const requiredPermission = modulePermissionMap[module];
    if (!requiredPermission) return true; // Dashboard and other pages are always accessible

    return hasPermission(user, requiredPermission);
}

