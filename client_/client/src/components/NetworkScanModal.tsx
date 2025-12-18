import { useState, useEffect, useRef } from 'react';
import { Wifi, Search, X, Check, Server, AlertTriangle, Loader2, Ban } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

export default function NetworkScanModal() {
    // Lấy thêm hàm stopScan
    const { isScanModalOpen, scanSuggestion, confirmScan, cancelScan, stopScan, isScanning, scanError } = useSocket();
    const [ipInput, setIpInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isScanModalOpen) {
            setIpInput(scanSuggestion || "192.168.1");
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isScanModalOpen, scanSuggestion]);

    // Xử lý logic nút bên phải
    const handleRightButton = (e: React.FormEvent) => {
        e.preventDefault();
        if (isScanning) {
            stopScan(); // Nếu đang chạy -> Dừng
        } else {
            if (ipInput.trim()) confirmScan(ipInput.trim()); // Nếu đang dừng -> Chạy
        }
    };

    if (!isScanModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-gray-900 border border-green-500/50 rounded-lg shadow-[0_0_50px_rgba(34,197,94,0.15)] relative overflow-hidden">
                {/* Header */}
                <div className="bg-black/50 p-4 border-b border-green-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-500 font-bold font-mono tracking-wider">
                        <Wifi className="w-5 h-5 animate-pulse" />
                        NETWORK_SCANNER_V2.0
                    </div>
                    {/* Nút X: Đóng Modal (Giống nút Cancel bên dưới) */}
                    <button onClick={cancelScan} className="text-gray-500 hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 font-mono">
                    {scanError ? (
                        <div className="bg-red-900/20 border border-red-500/50 p-4 rounded mb-6 flex gap-3 items-center animate-in slide-in-from-top-2">
                            <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                            <div>
                                <h3 className="text-red-500 font-bold text-sm">STATUS REPORT</h3>
                                <p className="text-[10px] text-red-400">{scanError}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-green-500/10 rounded border border-green-500/30">
                                <Server className={`w-8 h-8 text-green-400 ${isScanning ? 'animate-pulse' : ''}`} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold mb-1">
                                    {isScanning ? "SCANNING NETWORK..." : "SCAN LOCAL NETWORK"}
                                </h3>
                                <p className="text-xs text-gray-400">
                                    {isScanning
                                        ? "Probe sent. Awaiting response from nodes..."
                                        : (scanSuggestion ? "✅ SYSTEM DETECTED LOCAL IP RANGE." : "⚠️ AUTO-DETECTION FAILED.")}
                                </p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleRightButton} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-green-500/70 uppercase tracking-widest pl-1">Target IP Range</label>
                            <div className="relative group">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={ipInput}
                                    onChange={(e) => setIpInput(e.target.value)}
                                    placeholder="e.g. 192.168.1"
                                    disabled={isScanning}
                                    className="w-full bg-black border border-green-500/30 rounded p-3 pl-10 text-green-400 font-bold focus:outline-none focus:border-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <Search className="absolute left-3 top-3.5 w-4 h-4 text-green-600" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            {/* Nút Trái: CLOSE / CANCEL (Chỉ đóng bảng) */}
                            <button
                                type="button"
                                onClick={cancelScan}
                                className="flex-1 py-3 border border-red-500/30 text-red-500/80 rounded hover:bg-red-500/10 hover:border-red-500 transition-all font-bold text-xs"
                            >
                                CLOSE
                            </button>

                            {/* Nút Phải: Logic kép (STOP hoặc START) */}
                            <button
                                type="submit"
                                className={`flex-[2] py-3 border rounded transition-all font-bold text-xs flex items-center justify-center gap-2 ${isScanning
                                        ? 'bg-yellow-900/20 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black'
                                        : 'bg-green-600/20 border-green-500 text-green-400 hover:bg-green-500 hover:text-black'
                                    }`}
                            >
                                {isScanning ? (
                                    <>
                                        <Ban size={16} /> STOP SCAN
                                    </>
                                ) : (
                                    <>
                                        {scanError ? <Wifi size={16} /> : <Check size={16} />}
                                        {scanError ? 'RETRY SCAN' : 'INITIATE SCAN'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-black/80 p-2 text-center border-t border-green-500/20">
                    <span className="text-[9px] text-green-500/30 font-mono">SECURE_UPLINK // PROTOCOL: SIGNALR</span>
                </div>
            </div>
        </div>
    );
}