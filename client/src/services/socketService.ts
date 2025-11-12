import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// Giữ lại đuôi file ".ts" (theo file của bạn)
import { RequestMessage, ResponseMessage, EventMessage } from '../protocol.ts';

// Map để lưu các request đang chờ phản hồi
const pendingRequests = new Map<string, (response: ResponseMessage) => void>();

// Khai báo socket ở đây, nhưng chưa khởi tạo
let socket: Socket;

/**
 * Khởi tạo kết nối Socket.IO
 * (Hàm này PHẢI được gọi từ SocketContext.tsx hoặc main.tsx)
 */
export const initSocket = () => {
    // Toàn bộ logic "IP Động" được chuyển vào ĐÂY
    // Chỉ khi hàm này chạy (trong trình duyệt), "window" mới tồn tại
    const CLIENT_HOSTNAME = window.location.hostname;
    const PROTOCOL = window.location.protocol;
    const SERVER_URL = `${PROTOCOL}//${CLIENT_HOSTNAME}:8080`;
    const FINAL_URL = `${SERVER_URL}/clients`;

    console.log(`Socket Service (Dynamic): Đang cố gắng kết nối tới ${FINAL_URL}`);

    // Khởi tạo socket
    socket = io(FINAL_URL, {
        reconnection: true,
    });

    socket.on('connect', () => {
        console.log('Đã kết nối tới Server Tổng đài (Clients)');
    });

    socket.on('disconnect', () => {
        console.log('Mất kết nối Server Tổng đài');
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
    });

    // Lắng nghe PHẢN HỒI (response) từ Agent
    // Tên event là 'message' (theo file của bạn)
    socket.on('message', (response: ResponseMessage) => {
        const callback = pendingRequests.get(response.id);
        if (callback) {
            callback(response);
            pendingRequests.delete(response.id);
        }
    });

    // Lắng nghe EVENT (agent connect/disconnect) từ Server
    socket.on('event', (event: EventMessage) => {
        console.log('Server Event:', event.event, event.payload);
        // (Bạn sẽ dùng event này trong Context để cập nhật danh sách Agent)
    });

    // SỬA LỖI: Thêm dòng này vào
    return socket;
};

/**
 * Gửi một lệnh (command) đến một agent cụ thể và chờ phản hồi
 */
export const sendCommand = (
    agentId: string,
    action: string,
    payload?: unknown
): Promise<ResponseMessage> => {

    return new Promise((resolve, reject) => {
        // Phải kiểm tra 'socket' (xem initSocket đã chạy chưa)
        if (!socket || !socket.connected) {
            return reject(new Error('Socket is not connected. (initSocket() might not have been called)'));
        }

        const requestId = uuidv4(); // Tạo ID duy nhất cho request

        const requestMessage: RequestMessage = {
            protocolVersion: '1.0',
            id: requestId,
            type: 'request',
            action: action,
            payload: payload,
            meta: {
                agentId: agentId, // Quan trọng: Gửi cho Agent nào
                timestamp: Date.now(),
            },
        };

        // Đăng ký callback chờ phản hồi
        pendingRequests.set(requestId, (response) => {
            if (response.status === 'ok') {
                resolve(response);
            } else {
                reject(new Error(response.error?.message || 'Unknown error'));
            }
        });

        // Gửi lệnh 'request' (theo file của bạn)
        socket.emit('request', requestMessage);

        // Tự động hủy nếu chờ quá 10 giây (10000ms)
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error(`Command "${action}" timed out.`));
            }
        }, 10000);
    });
};

export const getSocket = () => socket;
