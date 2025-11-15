
import React from 'react';
import { useSocket } from '../contexts/SocketContext';

export const AgentSelector: React.FC = () => {
    const { isConnected, agents, selectedAgentId, selectAgent } = useSocket();

    if (!isConnected) {
        return <div>Đang kết nối tới Server...</div>;
    }

    return (
        <div>
            <strong>Chọn Agent để điều khiển:</strong>
            <select
                value={selectedAgentId || ''}
                onChange={(e) => selectAgent(e.target.value)}
            >
                <option value="" disabled>-- Chọn một Agent --</option>
                {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                        {agent.id}
                    </option>
                ))}
            </select>
        </div>
    );
};