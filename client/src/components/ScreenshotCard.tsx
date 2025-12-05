import { useState, useEffect } from 'react';
import { Camera, Download, Maximize2, Loader2 } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';

export default function ScreenshotCard() {
    // --- PHẦN NÃO (LOGIC CŨ) ---
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { socket, isConnected } = useSocket();

    // Lắng nghe ảnh từ Server
    useEffect(() => {
        if (!socket) return;

        // 1. Trường hợp THÀNH CÔNG: Nhận được ảnh
        const handleReceiveImage = (base64String: string) => {
            setScreenshot(`data:image/png;base64,${base64String}`);
            setLoading(false); // <--- Tắt xoay vòng
        };

        // 2. Trường hợp THẤT BẠI: Nhận được báo lỗi (do Lock hoặc lỗi Server)
        const handleReceiveError = (errorMessage: string) => {
            setLoading(false); // <--- QUAN TRỌNG: Tắt xoay vòng ngay lập tức
            alert("❌ KHÔNG CHỤP ĐƯỢC ẢNH:\n" + errorMessage);
        };

        // Đăng ký sự kiện
        socket.on("ReceiveScreenshot", handleReceiveImage);
        socket.on("ReceiveScreenshotError", handleReceiveError);

        // Hủy đăng ký khi thoát
        return () => {
            socket.off("ReceiveScreenshot", handleReceiveImage);
            socket.off("ReceiveScreenshotError", handleReceiveError);
        };
    }, [socket]);

    const handleTakeScreenshot = async () => {
        if (!isConnected) {
            alert('Chưa kết nối tới Server!');
            return;
        }
        setLoading(true);
        setScreenshot(null); // Xóa ảnh cũ
        try {
            await sendCommand('take_screenshot');
        } catch (error: any) {
            setLoading(false);
            alert("Lỗi chụp: " + error.message);
        }
    };

    const handleDownload = () => {
        if (screenshot) {
            const link = document.createElement('a');
            link.href = screenshot;
            link.download = `screenshot_${Date.now()}.png`;
            link.click();
        }
    };

    // --- PHẦN ÁO (GIAO DIỆN BOLT.AI) ---
    return (
        <div className="glass-panel p-6 rounded-lg h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-cyan-500 neon-glow-cyan tracking-wider flex items-center gap-2">
                    <Camera className="w-5 h-5" /> {'> SCREEN_CAPTURE_'}
                </h2>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-ping' : 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]'}`} />
                    <span className="text-cyan-500 text-xs">{loading ? 'PROCESSING...' : 'READY'}</span>
                </div>
            </div>

            {/* Khung hiển thị ảnh (Terminal Window Style) */}
            <div className="terminal-window p-2 rounded-lg mb-4 relative group flex-1 bg-black min-h-[300px] flex items-center justify-center overflow-hidden">

                {screenshot ? (
                    // TRƯỜNG HỢP CÓ ẢNH
                    <div className="relative w-full h-full">
                        <img
                            src={screenshot}
                            alt="Remote Screen"
                            className="w-full h-full object-contain"
                        />
                        {/* Overlay thông tin ảnh */}
                        <div className="absolute top-2 left-2 bg-black/80 neon-border-cyan px-2 py-1 text-xs text-cyan-500 font-mono">
                            RAW_IMAGE
                        </div>
                        <button className="absolute top-2 right-2 bg-black/90 neon-border-cyan hover:bg-cyan-950/50 p-2 rounded opacity-0 group-hover:opacity-100 transition-all">
                            <Maximize2 className="w-4 h-4 text-cyan-500" />
                        </button>
                    </div>
                ) : (
                    // TRƯỜNG HỢP CHƯA CÓ ẢNH / ĐANG LOAD
                    <div className="text-center z-10">
                        {loading ? (
                            <div className="flex flex-col items-center">
                                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                                <p className="text-cyan-500/50 text-sm animate-pulse">{'>> RECEIVING_DATA_STREAM...'}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Camera className="w-16 h-16 text-green-500/20 mb-4" />
                                <p className="text-green-500/40 text-sm">{'// NO CAPTURE DATA'}</p>
                                <p className="text-green-500/20 text-xs mt-2">{'>> AWAITING COMMAND...'}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Hiệu ứng quét (Scan Line) */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-green-500/5 to-transparent opacity-20" />
            </div>

            {/* Các nút bấm */}
            <div className="flex gap-3">
                <button
                    onClick={handleTakeScreenshot}
                    disabled={loading || !isConnected}
                    className="flex-1 bg-black neon-border-cyan hover:bg-cyan-950/30 px-4 py-3 rounded transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Camera className="w-5 h-5 text-cyan-500" />
                    <span className="text-cyan-500 font-bold text-sm">CAPTURE</span>
                </button>

                <button
                    onClick={handleDownload}
                    disabled={!screenshot}
                    className="bg-black neon-border-green hover:bg-green-950/30 px-4 py-3 rounded transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Download Image"
                >
                    <Download className="w-5 h-5 text-green-500" />
                </button>
            </div>

            {/* Footer Info */}
            <div className="mt-4 p-2 bg-cyan-950/20 border border-cyan-500/30 rounded text-xs text-cyan-400 font-mono truncate">
                {screenshot
                    ? `> CAPTURE_SUCCESS | FORMAT: PNG | SIZE: ${(screenshot.length / 1024).toFixed(1)} KB`
                    : '> STATUS: IDLE | BUFFER_EMPTY'
                }
            </div>
        </div>
    );
}