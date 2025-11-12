import { Power, RotateCw, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
// 1. IMPORT HOOK VÀ SERVICE
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';

export default function PowerControls() {
    const [showConfirm, setShowConfirm] = useState<'shutdown' | 'restart' | null>(null);
    // 2. LẤY AGENT ID
    const { selectedAgentId, isConnected } = useSocket();

    // --- HÀM GỬI LỆNH (ĐÃ NÂNG CẤP) ---
    const handleShutdown = async () => {
        if (showConfirm === 'shutdown') {
            // 3. KIỂM TRA AGENT
            if (!selectedAgentId) {
                alert('Vui lòng chọn một Agent trước.');
                setShowConfirm(null);
                return;
            }

            try {
                // 4. GỌI API THẬT
                await sendCommand(selectedAgentId, 'system_shutdown');
                alert('Đã gửi lệnh Shutdown!');
            } catch (error: unknown) { // <-- 5. DÙNG UNKNOWN

                // 6. KIỂM TRA LỖI AN TOÀN
                let errorMessage = "Lỗi không xác định";
                if (error instanceof Error) {
                    errorMessage = error.message; // <-- Giờ TS mới cho phép
                }
                alert(`Lỗi khi gửi lệnh Shutdown: ${errorMessage}`);
            }
            setShowConfirm(null);
        } else {
            setShowConfirm('shutdown');
        }
    };

    // --- HÀM GỬI LỆNH (ĐÃ NÂNG CẤP) ---
    const handleRestart = async () => {
        if (showConfirm === 'restart') {
            // 3. KIỂM TRA AGENT
            if (!selectedAgentId) {
                alert('Vui lòng chọn một Agent trước.');
                setShowConfirm(null);
                return;
            }

            try {
                // 4. GỌI API THẬT
                await sendCommand(selectedAgentId, 'system_restart');
                alert('Đã gửi lệnh Restart!');
            } catch (error: unknown) { // <-- 5. DÙNG UNKNOWN

                // 6. KIỂM TRA LỖI AN TOÀN
                let errorMessage = "Lỗi không xác định";
                if (error instanceof Error) {
                    errorMessage = error.message;
                }
                alert(`Lỗi khi gửi lệnh Restart: ${errorMessage}`);
            }
            setShowConfirm(null);
        } else {
            setShowConfirm('restart');
        }
    };

    const handleCancel = () => {
        setShowConfirm(null);
    };

    const isDisabled = !selectedAgentId || !isConnected;

    return (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h2 className="text-xl font-bold text-red-800">System Power Controls</h2>
            </div>

            {/* (Phần UI xác nhận giữ nguyên) */}
            {showConfirm && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">
                        Are you sure you want to {showConfirm} the system? This action cannot be undone.
                    </p>
                </div>
            )}

            <div className="flex gap-3">
                {showConfirm ? (
                    <>
                        <button
                            onClick={showConfirm === 'shutdown' ? handleShutdown : handleRestart}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                        >
                            Confirm {showConfirm === 'shutdown' ? 'Shutdown' : 'Restart'}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                        >
                            Cancel
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={handleShutdown}
                            disabled={isDisabled} // THÊM DISABLED
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:bg-gray-400"
                        >
                            <Power className="w-5 h-5" />
                            Shutdown
                        </button>
                        <button
                            onClick={handleRestart}
                            disabled={isDisabled} // THÊM DISABLED
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold disabled:bg-gray-400"
                        >
                            <RotateCw className="w-5 h-5" />
                            Restart
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}