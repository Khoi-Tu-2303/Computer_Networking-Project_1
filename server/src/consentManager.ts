export class ConsentManager {
    // pending consents keyed by request id
    private pending = new Map<string, { agentId: string; resolve: (v: boolean) => void; reject: (e: any) => void }>();


    requestConsent(requestId: string, agentId: string) {
        return new Promise<boolean>((resolve, reject) => {
            this.pending.set(requestId, { agentId, resolve, reject });
            // consumer should emit a consent_request event to agent UI
        });
    }


    fulfillConsent(requestId: string, value: boolean) {
        const entry = this.pending.get(requestId);
        if (!entry) return false;
        entry.resolve(value);
        this.pending.delete(requestId);
        return true;
    }


    denyConsent(requestId: string, reason?: any) {
        const entry = this.pending.get(requestId);
        if (!entry) return false;
        entry.reject(reason ?? new Error('Denied'));
        this.pending.delete(requestId);
        return true;
    }
}