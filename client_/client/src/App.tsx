import { Terminal, ShieldCheck, Activity } from 'lucide-react';
import PowerControls from './components/PowerControls';
import ProcessManager from './components/ProcessManager';
import ScreenshotCard from './components/ScreenshotCard';
import KeyloggerCard from './components/KeyloggerCard';
import { AgentSelector } from './components/AgentSelector';
import { useSocket } from './contexts/SocketContext';
import WebcamCard from './components/WebcamCard';
import NetworkScanModal from './components/NetworkScanModal';

// 👇 1. IMPORT CÁI NÀY VÀO (QUAN TRỌNG)
import GlobalModal from './components/GlobalModal';

function App() {
    const { isSystemLocked, isConnected } = useSocket();

    return (
        <div className="min-h-screen bg-black bg-grid-pattern scan-line text-green-500 font-mono selection:bg-green-900 selection:text-white flex flex-col">

            {/* --- HEADER (GIỮ NGUYÊN) --- */}
            <header className="border-b border-green-500/30 bg-black/80 backdrop-blur-md sticky top-0 z-50 shadow-[0_5px_20px_rgba(0,0,0,0.5)]">
                <div className="container mx-auto px-4 py-4 lg:px-6 lg:py-6">
                    <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
                        {/* CỤM LOGO & TIÊU ĐỀ */}
                        <div className="flex items-center gap-5">
                            <div className="p-4 border-2 border-green-500 rounded-lg bg-green-900/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                <Terminal className="w-10 h-10 text-green-400 animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-4xl md:text-5xl font-black text-white text-shadow-neon tracking-tighter leading-none">
                                    REMOTE<span className="text-green-500">CONTROL</span>
                                </h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded border border-green-500/30 font-bold">
                                        v3.0-STABLE
                                    </span>
                                    <p className="hidden sm:block text-xs text-gray-500 font-mono tracking-[0.3em] uppercase">
                                        SECURE UPLINK ESTABLISHED
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* AGENT SELECTOR */}
                        <div className="w-full lg:flex-1">
                            <div className="p-1.5 border border-green-500/30 rounded-xl bg-black/60 backdrop-blur shadow-inner w-full">
                                <AgentSelector />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="container mx-auto px-6 py-8 flex-1 flex flex-col gap-6">

                {/* Banner trạng thái */}
                <div className="flex justify-between items-center p-3 bg-green-950/20 border-y border-green-500/30 text-sm text-green-400/80">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} />
                        <span className="hidden sm:inline">SECURITY_LEVEL:</span>
                        <span className="text-white font-bold">MAXIMUM</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity size={16} className="animate-spin" />
                        <span className="hidden sm:inline">SYSTEM_MONITORING:</span>
                        <span className="text-green-300 font-bold">ACTIVE</span>
                    </div>
                </div>

                {/* HÀNG 1: Power & Keylogger */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-panel p-1 rounded-xl border border-green-500/20">
                        <div className="bg-black/40 p-4 rounded-lg h-full">
                            <PowerControls />
                        </div>
                    </div>

                    <div className="glass-panel p-1 rounded-xl border border-green-500/20">
                        <div className="bg-black/40 p-4 rounded-lg h-full">
                            <KeyloggerCard />
                        </div>
                    </div>
                </div>

                {/* HÀNG 2: Screenshot & Webcam */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-panel p-1 rounded-xl border border-green-500/20">
                        <div className="bg-black/40 p-4 rounded-lg h-full">
                            <ScreenshotCard />
                        </div>
                    </div>

                    <div className="glass-panel p-1 rounded-xl border border-green-500/20">
                        <div className="bg-black/40 p-4 rounded-lg h-full">
                            <WebcamCard />
                        </div>
                    </div>
                </div>

                {/* HÀNG 3: Process Manager */}
                <div className="glass-panel p-1 rounded-xl border border-green-500/20 mt-auto">
                    <div className="bg-black/40 p-4 rounded-lg">
                        <ProcessManager />
                    </div>
                </div>

            </main>

            {/* --- FOOTER --- */}
            <footer className="border-t border-green-500/20 bg-black/90 py-4 mt-8">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-600 font-mono tracking-widest">
                    <div>
                        SYSTEM_ID: <span className="text-green-700">CL-8821-X</span> | LATENCY: 24ms
                    </div>
                    <div>
                        {'// UNAUTHORIZED ACCESS IS PROHIBITED //'}
                    </div>
                </div>
            </footer>

            {/* 👇 2. ĐẶT COMPONENT VÀO ĐÂY NÓ MỚI HIỆN NHA */}
            <NetworkScanModal />
            <GlobalModal />

        </div>
    );
}

export default App;