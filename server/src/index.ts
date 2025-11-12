import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { registerAgentHandlers } from './handlers/agentHandler';
import { registerCommandHandlers } from './handlers/commandHandler';
import { logger } from './logger';

// --- BẮT ĐẦU PHẦN THÊM VÀO ---
import os from 'os';

/**
 * Hàm này sẽ tìm IP (IPv4) thật trong mạng LAN (Wi-Fi hoặc Dây)
 */
function getLocalIp(): string | null {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const ifaceDetails = interfaces[name];
        if (!ifaceDetails) continue;

        for (const iface of ifaceDetails) {
            const { address, family, internal } = iface;
            // Chỉ tìm IPv4, không phải IP nội bộ (localhost)
            if (family === 'IPv4' && !internal) {
                // Ưu tiên card Wi-Fi hoặc Ethernet
                if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('ethernet')) {
                    return address;
                }
            }
        }
    }

    // Nếu không tìm thấy card "xịn", lấy IP IPv4 đầu tiên tìm được
    for (const name of Object.keys(interfaces)) {
        const ifaceDetails = interfaces[name];
        if (!ifaceDetails) continue;
        for (const iface of ifaceDetails) {
            const { address, family, internal } = iface;
            if (family === 'IPv4' && !internal) {
                return address; // Lấy IP đầu tiên
            }
        }
    }
    return null; // Không tìm thấy
}
// --- KẾT THÚC PHẦN THÊM VÀO ---


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});


// basic namespace separation: /agents and /clients
const agentsNS = io.of('/agents');
const clientsNS = io.of('/clients');


agentsNS.use((socket, next) => {
    // could verify token here
    next();
});


clientsNS.use((socket, next) => {
    // could verify token here
    next();
});


agentsNS.on('connection', (socket) => {
    // register agent-specific handlers
    registerAgentHandlers(agentsNS, socket);
});


clientsNS.on('connection', (socket) => {
    // add the client socket to 'clients' room so agents can broadcast status
    socket.join('clients');
    registerCommandHandlers(clientsNS, socket);
});


const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// --- SỬA LẠI CHỖ NÀY ---
// Thêm '0.0.0.0' để nó lắng nghe trên TẤT CẢ IP (kể cả IP Wi-Fi)
server.listen(PORT, '0.0.0.0', () => {
    // --- HẾT SỬA ---
    logger.info(`Control hub server listening on port ${PORT}`);

    // --- THÊM PHẦN IN IP RA ---
    const localIp = getLocalIp();
    if (localIp) {
        logger.info("=================================================");
        logger.info(`===> MỞ ĐIỆN THOẠI VÀ TRUY CẬP (CLIENT): http://${localIp}:5173`);
        logger.info("=================================================");
    } else {
        logger.warn("Không thể tự động tìm thấy IP mạng LAN. Hãy dùng 'localhost' hoặc IP thủ công.");
    }
    // --- KẾT THÚC THÊM ---
});


// Minimal HTTP endpoints for health
app.get('/health', (_req, res) => res.json({ ok: true }));