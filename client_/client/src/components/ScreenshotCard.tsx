import { useState, useEffect, useRef } from 'react';
import { Camera, Download, Loader2, Monitor, Image as ImageIcon, ShieldAlert } from 'lucide-react'; // Thêm icon ShieldAlert
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';
import UltraviewTab from './UltraviewTab';
import Tabs from './Tabs';

// ==============================================================================
// COMPONENT CON: SINGLE SHOT TAB (ĐÃ FIX LOGIC LOADING)
// ==============================================================================
const SingleShotTab = () => {
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { socket, isConnected, isSystemLocked } = useSocket(); // Lấy thêm isSystemLocked

    const timeoutRef = useRef<any>(null);

    // 1. Nếu hệ thống bị khóa khi đang loading -> Hủy ngay lập tức
    useEffect(() => {
        if (isSystemLocked && loading) {
            console.warn("🔒 Hệ thống bị khóa đột ngột -> Hủy Capture.");
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setLoading(false);
            alert("❌ Tác vụ bị hủy do Server bật chế độ KHÓA (Firewall)!");
        }
    }, [isSystemLocked, loading]);

    useEffect(() => {
        if (!socket) return;

        const handleReceiveImage = (base64String: string) => {
            console.log("📸 [Client] Đã nhận ảnh!");
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            // Set state an toàn
            setScreenshot(`data:image/png;base64,${base64String}`);
            setLoading(false);
        };

        const handleReceiveError = (errorMessage: string) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setLoading(false);

            // Nếu lỗi do bị lock thì báo kiểu khác cho dễ hiểu
            if (errorMessage.includes("LOCKED") || errorMessage.includes("khóa")) {
                alert("⛔ BỊ CHẶN: Server đang bật chế độ bảo vệ (System Lock).");
            } else {
                alert("❌ Lỗi Server: " + errorMessage);
            }
        };

        socket.on("ReceiveScreenshot", handleReceiveImage);
        socket.on("ReceiveScreenshotError", handleReceiveError);

        return () => {
            socket.off("ReceiveScreenshot", handleReceiveImage);
            socket.off("ReceiveScreenshotError", handleReceiveError);
        };
    }, [socket]);

    // Dọn dẹp khi unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleTakeScreenshot = async () => {
        if (!isConnected) return alert('Mất kết nối tới Server!');

        // Check khóa trước khi gửi
        if (isSystemLocked) return alert("⛔ Không thể chụp: Hệ thống đang bị KHÓA!");

        setLoading(true);
        setScreenshot(null);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Timeout 10s: Nếu server im lìm (do lag hoặc crash) thì tự hủy
        timeoutRef.current = setTimeout(() => {
            setLoading((curr) => {
                if (curr) {
                    alert("⚠️ Hết thời gian chờ (10s)! Server không phản hồi.");
                    return false;
                }
                return curr;
            });
        }, 10000);

        try {
            await sendCommand('take_screenshot');
        } catch (e: any) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setLoading(false);
            alert("Lỗi gửi lệnh: " + e.message);
        }
    };

    const handleDownload = () => {
        if (screenshot) {
            const link = document.createElement('a');
            link.href = screenshot;
            link.download = `capture_${Date.now()}.png`;
            link.click();
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Vùng hiển thị */}
            <div className="terminal-window p-2 rounded-lg mb-4 relative flex-1 bg-black min-h-[300px] flex items-center justify-center overflow-hidden border border-green-500/20">
                {screenshot ? (
                    <div className="relative w-full h-full group animate-in fade-in zoom-in duration-300">
                        <img src={screenshot} alt="Capture" className="w-full h-full object-contain" />
                        <div className="absolute top-2 left-2 bg-black/80 text-cyan-500 text-[10px] px-2 border border-cyan-500/50">RAW_PNG</div>
                        <button
                            onClick={() => setScreenshot(null)}
                            className="absolute top-2 right-2 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            &times;
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        {loading ? (
                            <div className="flex flex-col items-center">
                                <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-2" />
                                <span className="text-[10px] text-cyan-500/50 animate-pulse">WAITING FOR SERVER...</span>
                            </div>
                        ) : (
                            <div className={`flex flex-col items-center ${isSystemLocked ? 'text-red-500/50' : 'text-green-500/30'}`}>
                                {isSystemLocked ? <ShieldAlert size={48} className="mb-2 opacity-50" /> : <Camera size={48} className="mb-2 opacity-50" />}
                                <span className="text-xs">{isSystemLocked ? 'SYSTEM LOCKED' : 'READY TO CAPTURE'}</span>
                            </div>
                        )}
                    </div>
                )}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
            </div>

            {/* Nút bấm */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={handleTakeScreenshot}
                    disabled={loading || !isConnected || isSystemLocked} // Disable luôn nếu bị Lock
                    className={`flex-1 py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                        ${isSystemLocked
                            ? 'bg-red-950/30 text-red-500 border border-red-500/50' // Style đỏ khi bị Lock
                            : 'bg-cyan-950/30 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-900/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        }
                    `}
                >
                    {isSystemLocked ? <ShieldAlert size={14} /> : <Camera size={14} />}
                    {isSystemLocked ? 'LOCKED BY SERVER' : (loading ? 'CAPTURING...' : 'CAPTURE SCREEN')}
                </button>

                <button
                    onClick={handleDownload}
                    disabled={!screenshot}
                    className="px-4 bg-green-950/30 text-green-400 border border-green-500/50 hover:bg-green-900/50 rounded transition-all disabled:opacity-30"
                >
                    <Download size={14} />
                </button>
            </div>

            {/* Footer */}
            <div className={`p-2 border rounded text-xs font-mono truncate ${isSystemLocked ? 'bg-red-950/20 border-red-500/30 text-red-400' : 'bg-cyan-950/20 border-cyan-500/30 text-cyan-400'}`}>
                {screenshot
                    ? `> CAPTURE_SUCCESS | SIZE: ${(screenshot.length / 1024).toFixed(1)} KB`
                    : isSystemLocked
                        ? '> STATUS: BLOCKED | SERVER_FIREWALL_ACTIVE'
                        : loading ? '> STATUS: SENDING REQUEST TO HOST...' : '> STATUS: IDLE | BUFFER_EMPTY'
                }
            </div>
        </div>
    );
};

