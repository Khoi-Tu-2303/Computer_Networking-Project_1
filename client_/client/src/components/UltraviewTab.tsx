import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, MousePointer2, X, Ban, Keyboard, Maximize, ShieldAlert } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';

export default function UltraviewTab() {
    const { socket, isConnected, isSystemLocked } = useSocket();

    // State
    const [isStreaming, setIsStreaming] = useState(false);
    const [isMouseEnabled, setIsMouseEnabled] = useState(false);
    const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(false);
    const [resolution, setResolution] = useState("CONNECTING...");

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const lastSentRef = useRef(0);
    const streamActiveRef = useRef(false);

    // Khởi tạo Image Object 1 lần
    useEffect(() => {
        imageRef.current = new Image();
        return () => {
            imageRef.current = null;
        };
    }, []);

    // Cập nhật ref trạng thái
    useEffect(() => {
        streamActiveRef.current = isStreaming;
    }, [isStreaming]);

    // 1. Hàm Stop Remote
    const stopRemote = useCallback(async () => {
        try {
            await sendCommand('stop_screenshare');
        } catch (e) {
            console.error("Stop error:", e);
        }
        setIsStreaming(false);
        setIsMouseEnabled(false);
        setIsKeyboardEnabled(false);
        setResolution("CONNECTING...");
    }, []);

    // 2. Auto Stop
    useEffect(() => {
        if ((isSystemLocked || !isConnected) && isStreaming) {
            console.warn("🔒 System Locked/Disconnected -> Stopping UltraView...");
            stopRemote();
            if (isSystemLocked) alert("⛔ Phiên làm việc bị ngắt do hệ thống bật chế độ KHÓA!");
        }
    }, [isSystemLocked, isConnected, isStreaming, stopRemote]);

    // ==========================================================
    // 3. CORE: XỬ LÝ NHẬN ẢNH (ĐÃ SỬA LỖI MÀN HÌNH ĐEN)
    // ==========================================================
    useEffect(() => {
        if (!socket || !isConnected || !isStreaming) return;

        console.log("🟢 Bắt đầu lắng nghe sự kiện ảnh...");

        const handleFrame = (data: string) => {
            // [DEBUG] Kiểm tra dữ liệu đến
            // console.log("📦 Frame size:", data ? data.length : 0); 

            if (!data || !imageRef.current || !canvasRef.current) return;

            const img = imageRef.current;
            const canvas = canvasRef.current;
            // Lưu ý: Một số trình duyệt cũ có thể gặp lỗi với alpha: false, nếu vẫn lỗi hãy thử bỏ { alpha: false }
            const ctx = canvas.getContext('2d', { alpha: false });

            img.onload = () => {
                if (!canvas || !ctx) return;

                // Chỉ resize khi kích thước thật thay đổi
                if (canvas.width !== img.width || canvas.height !== img.height) {
                    // [DEBUG] Cập nhật độ phân giải
                    console.log(`📏 Resize Canvas: ${img.width}x${img.height}`);
                    canvas.width = img.width;
                    canvas.height = img.height;
                    setResolution(`${img.width}x${img.height}`);
                }

                ctx.drawImage(img, 0, 0);
            };

            img.onerror = (e) => {
                console.error("❌ Lỗi load ảnh (Base64 hỏng):", e);
            };

            // [FIX QUAN TRỌNG] Kiểm tra xem chuỗi đã có prefix chưa để tránh nối thừa
            if (data.startsWith('data:image')) {
                img.src = data;
            } else {
                img.src = `data:image/jpeg;base64,${data}`;
            }
        };

        const handleCursor = (data: any) => {
            // Xử lý cursor ảo (nếu cần)
        };

        socket.on("ReceiveScreenFrame", handleFrame);
        socket.on("UpdateVirtualCursor", handleCursor);

        return () => {
            socket.off("ReceiveScreenFrame", handleFrame);
            socket.off("UpdateVirtualCursor", handleCursor);
        };
    }, [socket, isStreaming, isConnected]);

    // 4. Start Remote
    const startRemote = async () => {
        if (isSystemLocked) return alert("⛔ Không thể bắt đầu: Hệ thống đang bị KHÓA!");
        try {
            await sendCommand('start_screenshare');
            setIsStreaming(true);
        } catch (error) {
            console.error(error);
            alert("Lỗi start remote!");
        }
    };

    // 5. Mouse Logic
    const getScaledCoordinates = (e: React.MouseEvent) => {
        if (!canvasRef.current) return null;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Tránh chia cho 0
        if (rect.width === 0 || rect.height === 0) return null;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        return {
            x: Math.round(Math.max(0, Math.min(x, canvas.width))),
            y: Math.round(Math.max(0, Math.min(y, canvas.height)))
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isMouseEnabled || !canvasRef.current) return;
        const now = Date.now();
        if (now - lastSentRef.current < 30) return;
        lastSentRef.current = now;

        const coords = getScaledCoordinates(e);
        if (coords) sendCommand('remote_mousemove', coords);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isMouseEnabled) return;
        const btn = e.button === 0 ? 'left' : (e.button === 2 ? 'right' : (e.button === 1 ? 'middle' : ''));
        if (btn) sendCommand('remote_mousedown', btn);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!isMouseEnabled) return;
        const btn = e.button === 0 ? 'left' : (e.button === 2 ? 'right' : (e.button === 1 ? 'middle' : ''));
        if (btn) sendCommand('remote_mouseup', btn);
    };

    // 6. Keyboard Logic
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!streamActiveRef.current || !isKeyboardEnabled) return;
            if (!['F5', 'F12', 'r'].includes(e.key) || !e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
            }
            sendCommand('remote_keydown', e.keyCode || e.which);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (!streamActiveRef.current || !isKeyboardEnabled) return;
            e.preventDefault();
            sendCommand('remote_keyup', e.keyCode || e.which);
        };

        const handleBlur = () => {
            if (streamActiveRef.current && isKeyboardEnabled) sendCommand('reset_keys');
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, [isKeyboardEnabled]);

    // 7. Scroll Logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onWheel = (e: WheelEvent) => {
            if (!isMouseEnabled) return;
            e.preventDefault();
            sendCommand('remote_scroll', { deltaY: e.deltaY });
        };
        canvas.addEventListener('wheel', onWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', onWheel);
    }, [isMouseEnabled, isStreaming]);

    return (
        <div className="h-full flex items-center justify-center p-4">
            {!isStreaming && (
                <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="relative inline-block">
                        {isSystemLocked ? (
                            <ShieldAlert size={60} className="text-red-500/50 mx-auto animate-pulse" />
                        ) : (
                            <Monitor size={60} className="text-green-500/20 mx-auto" />
                        )}
                        {!isSystemLocked && <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />}
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold tracking-wider ${isSystemLocked ? 'text-red-500' : 'text-green-500'}`}>
                            {isSystemLocked ? 'ACCESS DENIED' : 'REMOTE DESKTOP'}
                        </h3>
                        <p className={`text-xs font-mono ${isSystemLocked ? 'text-red-400' : 'text-gray-500'}`}>
                            {isSystemLocked ? 'System Firewall is Active' : 'Ready to establish connection...'}
                        </p>
                    </div>
                    <button
                        onClick={startRemote}
                        disabled={!socket || !isConnected || isSystemLocked}
                        className={`group relative px-6 py-3 border font-bold tracking-widest text-sm rounded transition-all duration-300 
                            ${isSystemLocked
                                ? 'bg-red-950/20 border-red-500/30 text-red-500 cursor-not-allowed'
                                : (!socket || !isConnected)
                                    ? 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
                                    : 'bg-black border-green-500 text-green-500 hover:bg-green-500 hover:text-black shadow-[0_0_15px_rgba(34,197,94,0.2)] active:scale-95'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            {isSystemLocked ? <ShieldAlert size={16} /> : <Maximize size={16} />}
                            {isSystemLocked
                                ? "LOCKED"
                                : (!isConnected ? "OFFLINE" : (!socket ? "CONNECTING..." : "OPEN SESSION"))}
                        </span>
                    </button>
                </div>
            )}

            {isStreaming && createPortal(
                <div className="fixed inset-0 z-[99999] bg-black flex flex-col animate-in fade-in duration-200">
                    <div className="h-12 bg-gray-900 border-b border-green-500/30 flex items-center justify-between px-4 shadow-2xl flex-shrink-0 z-50">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-green-500 font-bold tracking-wider text-sm">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]" />
                                LIVE REMOTING
                            </div>
                            <span className="text-xs text-gray-500 font-mono border-l border-gray-700 pl-3 hidden sm:block">
                                RES: {resolution}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsMouseEnabled(p => !p)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border transition-all ${isMouseEnabled ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}
                            >
                                {isMouseEnabled ? <MousePointer2 size={14} /> : <Ban size={14} />} MOUSE
                            </button>
                            <button
                                onClick={() => setIsKeyboardEnabled(p => !p)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border transition-all ${isKeyboardEnabled ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}
                            >
                                {isKeyboardEnabled ? <Keyboard size={14} /> : <Ban size={14} />} KEYS
                            </button>
                            <div className="w-px h-6 bg-gray-700 mx-1"></div>
                            <button
                                onClick={stopRemote}
                                className="flex items-center gap-1 bg-red-600/90 hover:bg-red-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg"
                            >
                                <X size={14} /> CLOSE
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative select-none">
                        <canvas
                            ref={canvasRef}
                            onMouseMove={handleMouseMove}
                            onMouseDown={handleMouseDown}
                            onMouseUp={handleMouseUp}
                            onContextMenu={(e) => e.preventDefault()}
                            className="shadow-2xl bg-black"
                            style={{
                                cursor: isMouseEnabled ? 'none' : 'default',
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain'
                            }}
                        />
                        {isMouseEnabled && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-1 rounded-full text-[10px] font-bold pointer-events-none shadow-lg backdrop-blur-sm z-50 animate-bounce">
                                MOUSE CONTROL ACTIVE
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}