// file: gateway/index.js (Đã sửa lỗi Buffer TCP)
import { WebSocketServer } from 'ws';
import net from 'net';

const WS_PORT = 8080;      // Cổng cho React Webapp kết nối VÀO
const TCP_PORT = 12345;     // Cổng của App Electron
const TCP_HOST = '127.0.0.1'; // App Electron đang chạy ở localhost

// 1. Mở WebSocket Server (lắng nghe React)
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`[Gateway] Đang lắng nghe React trên WebSocket (cổng ${WS_PORT})...`);

wss.on('connection', (ws) => {
    console.log('[Gateway] React Client đã kết nối.');
    
    // 2. Tạo kết nối TCP (kết nối TỚI App Electron)
    const tcpSocket = new net.Socket();
    tcpSocket.connect(TCP_PORT, TCP_HOST, () => {
        console.log(`[Gateway] Đã kết nối tới Windows TCP Server (cổng ${TCP_PORT}).`);
    });

    // 3. Proxy: Chuyển tiếp tin từ React (WS) -> Electron (TCP)
    // (Phần này giữ nguyên, không thay đổi)
    ws.on('message', (message) => {
        const msgString = message.toString();
        console.log(`[React -> Gateway] Nhận lệnh: ${msgString}`);
        
        // Gửi thẳng tin nhắn (JSON) qua TCP cho Electron
        // Phải thêm '\n' vì App Electron dùng 'data' và 'trim()'
        tcpSocket.write(msgString + '\n'); 
    });


    // === BẮT ĐẦU SỬA LỖI (TCP BUFFER) ===
    
    // Tạo một bộ đệm (buffer) cho *riêng* kết nối này
    let buffer = ''; 

    // 4. Proxy: Chuyển tiếp tin từ Electron (TCP) -> React (WS)
    tcpSocket.on('data', (data) => {
        // Thêm "mảnh" dữ liệu mới nhận vào buffer
        buffer += data.toString();

        // Kiểm tra xem buffer có chứa một tin nhắn hoàn chỉnh không
        // (Chúng ta tìm ký tự '\n' mà Agent gửi)
        let newlineIndex;
        
        // Dùng vòng lặp 'while' phòng trường hợp 2 tin nhắn đến cùng lúc
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            // Nếu có, lấy ra tin nhắn hoàn chỉnh (từ đầu đến '\n')
            const completeMessage = buffer.substring(0, newlineIndex).trim();
            
            // Xóa tin nhắn vừa xử lý ra khỏi buffer
            buffer = buffer.substring(newlineIndex + 1);

            // Chỉ xử lý nếu tin nhắn không rỗng
            if (completeMessage) {
                console.log(`[Electron -> Gateway] Nhận phản hồi: ${completeMessage.substring(0, 100)}...`);
                try {
                    // Gửi thẳng chuỗi JSON hoàn chỉnh về cho React
                    // React (socketService.ts) sẽ tự parse và xử lý 'id'
                    ws.send(completeMessage);
                } catch (err) {
                    console.error('[Gateway] Lỗi gửi WS:', err.message);
                }
            }
        }
    });
    // === KẾT THÚC SỬA LỖI ===


    // 5. Xử lý đóng kết nối (Giữ nguyên)
    ws.on('close', () => {
        console.log('[Gateway] React Client ngắt kết nối.');
        tcpSocket.end(); // Đóng kết nối TCP
    });
    tcpSocket.on('close', () => {
        console.log('[Gateway] Windows TCP Server ngắt kết nối.');
        ws.close(); // Đóng kết nối WS
    });

    // Xử lý lỗi (Giữ nguyên)
    tcpSocket.on('error', (err) => console.error('[Gateway] Lỗi TCP:', err.message));
    ws.on('error', (err) => console.error('[Gateway] Lỗi WS:', err.message));
});