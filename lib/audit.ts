export interface AuditLogParams {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: unknown;
    ipAddress?: string;
    userAgent?: string;
}

/** Extracts a human-readable message from an error HTTP response. */
async function extractErrorMessage(response: Response): Promise<string> {
    const text = await response.text();
    if (!text) return `HTTP ${response.status}`;

    try {
        const json = JSON.parse(text);
        return json?.error || json?.message || text;
    } catch {
        if (/<(html|!doctype)/i.test(text)) {
            const nextMessage = text.match(/"message":"([^"]+)"/)?.[1];
            return nextMessage
                ? nextMessage.replace(/\\n/g, ' ').trim()
                : `HTTP ${response.status}`;
        }
        return text;
    }
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
    try {
        const response = await fetch('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            const message = await extractErrorMessage(response);
            console.error('Error creating audit log:', message);
        }
    } catch (err) {
        console.error('Unexpected error creating audit log:', err);
    }
}
