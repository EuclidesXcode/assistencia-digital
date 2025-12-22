
import { supabase } from './supabase';

export interface AuditLogParams {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
}

export async function createAuditLog({
    userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    userAgent
}: AuditLogParams) {
    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: userId,
                action,
                resource,
                resource_id: resourceId,
                details,
                ip_address: ipAddress,
                user_agent: userAgent
            });

        if (error) {
            console.error('Error creating audit log:', error);
        }
    } catch (err) {
        console.error('Unexpected error creating audit log:', err);
    }
}
