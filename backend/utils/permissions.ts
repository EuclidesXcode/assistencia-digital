// Permission Helper Utilities

import { User } from '../models/Auth';

/**
 * Check if user has specific permission
 */
export function hasPermission(user: User | null, permission: string): boolean {
    if (!user) return false;

    // Administrators have all permissions
    if (user.role === 'Administrador') return true;

    // Check if user has specific permission
    return user.permissions?.includes(permission) || false;
}

/**
 * Check if user can access module
 */
export function canAccessModule(user: User | null, module: string): boolean {
    const modulePermissionMap: Record<string, string> = {
        'cadastro': 'cadastro',
        'orcamentos': 'orcamentos',
        'nfe-xml': 'nfe',
        'recebimento': 'recebimento',
        'pre-analise': 'pre-analise',
        'usuarios': 'admin'
    };

    const requiredPermission = modulePermissionMap[module];
    if (!requiredPermission) return true; // Dashboard and other pages are always accessible

    return hasPermission(user, requiredPermission);
}

/**
 * Filter items by user permissions
 */
export function filterByPermission<T extends { permission?: string }>(
    items: T[],
    user: User
): T[] {
    return items.filter(item => {
        if (!item.permission) return true;
        return hasPermission(user, item.permission);
    });
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User | null): boolean {
    return user?.role === 'Administrador';
}
