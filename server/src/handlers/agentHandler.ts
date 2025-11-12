// 1. Import "Namespace" thay vì "Server"
import { Namespace, Socket } from 'socket.io';
import { logger } from '../logger';
import { verifySocketAuth } from '../auth';

// 2. Sửa "io: Server" thành "io: Namespace"
export function registerAgentHandlers(io: Namespace, socket: Socket) {
    const payload = verifySocketAuth(socket);
    // Dòng này (ở dưới) về logic là ĐÚNG. 
    // Nó sẽ hết lỗi gạch đỏ ngay khi bạn gửi file "auth.ts"
    const agentId = (payload?.agentId ?? (socket.handshake.auth && (socket.handshake.auth as any).agentId)) || socket.id;

    // join a room for this agent
    socket.join(`agent:${agentId}`);
    socket.data.agentId = agentId;
    logger.info(`Agent connected: ${agentId} (socket ${socket.id})`);

    // heartbeat
    socket.on('heartbeat', (data) => {
        // update last-seen, broadcast agent status
        // 3. Vì "io" là Namespace, nó không thể emit cho "clients"
        // Bạn phải dùng "io.server.of('/clients')" để đi ra ngoài
        io.server.of('/clients').emit('event', { event: 'agent_heartbeat', payload: { agentId, data } });
    });

    // generic response from agent
    socket.on('response', (msg) => {
        // 4. Sửa tương tự
        io.server.of('/clients').emit('message', msg);
    });

    socket.on('disconnect', (reason) => {
        logger.info(`Agent disconnected: ${agentId} reason=${reason}`);
        // 5. Sửa tương tự
        io.server.of('/clients').emit('event', { event: 'agent_disconnected', payload: { agentId, reason } });
    });
}