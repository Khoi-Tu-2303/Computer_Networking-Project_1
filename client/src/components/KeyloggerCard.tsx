import React, { useState, useEffect, useRef } from 'react';
import { Keyboard, Play, Square } from 'lucide-react';

// Định nghĩa kiểu dữ liệu cho một log (chỉ dùng nội bộ)
interface KeylogEntry {
    id: string;
    timestamp: string;
    key: string;
}

/**
 * Component hiển thị card "Keylogger" (dạng giả lập)
 * SỬA LỖI: Thêm "Cuộn Thông Minh" (Smart Scrolling)
 */
export default function KeyloggerCard() {
    const [isLogging, setIsLogging] = useState(false);
    const [logs, setLogs] = useState<KeylogEntry[]>([]);

    // 1. Thêm ref cho div BÊN NGOÀI (div cuộn)
    const logsContainerRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Dữ liệu giả lập
    const mockKeys = ['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd', '[Enter]', 't', 'h', 'i', 's', ' ', 'i', 's', ' ', 'a', ' ', 's', 'i', 'm', 'u', 'l', 'a', 't', 'i', 'o', 'n', '.'];
    let keyIndex = 0;

    // Effect để chạy/dừng việc "gõ phím" giả lập
    useEffect(() => {
        if (isLogging) {
            intervalRef.current = setInterval(() => {

                // 2. Logic "cuộn thông minh"
                const container = logsContainerRef.current;
                let shouldScroll = false;
                if (container) {
                    // 2a. Kiểm tra xem user có đang ở đáy hay không (cho 20px "lệch" để an toàn)
                    const atBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) <= 20;
                    if (atBottom) {
                        shouldScroll = true;
                    }
                }

                // 2b. Thêm log mới
                const newLog: KeylogEntry = {
                    id: Date.now().toString(),
                    timestamp: new Date().toLocaleTimeString(),
                    key: mockKeys[keyIndex % mockKeys.length],
                };
                keyIndex++;
                setLogs((prev) => [...prev, newLog]);

                // 2c. Chỉ cuộn *nếu* user đang ở đáy (để không làm phiền khi user đang cuộn lên xem)
                if (shouldScroll && container) {
                    // 2d. Dùng setTimeout 0ms để chờ DOM cập nhật (log mới được render) rồi mới cuộn
                    setTimeout(() => {
                        container.scrollTop = container.scrollHeight; // Cuộn thẳng xuống đáy
                    }, 0);
                }

            }, 500); // Gõ 1 phím mỗi 500ms
        } else {
            // Dừng gõ
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        // Dọn dẹp khi component bị unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isLogging]); // 3. Chỉ phụ thuộc vào isLogging

    // 4. XÓA BỎ useEffect cuộn tự động cũ
    // useEffect(() => {
    //   logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // }, [logs]);

    const handleStartLogging = () => {
        setIsLogging(true);
    };

    const handleStopLogging = () => {
        setIsLogging(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Keylogger (Simulation)
            </h3>

            <div className="flex gap-2 mb-4">
                {/* (Nút Start) */}
                <button
                    onClick={handleStartLogging}
                    disabled={isLogging}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Play className="w-4 h-4" />
                    Start Logging
                </button>
                {/* (Nút Stop) */}
                <button
                    onClick={handleStopLogging}
                    disabled={!isLogging}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Square className="w-4 h-4" />
                    Stop Logging
                </button>
            </div>

            {/* Màn hình terminal giả lập */}
            {/* 5. GÁN REF cho div cuộn */}
            <div
                ref={logsContainerRef}
                className="bg-gray-900 rounded-lg p-4 h-[300px] overflow-y-auto font-mono text-sm"
            >
                {logs.length === 0 ? (
                    <p className="text-gray-500">Bấm "Start Logging" để xem mô phỏng...</p>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="text-green-400 mb-1">
                            [{log.timestamp}] {log.key}
                        </div>
                    ))
                )}
                {/* 6. XÓA BỎ div logsEndRef */}
            </div>

            {isLogging && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                    Logging active (Simulation)
                </div>
            )}
        </div>
    );
}