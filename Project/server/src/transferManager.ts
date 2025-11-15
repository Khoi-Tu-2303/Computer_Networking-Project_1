export class TransferManager {
    // Minimal stub: track active transfers
    private transfers = new Map<string, { agentId: string; meta: any }>();


    initTransfer(transferId: string, agentId: string, meta: any) {
        this.transfers.set(transferId, { agentId, meta });
    }


    finishTransfer(transferId: string) {
        this.transfers.delete(transferId);
    }
}