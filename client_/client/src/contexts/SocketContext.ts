import React, { createContext, useContext, useEffect, useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { initSocket, scanForServer } from '../services/socketService';

interface Agent {
    id: string;
    name: string;
    status: 'online' | 'offline';
    ip?: string; // <--- 1. THÊM IP VÀO INTERFACE
}
interface ModalConfig {
    type: 'info' | 'error' | 'success' | 'warning';
    title: string;
    message: string;
    onConfirm?: () => void;
    showCancel?: boolean;
}
interface ISocketContext {
    isConnected: boolean;
    isScanning: boolean;
    isSystemLocked: boolean;
    serverIP: string | null;
    agents: Agent[];
    logs: string[]; // <--- 2. THÊM LOGS VÀO CONTEXT
    selectedAgentId: string | null;
    selectAgent: (agentId: string) => void;
    socket: HubConnection | null;
    startScan: (manualBaseIP?: string) => void;
    connectToIp: (ip: string) => void;
    clearLogs: () => void; // <--- 3. THÊM HÀM XÓA LOG

    // --- [MỚI] THÊM CÁC HÀM CHO MODAL ---
    isScanModalOpen: boolean;
    scanSuggestion: string;
    confirmScan: (ip: string) => void;
    cancelScan: () => void;
    scanError: string | null; // [MỚI] Thêm dòng này
    // ------------------------------------
    modalConfig: ModalConfig | null;
    showModal: (config: ModalConfig) => void;
    closeModal: () => void;
    stopScan: () => void;
    disconnect: () => Promise<void>;
}

const SocketContext = createContext<ISocketContext | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<HubConnection | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isSystemLocked, setIsSystemLocked] = useState(false);
    const [serverIP, setServerIP] = useState<string | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

    // <--- 4. STATE LƯU LOG
    const [logs, setLogs] = useState<string[]>([]);

    // --- [MỚI] STATE CHO MODAL ---
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [scanSuggestion, setScanSuggestion] = useState("");
    const [scanError, setScanError] = useState<string | null>(null);
    // -----------------------------
    const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
    const manualDisconnectRef = React.useRef(false);
    const showModal = (config: ModalConfig) => setModalConfig(config);
    const closeModal = () => setModalConfig(null);

    // --- 1. LOGIC KẾT NỐI SERVER ---
    const connectToIp = async (ip: string) => {
        if (isConnected) return;
        setServerIP(ip);

        const newSocket = initSocket(ip);
        // Timeout server 5s như đã bàn
        newSocket.serverTimeoutInMilliseconds = 5000;
        setSocket(newSocket);

        const interval = setInterval(() => {
            if (newSocket.state === "Connected") {
                setIsConnected(true);
                // Mặc định add server vào list trước khi nhận list chuẩn
                setAgents([{ id: 'server-csharp', name: `SERVER (${ip})`, status: 'online' }]);
                setSelectedAgentId('server-csharp');
                clearInterval(interval);
            }
        }, 500);

        // ============================================================
        // 👇👇👇 PHẦN CHÈN THÊM (XỬ LÝ DANH SÁCH & LOG) 👇👇👇
        // ============================================================

        // A. Nhận danh sách Client từ Server gửi về
        newSocket.on("UpdateClientList", (clientList: any[]) => {
            console.log("📥 [SOCKET] Raw List:", clientList);

            // --- SỬA LẠI ĐOẠN NÀY ---

            // Vì ông chỉ muốn điều khiển Server, nên ta tạo cứng 1 cái Agent là Server.
            // Bỏ qua luôn cái danh sách clientList mà SignalR gửi về (vì toàn là trình duyệt web thôi).
            const serverAgent: Agent = {
                id: 'server-csharp',
                name: `TARGET MACHINE (${ip})`, // Đặt tên ngầu ngầu tí
                ip: ip,
                status: 'online'
            };

            // Chỉ set đúng 1 thằng này vào danh sách
            setAgents([serverAgent]);

            // ------------------------
        });
        // B. Nhận Log hành động
        newSocket.on("ReceiveLog", (msg: string) => {
            console.log("📜 [LOG]", msg);
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
        });

        // ============================================================
        // 👆👆👆 HẾT PHẦN CHÈN THÊM 👆👆👆
        // ============================================================

        newSocket.on("ServerStopping", () => {
            console.warn("⚠️ SERVER ĐANG TẮT MÁY CHỦ ĐỘNG!");
            setIsConnected(false);
            setAgents([]);
            setSelectedAgentId(null);
            setIsSystemLocked(false);
            newSocket.stop();
            // [THAY THẾ ALERT CŨ]
            showModal({
                type: 'warning',
                title: 'CONNECTION LOST',
                message: 'Server has initiated shutdown sequence or terminated the connection.',
            });
        });

        newSocket.onclose(() => {
            // Nếu là tắt thủ công thì KHÔNG làm gì cả (để UI tự xử lý)
            if (manualDisconnectRef.current) {
                console.log("🟢 Đã ngắt kết nối thủ công.");
                manualDisconnectRef.current = false; // Reset cờ
                return;
            }

            // Nếu tự nhiên mất kết nối thì mới hiện lỗi
            console.warn("Mất kết nối tới Server!");
            setIsConnected(false);
            setAgents([]);
            setSelectedAgentId(null);
            setIsSystemLocked(false);

            showModal({
                type: 'warning',
                title: 'CONNECTION LOST',
                message: 'Server has initiated shutdown sequence or terminated the connection.',
            });
        });

        newSocket.on("UpdateSystemStatus", (isLocked: boolean) => {
            setIsSystemLocked(isLocked);
        });
        try {
            await newSocket.start(); // <-- Chạy kết nối

            // Nếu chạy đến đây tức là thành công
            console.log("✅ Socket Connected via Context!");
            setIsConnected(true);
            setAgents([{ id: 'server-csharp', name: `TARGET MACHINE (${ip})`, status: 'online', ip: ip }]);
            setSelectedAgentId('server-csharp');

        } catch (error: any) {
            console.error("🔥 Context Catch Error:", error);
            setSocket(null); // Reset socket nếu lỗi

            // [ĐÂY LÀ CHỖ HIỆN MODAL THAY VÌ ALERT]
            showModal({
                type: 'error',
                title: 'CONNECTION FAILED',
                message: `Could not reach host at ${ip}.\nError Details: ${error.message || "Unknown Network Error"}.\nPlease check IP address and Firewall settings.`,
                showCancel: false
            });
        }
    };

    // --- 2. HÀM MỚI: KẾT NỐI IP AGENT ---
    const getIpFromLocalAgent = (): Promise<string | null> => {
        return new Promise((resolve) => {
            console.log("🔵 [CLIENT] Đang thử kết nối Agent tại ws://localhost:9999...");
            let isResolved = false;

            const handleSuccess = (prefix: string) => {
                if (isResolved) return;
                isResolved = true;
                console.log("✅ [CLIENT] THÀNH CÔNG! Đã nhận Prefix từ Agent:", prefix);
                resolve(prefix);
            };

            const handleFail = () => {
                if (isResolved) return;
                isResolved = true;
                console.warn("❌ [CLIENT] Thất bại. Không lấy được IP từ Agent.");
                resolve(null);
            };

            try {
                const ws = new WebSocket('ws://localhost:9999');
                const timeout = setTimeout(() => {
                    if (!isResolved) {
                        console.warn("⏰ [CLIENT] Timeout! Agent không phản hồi sau 3s.");
                        ws.close();
                        handleFail();
                    }
                }, 3000);

                ws.onopen = () => console.log("🟢 [CLIENT] Socket đã mở! Đang đợi tin nhắn...");
                ws.onmessage = (event) => {
                    console.log("📩 [CLIENT] Nhận được dữ liệu thô:", event.data);
                    try {
                        const data = JSON.parse(event.data);
                        if (data && data.prefix) {
                            clearTimeout(timeout);
                            handleSuccess(data.prefix);
                            ws.close();
                        }
                    } catch (e) { console.error("⚠️ [CLIENT] Lỗi parse JSON:", e); }
                };
                ws.onerror = (err) => console.error("🔴 [CLIENT] Lỗi WebSocket:", err);

            } catch (e) {
                console.error("🔥 [CLIENT] Exception khi tạo WebSocket:", e);
                handleFail();
            }
        });
    };

    // --- 3. WEBRTC (BACKUP) ---
    const detectLocalIP = async (): Promise<string | null> => {
        return new Promise((resolve) => {
            try {
                const pc = new RTCPeerConnection({ iceServers: [] });
                pc.createDataChannel('');
                pc.createOffer().then(pc.setLocalDescription.bind(pc));
                pc.onicecandidate = (ice) => {
                    if (ice && ice.candidate && ice.candidate.candidate) {
                        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
                        const result = ipRegex.exec(ice.candidate.candidate);
                        if (result && result[1]) {
                            const fullIP = result[1];
                            if (fullIP !== '127.0.0.1' && !fullIP.startsWith('0.')) {
                                pc.onicecandidate = null;
                                pc.close();
                                resolve(fullIP);
                                return;
                            }
                        }
                    }
                };
                setTimeout(() => { resolve(null); }, 1000);
            } catch (e) { resolve(null); }
        });
    };
    const stopScan = () => {
        setIsScanning(false);
        setScanError(null);
    };
    // --- 4. SCAN (ĐÃ SỬA: KHÔNG DÙNG PROMPT, MỞ MODAL) ---
    const startScan = async (manualBaseIP?: string) => {
        if (isConnected) return;

        // Nếu truyền sẵn IP (debug) thì chạy luôn
        if (typeof manualBaseIP === 'string' && manualBaseIP.length > 0) {
            confirmScan(manualBaseIP);
            return;
        }

        // Tự động detect IP để làm gợi ý
        const myHostname = window.location.hostname;
        let suggestedPrefix = "192.168.1";

        if (myHostname === 'localhost' || myHostname === '127.0.0.1') {
            let ipFromAgent = await getIpFromLocalAgent();
            let isDetected = false;

            if (ipFromAgent) {
                suggestedPrefix = ipFromAgent;
                isDetected = true;
            }

            if (!isDetected) {
                const detectedIP = await detectLocalIP();
                if (detectedIP) {
                    const parts = detectedIP.split('.');
                    if (parts.length === 4) {
                        suggestedPrefix = parts.slice(0, 3).join('.');
                        isDetected = true;
                    }
                }
            }

            if (!isDetected) suggestedPrefix = "192.168.1";

            // [FIXED] THAY VÌ PROMPT -> BẬT MODAL LÊN
            setScanSuggestion(suggestedPrefix);
            setIsScanModalOpen(true);
            return; // Dừng lại ở đây, đợi user bấm nút trên Modal
        } else {
            const parts = myHostname.split('.');
            suggestedPrefix = (parts.length === 4) ? parts.slice(0, 3).join('.') : myHostname.substring(0, myHostname.lastIndexOf('.'));

            // Cũng bật Modal cho trường hợp này luôn
            setScanSuggestion(suggestedPrefix);
            setIsScanModalOpen(true);
        }
    };

    // --- [MỚI] HÀM CHẠY KHI BẤM "SCAN" Ở MODAL ---
    const confirmScan = async (baseIP: string) => {
        // KHÔNG đóng modal ở đây
        setIsScanning(true);
        setScanError(null);

        if (baseIP.split('.').length === 4) baseIP = baseIP.substring(0, baseIP.lastIndexOf('.'));

        console.log("🚀 Bắt đầu quét dải:", baseIP);
        const foundIP = await scanForServer(baseIP);

        setIsScanning(false); // Tắt loading

        if (foundIP) {
            // TÌM THẤY -> KẾT NỐI VÀ ĐÓNG MODAL
            connectToIp(foundIP);
            setIsScanModalOpen(false);
        } else {
            // KHÔNG TÌM THẤY -> GIỮ NGUYÊN MODAL, CHỈ HIỆN LỖI ĐỎ
            // Đừng gọi setIsScanModalOpen(false) ở đây!

            // Set nội dung lỗi để NetworkScanModal tự hiện
            setScanError(`SCAN FAILED: No server found in range ${baseIP}.x`);
        }
    };
    // --- [MỚI] HÀM HỦY QUÉT (ĐÓNG MODAL) ---
    const cancelScan = () => {
        setIsScanModalOpen(false);
        setIsScanning(false);
        setScanError(null);
    };
    // THÊM HÀM NGẮT KẾT NỐI CHỦ ĐỘNG (KHÔNG RELOAD)
    const disconnect = async () => {
        if (socket) {
            manualDisconnectRef.current = true; // Bật cờ "Chủ động tắt"
            try {
                await socket.stop();
            } catch (e) { console.error(e); }
            setSocket(null);
        }
        // Reset trạng thái về màn hình đăng nhập
        setIsConnected(false);
        setAgents([]);
        setSelectedAgentId(null);
        setIsSystemLocked(false);
        setIsScanning(false);
    };
    const selectAgent = (agentId: string) => setSelectedAgentId(agentId);

    // <--- 5. HÀM XÓA LOG
    const clearLogs = () => setLogs([]);

    return React.createElement(
        SocketContext.Provider,
        {
            value: {
                isConnected, isScanning, isSystemLocked, serverIP,
                agents, logs, selectedAgentId, // <--- 6. EXPORT LOGS
                selectAgent, socket, startScan, connectToIp, clearLogs, // <--- 7. EXPORT CLEARLOGS
                scanError, modalConfig, showModal, closeModal, stopScan, disconnect,
                // Export thêm mấy cái này để Component Modal dùng
                isScanModalOpen, scanSuggestion, confirmScan, cancelScan
            }
        },
        children
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) throw new Error('useSocket must be used within a SocketProvider');
    return context;
};