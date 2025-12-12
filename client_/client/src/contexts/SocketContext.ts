import React, { createContext, useContext, useEffect, useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { initSocket, scanForServer } from '../services/socketService';

interface Agent {
    id: string;
    name: string;
    status: 'online' | 'offline';
}

interface ISocketContext {
    isConnected: boolean;
    isScanning: boolean;
    isSystemLocked: boolean;
    serverIP: string | null;
    agents: Agent[];
    selectedAgentId: string | null;
    selectAgent: (agentId: string) => void;
    socket: HubConnection | null;
    startScan: (manualBaseIP?: string) => void;
    connectToIp: (ip: string) => void;
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

    // --- 1. LOGIC KẾT NỐI SERVER ---
    const connectToIp = (ip: string) => {
        if (isConnected) return;
        setServerIP(ip);
        const newSocket = initSocket(ip);
        setSocket(newSocket);

        const interval = setInterval(() => {
            if (newSocket.state === "Connected") {
                setIsConnected(true);
                setAgents([{ id: 'server-csharp', name: `SERVER (${ip})`, status: 'online' }]);
                setSelectedAgentId('server-csharp');
                clearInterval(interval);
            }
        }, 500);

        newSocket.onclose(() => {
            console.warn("Mất kết nối tới Server!");
            setIsConnected(false);
            setAgents([]);
            setSelectedAgentId(null);
            setIsSystemLocked(false);
            alert("ĐÃ MẤT KẾT NỐI TỚI SERVER!");
        });

        newSocket.on("UpdateSystemStatus", (isLocked: boolean) => {
            setIsSystemLocked(isLocked);
        });
    };

    // --- 2. HÀM MỚI: KẾT NỐI IP AGENT (PHIÊN BẢN ROBUST) ---
    const getIpFromLocalAgent = (): Promise<string | null> => {
        return new Promise((resolve) => {
            console.log("🔵 [CLIENT] Đang thử kết nối Agent tại ws://localhost:9999...");
            let isResolved = false; // Cờ để đảm bảo chỉ resolve 1 lần

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
                // Dùng 'localhost' thay vì '127.0.0.1' để tương thích tốt hơn
                const ws = new WebSocket('ws://localhost:9999');

                // Timeout an toàn 3 giây
                const timeout = setTimeout(() => {
                    if (!isResolved) {
                        console.warn("⏰ [CLIENT] Timeout! Agent không phản hồi sau 3s.");
                        ws.close();
                        handleFail();
                    }
                }, 3000);

                ws.onopen = () => {
                    console.log("🟢 [CLIENT] Socket đã mở! Đang đợi tin nhắn...");
                };

                ws.onmessage = (event) => {
                    console.log("📩 [CLIENT] Nhận được dữ liệu thô:", event.data);
                    try {
                        const data = JSON.parse(event.data);
                        if (data && data.prefix) {
                            clearTimeout(timeout); // Hủy timeout ngay
                            handleSuccess(data.prefix);
                            ws.close(); // Xong việc thì đóng
                        }
                    } catch (e) {
                        console.error("⚠️ [CLIENT] Lỗi parse JSON từ Agent:", e);
                    }
                };

                ws.onerror = (err) => {
                    // Đừng fail ngay, có thể lỗi tạm thời
                    console.error("🔴 [CLIENT] Lỗi WebSocket:", err);
                };

            } catch (e) {
                console.error("🔥 [CLIENT] Exception khi tạo WebSocket:", e);
                handleFail();
            }
        });
    };

    // --- 3. HÀM DỰ PHÒNG: WEBRTC (Giữ nguyên để backup) ---
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

    // --- 4. HÀM SCAN CHÍNH ---
    // --- SỬA LẠI ĐOẠN NÀY TRONG startScan ---
    const startScan = async (manualBaseIP?: string) => {
        if (isConnected) return;
        setIsScanning(true);
        let baseIP = "";

        if (typeof manualBaseIP === 'string' && manualBaseIP.length > 0) {
            baseIP = manualBaseIP;
        } else {
            const myHostname = window.location.hostname;

            if (myHostname === 'localhost' || myHostname === '127.0.0.1') {

                // 1. HỎI AGENT
                let suggestedPrefix = await getIpFromLocalAgent();
                let isDetected = false; // Biến cờ đánh dấu thành công

                if (suggestedPrefix) {
                    isDetected = true; // Đánh dấu là Agent đã tìm thấy
                }

                // 2. NẾU KHÔNG CÓ -> THỬ WEBRTC
                if (!suggestedPrefix) {
                    const detectedIP = await detectLocalIP();
                    if (detectedIP) {
                        const parts = detectedIP.split('.');
                        if (parts.length === 4) {
                            suggestedPrefix = parts.slice(0, 3).join('.');
                            isDetected = true; // Đánh dấu là WebRTC tìm thấy
                        }
                    }
                }

                if (!suggestedPrefix) suggestedPrefix = "192.168.1";

                // 3. HIỂN THỊ THÔNG BÁO DỰA TRÊN BIẾN isDetected
                const userInput = prompt(
                    isDetected
                        ? `✅ Đã tự động phát hiện IP LAN!\nGợi ý: ${suggestedPrefix}\nNhập dải IP để quét:`
                        : `⚠️ Không tìm thấy Agent (Dùng mặc định).\nVui lòng nhập dải IP LAN:`,
                    suggestedPrefix
                );

                if (!userInput) { setIsScanning(false); return; }
                baseIP = userInput.trim();
            }
            else {
                // Logic cho truy cập qua LAN
                const parts = myHostname.split('.');
                baseIP = (parts.length === 4)
                    ? parts.slice(0, 3).join('.')
                    : myHostname.substring(0, myHostname.lastIndexOf('.'));
            }
        }

        // Xử lý chuỗi IP
        if (baseIP.split('.').length === 4) {
            baseIP = baseIP.substring(0, baseIP.lastIndexOf('.'));
        }

        console.log("🚀 Bắt đầu quét dải:", baseIP);
        const foundIP = await scanForServer(baseIP);

        if (foundIP) {
            connectToIp(foundIP);
        } else {
            alert(`Không tìm thấy Server trong dải ${baseIP}.x !`);
        }
        setIsScanning(false);
    };

    const selectAgent = (agentId: string) => {
        setSelectedAgentId(agentId);
    };

    return React.createElement(
        SocketContext.Provider,
        {
            value: {
                isConnected, isScanning, isSystemLocked, serverIP,
                agents, selectedAgentId, selectAgent, socket, startScan, connectToIp
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