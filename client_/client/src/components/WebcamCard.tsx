import { useState, useEffect, useRef } from 'react';
import { Video, Download, StopCircle, WifiOff, RefreshCw, Circle, ShieldAlert, Lock } from 'lucide-react'; // Thêm ShieldAlert, Lock
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';

export default function WebcamCard() {
    // State quản lý Live Stream
    const [isStreaming, setIsStreaming] = useState(false);
    const [cameras, setCameras] = useState<string[]>([]);
    const [selectedCamIndex, setSelectedCamIndex] = useState<number>(0);
    const [isLoadingCameras, setIsLoadingCameras] = useState(false);

    // State quản lý Quay Video (Client-side)
    const [isRecording, setIsRecording] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

    // Lấy thêm isSystemLocked để xử lý vụ Tường lửa
    const { socket, isConnected, isSystemLocked } = useSocket();

    // Refs để xử lý vẽ và quay
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    // Dùng ref này để track trạng thái record trong useEffect (tránh stale state)
    const isRecordingRef = useRef(false);

    // 1. Khởi tạo Image Object
    useEffect(() => {
        imageRef.current = new Image();
    }, []);

    // 2. Lắng nghe Stream và Vẽ lên Canvas
    useEffect(() => {
        if (!socket) return;

        socket.on("ReceiveWebcamList", (camList: string[]) => {
            setCameras(camList);
            setIsLoadingCameras(false);
            if (camList.length > 0) setSelectedCamIndex(0);
        });

        socket.on("ReceiveWebcamFrame", (base64: string) => {
            // Nếu hệ thống đang bị khóa mà Server vẫn lỡ gửi frame tới thì lờ đi
            if (isSystemLocked) return;

            if (canvasRef.current && imageRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                const img = imageRef.current;

                img.src = `data:image/jpeg;base64,${base64}`;
                img.onload = () => {
                    if (canvas.width !== img.width) canvas.width = img.width;
                    if (canvas.height !== img.height) canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);
                };
            }
        });

        return () => {
            socket.off("ReceiveWebcamList");
            socket.off("ReceiveWebcamFrame");
        };
    }, [socket, isSystemLocked]);

    // --- 3. LOGIC TỰ ĐỘNG DỪNG KHI MẤT KẾT NỐI HOẶC BẬT TƯỜNG LỬA ---
    useEffect(() => {
        // Điều kiện kích hoạt: Mất kết nối HOẶC Hệ thống bị khóa
        if (!isConnected || isSystemLocked) {

            // Bước A: Nếu đang quay phim -> Dừng và Lưu file vào RAM
            if (isRecordingRef.current && mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                console.log("Phát hiện sự cố (Disconnect/Lock) -> Đang dừng Record...");
                mediaRecorderRef.current.stop(); // Cái này sẽ kích hoạt onstop bên dưới
            }

            // Bước B: Tắt trạng thái trên UI
            setIsRecording(false);
            isRecordingRef.current = false;
            setIsStreaming(false);

            // Bước C: Xóa trắng màn hình (Về No Signal)
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    }, [isConnected, isSystemLocked]);


    // 4. Logic Quay Video
    const startRecording = () => {
        if (!canvasRef.current) return;

        const stream = canvasRef.current.captureStream(25);
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        mediaRecorderRef.current = mediaRecorder;
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        // --- SỰ KIỆN QUAN TRỌNG: KHI STOP REC ---
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);

            // CHỈ LƯU URL VÀO STATE ĐỂ HIỆN NÚT DOWNLOAD
            // KHÔNG CÓ LỆNH a.click() NÊN SẼ KHÔNG TỰ TẢI
            setRecordedVideoUrl(url);

            setRecordedChunks([]);
            console.log("Video đã được xử lý và lưu vào bộ nhớ trình duyệt.");
        };

        mediaRecorder.start();
        setIsRecording(true);
        isRecordingRef.current = true; // Cập nhật ref
        // [ADD] Gửi log về server
        if (socket) socket.invoke("ReportClientActivity", "Started Recording Webcam Video").catch(e => { });
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop(); // Kích hoạt onstop -> Lưu file vào Browser
            setIsRecording(false);
            isRecordingRef.current = false;
            // [ADD] Gửi log về server
            if (socket) socket.invoke("ReportClientActivity", "Stopped Recording Webcam Video").catch(e => { });
        }
    };

    // 5. Logic Bật/Tắt Live Stream
    const toggleStreaming = async () => {
        if (!isConnected) return;

        // [BLOCK] Chặn nếu bị khóa
        if (isSystemLocked) return alert("⛔ Không thể bật Webcam: Hệ thống đang bị KHÓA!");

        if (isStreaming) {
            // Tắt Stream
            try {
                await sendCommand('stop_webcam');
            } catch (e) {
                console.warn("Lỗi gửi lệnh stop (có thể do server mất kết nối)", e);
            } finally {
                // Luôn thực hiện dọn dẹp Client
                if (isRecording) stopRecording();
                setIsStreaming(false);
                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
            }
        } else {
            // Bật Stream
            try {
                setRecordedVideoUrl(null); // Reset video cũ
                await sendCommand('start_webcam', selectedCamIndex);
                setIsStreaming(true);
            } catch (e) {
                console.error(e);
                alert("Không thể bật Camera. Kiểm tra kết nối hoặc Tường lửa.");
            }
        }
    };

    const handleDownloadVideo = () => {
        if (recordedVideoUrl) {
            const a = document.createElement('a');
            a.href = recordedVideoUrl;
            a.download = `recording_${new Date().getTime()}.webm`;
            a.click();
        }
    };

    // Tự động load danh sách cam khi vào
    useEffect(() => {
        if (isConnected && !isSystemLocked) { // [FIX] Chỉ load khi không khóa
            const getCams = async () => {
                try { await sendCommand('get_webcams'); } catch { }
            };
            getCams();
        }
    }, [isConnected, isSystemLocked]);

    return (
        <div className={`glass-panel p-6 rounded-lg h-full flex flex-col transition-colors duration-500 ${isSystemLocked ? 'bg-red-950/10 border-red-500/20' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold tracking-wider flex items-center gap-2 ${isSystemLocked ? 'text-red-500 neon-glow-red' : 'text-green-500 neon-glow-green'}`}>
                    <Video className="w-5 h-5" /> {'> WEBCAM_FEED_'}
                </h2>

                <div className="flex items-center gap-2">
                    {/* [ADD] Hiển thị trạng thái Locked */}
                    {isSystemLocked ? (
                        <div className="flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                            <ShieldAlert className="w-3 h-3 text-red-500" />
                            <span className="text-red-500 text-[10px] font-bold">LOCKED</span>
                        </div>
                    ) : (
                        <>
                            {isStreaming && (
                                <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-green-500 text-[10px] font-bold">LIVE</span>
                                </div>
                            )}

                            {isRecording ? (
                                <div className="flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 animate-pulse">
                                    <Circle className="w-2 h-2 fill-red-500 text-red-500" />
                                    <span className="text-red-500 text-[10px] font-bold">REC</span>
                                </div>
                            ) : (
                                !isStreaming && <span className="text-yellow-500 text-xs flex items-center gap-1">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full" /> STANDBY
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Dropdown & Refresh */}
            <div className="flex gap-2 mb-3">
                <select
                    className={`text-xs p-2 rounded flex-1 outline-none focus:border-green-500 transition-colors ${isSystemLocked
                            ? 'bg-red-950/20 border border-red-500/30 text-red-400 cursor-not-allowed'
                            : 'bg-black border border-green-500/30 text-green-500'
                        }`}
                    value={selectedCamIndex}
                    onChange={(e) => setSelectedCamIndex(Number(e.target.value))}
                    disabled={isStreaming || isSystemLocked}
                >
                    {isSystemLocked
                        ? <option>SYSTEM LOCKED - DEVICES HIDDEN</option>
                        : cameras.length === 0 ? <option value={0}>Scanning devices...</option> : cameras.map((cam, index) => <option key={index} value={index}>{cam}</option>)
                    }
                </select>
                <button
                    onClick={async () => { setIsLoadingCameras(true); try { await sendCommand('get_webcams'); } catch { } }}
                    disabled={isStreaming || isLoadingCameras || isSystemLocked}
                    className={`p-2 rounded transition-all disabled:opacity-50 ${isSystemLocked ? 'bg-red-950/20 border border-red-500/30 text-red-500' : 'bg-black border border-green-500/30 hover:bg-green-500/10 text-green-500'}`}
                >
                    {isSystemLocked ? <Lock className="w-4 h-4" /> : <RefreshCw className={`w-4 h-4 ${isLoadingCameras ? 'animate-spin' : ''}`} />}
                </button>
            </div>

            {/* Canvas Display */}
            <div className={`terminal-window p-2 rounded-lg mb-4 relative group flex-1 bg-black min-h-[200px] flex items-center justify-center overflow-hidden border ${isSystemLocked ? 'bg-red-950/5 border-red-500/20' : 'border-green-500/20'}`}>
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full object-contain ${!isStreaming ? 'hidden' : ''}`}
                />

                {!isStreaming && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
                        {isSystemLocked ? (
                            <>
                                <ShieldAlert className="w-16 h-16 text-red-500/50 mb-4 animate-pulse" />
                                <div className="text-2xl font-bold text-red-500/50 mb-2">SYSTEM LOCKED</div>
                                <p className="text-red-500/30 text-xs font-mono">ACCESS DENIED BY ADMINISTRATOR</p>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-12 h-12 text-red-500/20 mb-4" />
                                <div className="text-3xl font-bold text-red-500/20 mb-2">NO SIGNAL</div>
                                <p className="text-red-500/50 text-xs font-mono">
                                    {cameras.length > 0 ? `READY TO CONNECT: ${cameras[selectedCamIndex]}` : 'NO_DEVICE_FOUND'}
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Controls */}
            {/* Controls */}
            <div className="flex gap-2">
                <button
                    onClick={toggleStreaming}
                    // [FIX] Thêm !isConnected vào điều kiện disabled
                    disabled={!isConnected || cameras.length === 0 || (!isStreaming && isSystemLocked)}
                    className={`flex-1 px-3 py-3 rounded font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isSystemLocked
                            ? 'bg-red-950/20 text-red-500 border border-red-500/30'
                            : isStreaming
                                ? 'bg-red-950/30 text-red-500 border border-red-500/50 hover:bg-red-900/50'
                                : 'bg-green-950/30 text-green-500 border border-green-500/50 hover:bg-green-900/50'
                        }`}
                >
                    {/* [FIX] Thêm logic hiển thị chữ OFFLINE */}
                    {!isConnected ? (
                        <><Video size={18} /> START LIVE</>
                    ) : isSystemLocked ? (
                        <><Lock size={18} /> LOCKED</>
                    ) : isStreaming ? (
                        <><StopCircle size={18} /> STOP LIVE</>
                    ) : (
                        <><Video size={18} /> START LIVE</>
                    )}
                </button>

                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    // [FIX] Thêm !isConnected vào disabled của nút Record luôn cho chắc
                    disabled={!isConnected || !isStreaming || isSystemLocked}
                    className={`px-4 rounded font-bold flex items-center justify-center gap-2 transition-all ${(!isStreaming || !isConnected) ? 'opacity-30 cursor-not-allowed bg-gray-800' :
                            isRecording
                                ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_red]'
                                : 'bg-black border border-green-500/30 text-green-500 hover:bg-green-500/10'
                        }`}
                    title="Record Video"
                >
                    <Circle size={18} fill={isRecording ? "currentColor" : "none"} />
                    {isRecording ? "STOP REC" : "REC"}
                </button>

                {/* Nút Download giữ nguyên */}
                <button
                    onClick={handleDownloadVideo}
                    disabled={!recordedVideoUrl || isSystemLocked}
                    className={`px-4 rounded font-bold flex items-center justify-center transition-all ${recordedVideoUrl
                        ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-900/50 hover:shadow-[0_0_15px_cyan]'
                        : 'opacity-30 cursor-not-allowed bg-gray-800 border border-gray-700'
                        }`}
                    title="Download Recorded Video"
                >
                    <Download size={18} />
                </button>
            </div>

            {recordedVideoUrl && !isRecording && !isSystemLocked && (
                <div className="mt-2 text-[10px] text-cyan-500 text-center animate-bounce">
                    &gt;&gt; VIDEO PROCESSED. CLICK DOWNLOAD ICON TO SAVE.
                </div>
            )}
        </div>
    );
}