import { Power, RotateCw, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';

export default function PowerControls() {
    // --- PHẦN NÃO (LOGIC CŨ & TÍCH HỢP MODAL) ---
    const [showConfirm, setShowConfirm] = useState<'shutdown' | 'restart' | null>(null);

    // Lấy thêm hàm showModal từ Context để gọi thông báo đẹp
    const { isConnected, isSystemLocked, showModal } = useSocket();

    const handleShutdown = async () => {
        if (!isConnected) return;

        try {
            await sendCommand('shutdown');

            // Thay alert bằng showModal
            showModal({
                type: 'success', // Hoặc 'warning' nếu ông thích màu vàng
                title: 'COMMAND SENT',
                message: 'Lệnh TẮT MÁY (SHUTDOWN) đã được gửi thành công!',
                showCancel: false, // Chỉ cần nút đóng
            });

        } catch (error: any) {
            // Thay alert lỗi bằng showModal error
            showModal({
                type: 'error',
                title: 'COMMAND FAILED',
                message: "Lỗi gửi lệnh: " + error.message,
                showCancel: false,
            });
        }
        setShowConfirm(null);
    };

    const handleRestart = async () => {
        if (!isConnected) return;

        try {
            await sendCommand('restart');

            // Thay alert bằng showModal
            showModal({
                type: 'success',
                title: 'COMMAND SENT',
                message: 'Lệnh KHỞI ĐỘNG LẠI (RESTART) đã được gửi thành công!',
                showCancel: false,
            });

        } catch (error: any) {
            showModal({
                type: 'error',
                title: 'COMMAND FAILED',
                message: "Lỗi gửi lệnh: " + error.message,
                showCancel: false,
            });
        }
        setShowConfirm(null);
    };

    const isDisabled = !isConnected || isSystemLocked;

    // --- PHẦN ÁO (GIAO DIỆN BOLT.AI - GIỮ NGUYÊN) ---
    return (
        <div className="glass-panel p-6 rounded-lg h-full flex flex-col justify-center">

            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
                <h2 className="text-xl font-bold text-red-500 neon-glow-red tracking-wider">
                    [DANGER ZONE]
                </h2>
            </div>

            {/* Màn hình xác nhận (Khi bấm nút) */}
            {showConfirm ? (
                <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-6 text-center animate-pulse">
                    <p className="text-red-400 font-bold text-lg mb-2">Are you sure?</p>
                    <p className="text-red-300/70 text-sm mb-6">
                        This will immediately {showConfirm} the target machine.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={showConfirm === 'shutdown' ? handleShutdown : handleRestart}
                            className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded font-bold transition-all shadow-[0_0_15px_#ef4444]"
                        >
                            CONFIRM
                        </button>
                        <button
                            onClick={() => setShowConfirm(null)}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded font-bold transition-all"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            ) : (
                // Màn hình chính (2 nút to)
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nút SHUTDOWN */}
                    <button
                        onClick={() => setShowConfirm('shutdown')}
                        disabled={isDisabled}
                        className="group relative bg-black neon-border-red hover:bg-red-950/30 px-4 py-6 rounded-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <div className="flex flex-col items-center gap-3">
                            <Power className="w-12 h-12 text-red-500 group-hover:animate-pulse" />
                            <span className="text-red-500 text-lg font-bold tracking-wider neon-glow-red">
                                SHUTDOWN
                            </span>
                            <span className="text-red-500/60 text-xs">
                                {'// FORCE POWER OFF'}
                            </span>
                        </div>
                    </button>

                    {/* Nút RESTART */}
                    <button
                        onClick={() => setShowConfirm('restart')}
                        disabled={isDisabled}
                        className="group relative bg-black neon-border-red hover:bg-red-950/30 px-4 py-6 rounded-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <div className="flex flex-col items-center gap-3">
                            <RotateCw className="w-12 h-12 text-red-500 group-hover:animate-spin" />
                            <span className="text-red-500 text-lg font-bold tracking-wider neon-glow-red">
                                RESTART
                            </span>
                            <span className="text-red-500/60 text-xs">
                                {'// REBOOT SYSTEM'}
                            </span>
                        </div>
                    </button>
                </div>
            )}

            {!showConfirm && (
                <div className="mt-4 p-3 bg-red-950/20 border border-red-500/30 rounded text-xs text-red-400 text-center">
                    <span className="text-red-500 font-bold">WARNING:</span> Actions are irreversible.
                </div>
            )}
        </div>
    );
}