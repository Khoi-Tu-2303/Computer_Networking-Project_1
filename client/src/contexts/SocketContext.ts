// file: src/contexts/SocketContext.ts

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
    isSystemLocked: boolean; // <--- MỚI: Trạng thái Firewall
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
    const [isSystemLocked, setIsSystemLocked] = useState(false); // <--- MỚI
    const [serverIP, setServerIP] = useState<string | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

    // 1. HÀM KẾT NỐI THẲNG
    const connectToIp = (ip: string) => {
        if (isConnected) return;

        setServerIP(ip);
        const newSocket = initSocket(ip);
        setSocket(newSocket);

        // --- A. LẮNG NGHE TRẠNG THÁI (POLLING) ---
        // Dùng interval để check lúc đầu
        const interval = setInterval(() => {
            if (newSocket.state === "Connected") {
                setIsConnected(true);
                setAgents([{ id: 'server-csharp', name: `SERVER (${ip})`, status: 'online' }]);
                setSelectedAgentId('server-csharp');
                clearInterval(interval);
            }
        }, 500);

        // --- B. LẮNG NGHE SỰ KIỆN ĐÓNG KẾT NỐI (QUAN TRỌNG) ---
        // Khi Server sập (Emergency Shutdown) hoặc mất mạng
        newSocket.onclose(() => {
            console.warn("Mất kết nối tới Server!");
            setIsConnected(false);
            setAgents([]); // Xóa danh sách
            setSelectedAgentId(null);
            setIsSystemLocked(false); // Reset trạng thái khóa
            alert("ĐÃ MẤT KẾT NỐI TỚI SERVER!\n(Server đã tắt hoặc lỗi mạng)");
        });

        // --- C. LẮNG NGHE FIREWALL ---
        newSocket.on("UpdateSystemStatus", (isLocked: boolean) => {
            console.log("Trạng thái khóa hệ thống:", isLocked);
            setIsSystemLocked(isLocked);
        });
    };

    // 2. HÀM QUÉT MẠNG
    const startScan = async (manualBaseIP?: any) => {
        if (isConnected) return;
        setIsScanning(true);
        let baseIP = "";

        if (typeof manualBaseIP === 'string' && manualBaseIP.length > 0) {
            baseIP = manualBaseIP;
        } else {
            const myHostname = window.location.hostname;
            if (myHostname === 'localhost' || myHostname === '127.0.0.1') {
                const userInput = prompt("Nhập dải IP mạng LAN (ví dụ: 192.168.1):", "192.168.1");
                if (!userInput) { setIsScanning(false); return; }
                baseIP = userInput;
            } else {
                baseIP = myHostname.substring(0, myHostname.lastIndexOf('.'));
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
                isConnected, isScanning, isSystemLocked, serverIP, // <-- Export biến mới
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