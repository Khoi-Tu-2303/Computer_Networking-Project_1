import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Search, Zap, Loader2, Power, Wifi, WifiOff } from 'lucide-react';

export const AgentSelector: React.FC = () => {
    const {
        isConnected, isScanning, agents, selectedAgentId,
        selectAgent, startScan, connectToIp, serverIP, socket,
        showModal, disconnect // <--- 1. LẤY HÀM SHOWMODAL TỪ CONTEXT
    } = useSocket();

    const [manualIP, setManualIP] = useState("127.0.0.1");

    // Tự động chọn agent đầu tiên nếu có
    useEffect(() => {
        if (agents.length > 0 && !selectedAgentId) {
            selectAgent(agents[0].id);
        }
    }, [agents, selectedAgentId, selectAgent]);

    // Hàm xác nhận ngắt kết nối (Chạy khi bấm Confirm trên Modal)
    const performDisconnect = async () => {
        if (socket && isConnected) {
            try {
                await socket.stop();
                window.location.reload();
            } catch (error) {
                console.error("Lỗi khi ngắt kết nối:", error);
            }
        }
    };

    // Hàm xử lý khi bấm nút Terminate (Chỉ hiện Modal)
    // HÀM XỬ LÝ KHI BẤM CONFIRM (KHÔNG RELOAD)
    const handleConfirmDisconnect = async () => {
        await disconnect();
        // Sau khi chạy dòng này, isConnected = false -> Giao diện tự quay về màn nhập IP
    };

    // HÀM HIỆN MODAL HỎI
    const handleDisconnectClick = () => {
        showModal({
            type: 'warning',
            title: 'DISCONNECT?',
            message: 'Are you sure you want to close this session? You will return to the connection screen.',
            showCancel: true,
            onConfirm: handleConfirmDisconnect // Gọi hàm trên
        });
    };

    return (
        <div className="glass-panel p-6 rounded-lg relative overflow-hidden">

            {/* HEADER */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-bold text-cyan-500 neon-glow-cyan tracking-wider flex items-center gap-2">
                        {'> TARGET_CONTROL_'}
                    </h2>
                    <p className="text-[10px] text-cyan-500/50 font-mono mt-1">
                        // SECURE_UPLINK_V3.0
                    </p>
                </div>

                {/* TRẠNG THÁI STATUS BOX */}
                <div className={`flex flex-col items-end px-3 py-2 rounded border ${isConnected
                    ? 'bg-green-950/30 border-green-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-red-950/30 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    }`}>
                    <span className={`text-[10px] font-bold mb-1 ${isConnected ? 'text-green-500/70' : 'text-red-500/70'}`}>
                        STATUS:
                    </span>
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <>
                                <Wifi className="w-4 h-4 text-green-500 animate-pulse" />
                                <span className="text-xl font-black text-green-500 tracking-widest neon-glow-green">ONLINE</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4 text-red-500" />
                                <span className="text-xl font-black text-red-500 tracking-widest neon-glow-red">OFFLINE</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                {/* LOGIC HIỂN THỊ */}
                {!isConnected ? (
                    // --- GIAO DIỆN KHI CHƯA KẾT NỐI ---
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <label className="block text-cyan-500/60 text-xs font-bold mb-2 flex justify-between">
                            <span>{'// MANUAL_IP_ENTRY'}</span>
                            <span className="text-cyan-500/30">WAITING_FOR_INPUT...</span>
                        </label>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={manualIP}
                                onChange={(e) => setManualIP(e.target.value)}
                                placeholder="192.168.1.X"
                                className="flex-1 bg-black border border-cyan-500/30 text-cyan-500 px-4 py-3 rounded font-mono focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all placeholder:text-cyan-900"
                            />

                            <button
                                onClick={() => connectToIp(manualIP)}
                                className="group bg-cyan-950/30 border border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-500 px-6 py-3 rounded transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
                            >
                                <Zap className="w-4 h-4 group-hover:fill-current" />
                                <span className="font-bold text-sm">CONNECT</span>
                            </button>
                        </div>

                        {/* Scan Button */}
                        <div className="mt-3">
                            <button
                                onClick={() => startScan()}
                                disabled={isScanning}
                                className={`w-full border px-4 py-3 rounded transition-all duration-300 flex items-center justify-center gap-2 font-bold text-sm ${isScanning
                                    ? 'bg-yellow-950/20 border-yellow-500/30 text-yellow-500 cursor-wait'
                                    : 'bg-black border-cyan-500/30 text-cyan-500 hover:bg-cyan-950/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                                    }`}
                            >
                                {isScanning ? (
                                    <>
                                        <Loader2 className="animate-spin w-4 h-4" />
                                        <span>SCANNING_NETWORK_NODES...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4" />
                                        <span>AUTO_SCAN_LAN_DEVICES</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    // --- GIAO DIỆN KHI ĐÃ KẾT NỐI (ONLINE) ---
                    <div className="animate-in zoom-in-95 duration-300">
                        <div className="bg-green-950/10 border border-green-500/30 rounded p-4 mb-4">
                            <label className="block text-green-500/60 text-xs font-bold mb-2">
                                {'// ACTIVE_TARGET_ID'}
                            </label>

                            <select
                                className="w-full bg-black border border-green-500/50 px-4 py-3 rounded text-green-400 font-bold font-mono hover:bg-green-900/10 focus:outline-none focus:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                                value={selectedAgentId || ''}
                                onChange={(e) => selectAgent(e.target.value)}
                            >
                                {agents.map((agent) => (
                                    <option key={agent.id} value={agent.id}>
                                        TARGET: {agent.name}
                                    </option>
                                ))}
                            </select>

                            <div className="flex justify-between items-center mt-2 px-1">
                                <div className="text-[10px] text-green-500/50">
                                    SERVER_IP: <span className="text-green-400 font-mono">{serverIP}</span>
                                </div>
                                <div className="text-[10px] text-green-500/50 animate-pulse">
                                    ● UPLINK_STABLE
                                </div>
                            </div>
                        </div>

                        {/* --- NÚT DISCONNECT (ĐÃ SỬA GỌI MODAL) --- */}
                        <button
                            onClick={handleDisconnectClick}
                            className="w-full group bg-red-950/20 border border-red-500/30 hover:bg-red-500/10 text-red-500 px-4 py-3 rounded transition-all duration-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] flex items-center justify-center gap-2"
                        >
                            <Power className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-sm tracking-wider">TERMINATE_CONNECTION</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};