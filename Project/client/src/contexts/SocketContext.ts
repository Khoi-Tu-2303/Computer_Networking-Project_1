// file: SocketContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initSocket } from '../services/socketService';
import { EventMessage } from '../protocol';
import { type Socket } from 'socket.io-client';

interface Agent {
    id: string;
    // ...
}

interface ISocketContext {
    isConnected: boolean;
    agents: Agent[];
    selectedAgentId: string | null;
    selectAgent: (agentId: string) => void;
    socket: Socket;
}

const SocketContext = createContext<ISocketContext | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    // 1. Khởi tạo socket ĐẦU TIÊN và MỘT LẦN
    const [socket] = useState(() => initSocket());

    // 2. Khởi tạo các state khác (lấy trạng thái kết nối ban đầu từ socket)
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

    // 3. useEffect bây giờ CHỈ dùng để đăng ký listener
    useEffect(() => {
        // XÓA: const [socket] = ... khỏi đây

        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));

        // Lắng nghe event từ server
        socket.on('event', (event: EventMessage) => {
            if (event.event === 'agent_heartbeat') {
                setAgents((prev) => {
                    const existingAgent = prev.find((a) => a.id === event.payload.agentId);
                    if (!existingAgent) {
                        const newAgent = { id: event.payload.agentId };
                        return [...prev, newAgent];
                    }
                    return prev;
                });
            }
            if (event.event === 'agent_disconnected') {
                setAgents((prev) => prev.filter((a) => a.id !== event.payload.agentId));
                setSelectedAgentId((currentSelectedId) => {
                    if (currentSelectedId === event.payload.agentId) {
                        return null; // Bỏ chọn
                    }
                    return currentSelectedId; // Giữ nguyên agent đang chọn
                });
            }
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('event');
            // Bạn có thể không cần socket.disconnect() ở đây
            // trừ khi toàn bộ App bị unmount
        };
    }, [socket]); // 4. Thêm 'socket' vào dependency array

    const selectAgent = (agentId: string) => {
        setSelectedAgentId(agentId);
    };

    // 5. Câu lệnh return bây giờ đã tìm thấy 'socket'
    return React.createElement(
        SocketContext.Provider,
        { value: { isConnected, agents, selectedAgentId, selectAgent, socket } },
        children
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};