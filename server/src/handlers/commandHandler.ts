import { Namespace, Socket } from 'socket.io';
import { logger } from '../logger';
import { RequestMessage } from '../protocol'; // 2. Import "RequestMessage"

// 3. Sửa "io: Server" thành "io: Namespace"
export function registerCommandHandlers(io: Namespace, socket: Socket) {
    // Only clients will use these handlers; clients should join room 'clients'

    // 4. Thêm kiểu "RequestMessage" cho "msg" để code an toàn hơn
    socket.on('request', (msg: RequestMessage, ack?: (res: any) => void) => {

        // 5. Lấy agentId từ "meta" (theo chuẩn protocol.ts của bạn)
        const agentId = msg?.meta?.agentId;

        if (!agentId) {
            const err = { id: msg?.id ?? null, status: 'error', error: { code: 'E_MISSING_AGENT', message: 'agentId required' } };
            if (ack) ack(err);
            return;
        }

        // 6. SỬA LỖI CHUYỂN TIẾP NGHIÊM TRỌNG
        // Phải đi ngược lên server gốc, rồi rẽ nhánh sang /agents
        io.server.of('/agents').to(`agent:${agentId}`).emit('request', msg);

        // optional: set up a timeout ack for demo
        if (ack) {
            // naive ack: respond immediately that request was forwarded
            ack({ id: msg.id, status: 'ok', payload: { forwarded: true } });
        }

        logger.info('Forwarded request', msg.action, 'to', agentId);
    });
}