import React, { createContext, useContext, useEffect, useState } from 'react';
import { initSocket } from '../services/socketService';
import { EventMessage } from '../protocol';

interface Agent {
    id: string;
    // Thêm các thông tin khác (status, info...) nếu cần
}

interface ISocketContext {
    isConnected: boolean;
    agents: Agent[];
    selectedAgentId: string | null;
    selectAgent: (agentId: string) => void;
}

const SocketContext = createContext<ISocketContext | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

    useEffect(() => {
        const socket = initSocket();

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
                    // Nếu agent đã tồn tại, có thể cập nhật thông tin mới ở đây
                    return prev;
                });
            }
            if (event.event === 'agent_disconnected') {
                setAgents((prev) => prev.filter((a) => a.id !== event.payload.agentId));
                // Nếu agent đang được chọn bị disconnect, bỏ chọn
                if (selectedAgentId === event.payload.agentId) {
                    setSelectedAgentId(null);
                }
            }
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('event');
            socket.disconnect();
        };
    }, [selectedAgentId]); // Thêm selectedAgentId vào dependencies

    const selectAgent = (agentId: string) => {
        setSelectedAgentId(agentId);
    };
    return React.createElement(
        SocketContext.Provider,
        { value: { isConnected, agents, selectedAgentId, selectAgent } },
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