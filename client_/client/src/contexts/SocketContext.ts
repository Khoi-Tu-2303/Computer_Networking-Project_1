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

    // --- MỚI: HÀM DÙNG WEBRTC ĐỂ TỰ TÌM IP LAN TRÊN TRÌNH DUYỆT ---
    const detectLocalIP = async (): Promise<string | null> => {
        return new Promise((resolve) => {
            try {
                const pc = new RTCPeerConnection({ iceServers: [] }); // Tạo kết nối ảo
                pc.createDataChannel(''); // Tạo kênh dữ liệu giả
                pc.createOffer().then(pc.setLocalDescription.bind(pc)); // Tạo offer

                // Lắng nghe sự kiện tìm thấy candidate mạng
                pc.onicecandidate = (ice) => {
                    if (ice && ice.candidate && ice.candidate.candidate) {
                        // Regex để lọc ra địa chỉ IPv4 (VD: 10.29.160.5)
                        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
                        const result = ipRegex.exec(ice.candidate.candidate);

                        if (result && result[1]) {
                            const fullIP = result[1];
                            // Bỏ qua nếu là localhost hoặc IP lạ
                            if (fullIP !== '127.0.0.1' && !fullIP.startsWith('0.')) {
                                pc.onicecandidate = null;
                                pc.close();
                                resolve(fullIP); // Trả về IP thật (VD: 10.29.160.5)
                                return;
                            }
                        }
                    }
                };

                // Timeout 1s nếu không tìm thấy
                setTimeout(() => { resolve(null); }, 1000);
            } catch (e) {
                resolve(null);
            }
        });
    };

    // 1. HÀM KẾT NỐI
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

    // 2. HÀM QUÉT MẠNG (ĐÃ TỐI ƯU GỢI Ý IP)
    const startScan = async (manualBaseIP?: any) => {
        if (isConnected) return;
        setIsScanning(true);
        let baseIP = "";

        if (typeof manualBaseIP === 'string' && manualBaseIP.length > 0) {
            baseIP = manualBaseIP;
        } else {
            const myHostname = window.location.hostname;

            // Nếu đang chạy localhost, dùng "mẹo" WebRTC để đoán IP
            if (myHostname === 'localhost' || myHostname === '127.0.0.1') {

                // Thử lấy IP thật
                const detectedIP = await detectLocalIP();
                let suggestedPrefix = "192.168.1"; // Mặc định nếu không tìm thấy

                if (detectedIP) {
                    // Nếu tìm thấy (VD: 10.29.160.5) -> cắt lấy prefix "10.29.160"
                    const parts = detectedIP.split('.');
                    if (parts.length === 4) {
                        suggestedPrefix = parts.slice(0, 3).join('.');
                    }
                }

                // Hiện Prompt với gợi ý cực chuẩn
                const userInput = prompt(`Phát hiện bạn đang chạy Localhost.\nDải IP LAN của bạn có thể là: ${suggestedPrefix}\nNhập dải IP để quét:`, suggestedPrefix);

                if (!userInput) { setIsScanning(false); return; }
                baseIP = userInput.trim();

                // Fix lỗi người dùng nhập dư số cuối
                if (baseIP.split('.').length === 4) {
                    baseIP = baseIP.substring(0, baseIP.lastIndexOf('.'));
                }

            } else {
                // Nếu truy cập bằng IP (VD: 10.29.160.5:5173) thì lấy luôn prefix đó
                const parts = myHostname.split('.');
                if (parts.length === 4) {
                    baseIP = parts.slice(0, 3).join('.');
                } else {
                    baseIP = myHostname.substring(0, myHostname.lastIndexOf('.'));
                }
            }
        }

        const foundIP = await scanForServer(baseIP);
        if (foundIP) {
            connectToIp(foundIP);
        } else {
            alert(`Không tìm thấy Server nào trong dải ${baseIP}.x !`);
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