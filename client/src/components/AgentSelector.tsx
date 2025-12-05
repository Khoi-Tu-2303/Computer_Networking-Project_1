import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Radio, Search, Zap, Loader2 } from 'lucide-react';

export const AgentSelector: React.FC = () => {
    // --- PHẦN NÃO (LOGIC CŨ) ---
    const {
        isConnected, isScanning, agents, selectedAgentId,
        selectAgent, startScan, connectToIp, serverIP,
    } = useSocket();

    const [manualIP, setManualIP] = useState("127.0.0.1");

    // Tự động chọn agent
    useEffect(() => {
        if (agents.length > 0 && !selectedAgentId) {
            selectAgent(agents[0].id);
        }
    }, [agents, selectedAgentId, selectAgent]);

    // --- PHẦN ÁO (GIAO DIỆN MỚI TỪ BOLT.AI) ---
    return (
        <div className="glass-panel p-6 rounded-lg">
            <h2 className="text-xl font-bold text-cyan-500 neon-glow-cyan tracking-wider mb-6 flex justify-between items-center">
                {'> TARGET_CONTROL_'}
                {/* Đèn trạng thái nhỏ */}
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
            </h2>

            <div className="space-y-4">

                {/* KHU VỰC NHẬP IP VÀ KẾT NỐI */}
                {!isConnected ? (
                    <div>
                        <label className="block text-cyan-500/60 text-xs font-bold mb-2">
                            {'// MANUAL_IP_ENTRY'}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={manualIP}
                                onChange={(e) => setManualIP(e.target.value)}
                                placeholder="127.0.0.1"
                                className="flex-1 bg-black neon-border-cyan px-4 py-3 rounded text-cyan-500 font-mono hover:bg-cyan-950/20 focus:outline-none focus:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300"
                            />

                            {/* Nút LAUNCH (Kết nối thẳng) */}
                            <button
                                onClick={() => connectToIp(manualIP)}
                                className="group bg-black neon-border-green hover:bg-green-950/30 px-6 py-3 rounded transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
                            >
                                <Zap className="w-4 h-4 text-green-500 group-hover:animate-pulse" />
                                <span className="text-green-500 font-bold text-sm">CONNECT</span>
                            </button>
                        </div>

                        {/* Nút SCAN (Quét mạng) */}
                        <div className="mt-3">
                            <button
                                onClick={() => startScan()}
                                disabled={isScanning}
                                className="w-full group bg-black neon-border-cyan hover:bg-cyan-950/30 px-4 py-2 rounded transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isScanning ? <Loader2 className="animate-spin w-4 h-4 text-cyan-500" /> : <Search className="w-4 h-4 text-cyan-500" />}
                                <span className="text-cyan-500 font-bold text-sm">
                                    {isScanning ? "SCANNING_NETWORK..." : "AUTO_SCAN_LAN"}
                                </span>
                            </button>
                        </div>
                    </div>
                ) : (
                    // KHI ĐÃ KẾT NỐI -> HIỆN DROPDOWN DANH SÁCH
                    <div>
                        <label className="block text-green-500/60 text-xs font-bold mb-2">
                            {'// ACTIVE_TARGET'}
                        </label>
                        <select
                            className="w-full bg-black neon-border-green px-4 py-3 rounded text-green-500 font-mono hover:bg-green-950/20 focus:outline-none focus:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300 cursor-pointer appearance-none"
                            value={selectedAgentId || ''}
                            onChange={(e) => selectAgent(e.target.value)}
                        >
                            {agents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.name}
                                </option>
                            ))}
                        </select>
                        <div className="text-right mt-1">
                            <span className="text-xs text-green-500/60">CONNECTED_TO: </span>
                            <span className="text-xs text-green-400 font-bold">{serverIP}</span>
                        </div>
                    </div>
                )}

                {/* LOG STATUS (Trang trí) */}
                <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded text-xs text-cyan-400 font-mono">
                    {isConnected
                        ? `> LINK_ESTABLISHED | TARGET_LOCKED`
                        : `> NO_LINK | STANDBY_MODE`
                    }
                </div>
            </div>
        </div>
    );
};