// ==============================================================================

export default function ScreenshotCard() {
    const [activeTab, setActiveTab] = useState('single');
    const { isSystemLocked } = useSocket();

    const tabData = [
        {
            id: 'single',
            label: 'SNAPSHOT',
            // Đổi text-cyan-400 -> text-green-400
            icon: <ImageIcon size={14} className={isSystemLocked ? "text-red-500" : (activeTab === 'single' ? "text-green-400" : "")} />,
            content: <SingleShotTab />
        },
        {
            id: 'ultraview',
            label: 'ULTRA VIEW',
            icon: <Monitor size={14} className={isSystemLocked ? "text-red-500" : (activeTab === 'ultraview' ? "text-green-400" : "")} />,
            content: <UltraviewTab />
        }
    ];

    return (
        <div className={`glass-panel p-4 rounded-lg h-full flex flex-col transition-colors duration-500 ${isSystemLocked ? 'bg-red-950/10 border-red-500/20' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h2 className={`text-lg font-bold tracking-wider flex items-center gap-2 transition-colors duration-300 ${isSystemLocked
                        ? 'text-red-500 neon-glow-red' // Lock -> Đỏ
                        : 'text-green-500 neon-glow-green' // Bình thường -> Luôn Xanh Lá (theo yêu cầu)
                    }`}>
                    {isSystemLocked ? <ShieldAlert className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    {'> SCREEN_CONTROL_'}
                </h2>

                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] ${isSystemLocked
                            ? 'bg-red-500 text-red-500 animate-pulse'
                            : (activeTab === 'single' ? 'bg-cyan-500 text-cyan-500' : 'bg-green-500 text-green-500')
                        }`} />
                    <span className={`text-[10px] font-mono ${isSystemLocked ? 'text-red-500 font-bold' : (activeTab === 'single' ? 'text-cyan-500/70' : 'text-green-500/70')
                        }`}>
                        {isSystemLocked ? 'SYSTEM LOCKED' : (activeTab === 'single' ? 'MODE: STATIC' : 'MODE: LIVE')}
                    </span>
                </div>
            </div>

            {/* Component Tabs - Truyền isLocked xuống */}
            <Tabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={tabData}
                isLocked={isSystemLocked} // <--- QUAN TRỌNG
            />
        </div>
    );
}