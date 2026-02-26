
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
        const response = await fetch('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                action,
                resource,
                resourceId,
                details,
                ipAddress,
                userAgent
            })
        });

        if (!response.ok) {
            const text = await response.text();
            if (!text) {
                console.error('Error creating audit log:', `HTTP ${response.status}`);
                return;
            }

            try {
                const data = JSON.parse(text);
                console.error('Error creating audit log:', data?.error || data?.message || text);
                return;
            } catch {
                if (/<(html|!doctype)/i.test(text)) {
                    const nextErrorMessage = text.match(/"message":"([^"]+)"/)?.[1];
                    console.error(
                        'Error creating audit log:',
                        nextErrorMessage
                            ? nextErrorMessage.replace(/\\n/g, ' ').trim()
                            : `HTTP ${response.status}`
                    );
                    return;
                }

                console.error('Error creating audit log:', text);
            }
        }
    } catch (err) {
        console.error('Unexpected error creating audit log:', err);
    }
}
