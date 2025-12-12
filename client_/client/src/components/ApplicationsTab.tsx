import React, { useState } from 'react';
import { Play, Terminal, Trash2, RefreshCw, Cpu, Activity } from 'lucide-react';
import { sendCommand } from '../services/socketService';
import { ProcessInfo } from './ProcessManager';

interface Props {
    allProcesses: ProcessInfo[];
    onRefresh: () => void;
}

const commonApps = [
    { value: "notepad.exe", label: "Notepad" },
    { value: "calc.exe", label: "Calculator" },
    { value: "cmd.exe", label: "Command Prompt" },
    { value: "explorer.exe", label: "Explorer" },
    { value: "chrome.exe", label: "Chrome" },
];

// ĐÃ XÓA HÀM FAKE DATA

export function ApplicationsTab({ allProcesses, onRefresh }: Props) {
    const [newAppName, setNewAppName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const applications = allProcesses.filter(p => p.type === 'APP');

    const handleStartApp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAppName.trim()) return;
        setIsLoading(true);
        try {
            await sendCommand('start_app', newAppName);
            setNewAppName("");
            setTimeout(() => { onRefresh(); setIsLoading(false); }, 2000);
        } catch (error) {
            alert("Lỗi start app: " + error);
            setIsLoading(false);
        }
    };

    const handleKillApp = async (pid: number) => {
        if (!window.confirm(`Đóng ứng dụng PID ${pid}?`)) return;
        try {
            await sendCommand('kill_process', pid);
            setTimeout(onRefresh, 1000);
        } catch (err) { alert(err); }
    };

    return (
        <div className="flex flex-col h-full space-y-4 animate-fade-in">
            {/* --- TERMINAL INPUT FORM (COMPACT VERSION) --- */}
            <div className="bg-black border border-cyan-500/30 p-2 rounded bg-gradient-to-r from-cyan-950/20 to-black">
                <form onSubmit={handleStartApp} className="flex gap-2 items-center">
                    <div className="text-cyan-500 animate-pulse"><Terminal size={16} /></div>

                    <div className="flex-1 relative group">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-cyan-500/50 font-mono text-xs">{'>'}</span>
                        <input
                            list="common-apps"
                            type="text"
                            value={newAppName}
                            onChange={(e) => setNewAppName(e.target.value)}
                            placeholder="ENTER_COMMAND..."
                            className="w-full bg-transparent border-b border-cyan-500/30 px-3 py-1 text-cyan-400 font-mono text-xs focus:outline-none focus:border-cyan-400 transition-all placeholder-cyan-800"
                            disabled={isLoading}
                        />
                        <datalist id="common-apps">
                            {commonApps.map((app) => <option key={app.value} value={app.value}>{app.label}</option>)}
                        </datalist>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !newAppName}
                        className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 text-[10px] font-bold font-mono hover:bg-cyan-500/20 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all uppercase whitespace-nowrap"
                    >
                        {isLoading ? '...' : 'RUN'}
                    </button>
                </form>
            </div>

            {/* --- DATA GRID --- */}
            <div className="flex-1 flex flex-col min-h-0 border border-green-500/20 rounded bg-black/40">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 p-3 bg-green-500/5 border-b border-green-500/20 text-[10px] font-bold text-green-500/70 font-mono uppercase tracking-widest">
                    <div className="col-span-4">APPLICATION / TITLE</div>
                    <div className="col-span-2 text-right">PID</div>
                    <div className="col-span-2 text-right">CPU%</div>
                    <div className="col-span-2 text-right">MEM (MB)</div>
                    <div className="col-span-2 text-center">ACTION</div>
                </div>

                {/* Body - FIX SCROLL: h-[300px] */}
                <div className="h-[280px] overflow-y-auto custom-scrollbar p-1">
                    {applications.length === 0 ? (
                        <div className="p-8 text-center text-green-500/30 font-mono text-xs italic">
                            {'> NO_ACTIVE_APPLICATIONS_DETECTED'}
                        </div>
                    ) : (
                        applications.map((app, index) => {
                            // KHÔNG DÙNG FAKE STATS NỮA
                            return (
                                <div
                                    key={app.pid}
                                    className={`grid grid-cols-12 gap-2 items-center p-3 text-xs border-b border-dashed border-green-500/10 hover:bg-green-500/10 transition-all group ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}`}
                                >
                                    <div className="col-span-4 overflow-hidden">
                                        <div className="text-green-400 font-bold font-mono flex items-center gap-2">
                                            <Play size={10} className="fill-green-400" />
                                            {app.name}
                                        </div>
                                        <div className="text-gray-500 text-[10px] truncate pl-4">{app.title || "Running Task"}</div>
                                    </div>

                                    <div className="col-span-2 text-right font-mono text-cyan-600">{app.pid}</div>

                                    {/* DÙNG DATA THẬT TỪ PROPS */}
                                    <div className="col-span-2 text-right font-mono text-yellow-500">{app.cpu}%</div>
                                    <div className="col-span-2 text-right font-mono text-blue-400">{app.mem} MB</div>

                                    <div className="col-span-2 flex justify-center">
                                        <button
                                            onClick={() => handleKillApp(app.pid)}
                                            className="text-red-500/50 hover:text-red-500 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* --- MINI STATS BAR --- */}
            <div className="flex justify-between items-center bg-black/60 border border-green-500/20 p-2 rounded text-[10px] font-mono text-green-500/60">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1"><Activity size={10} /> APPS: {applications.length}</span>
                    {/* THREADS: Thay vì tính toán ảo, hiển thị tổng số Process hệ thống */}
                    <span className="flex items-center gap-1"><Cpu size={10} /> SYS_PROCS: {allProcesses.length}</span>
                </div>
                <button onClick={onRefresh} className="hover:text-cyan-400 flex items-center gap-1 transition-colors">
                    <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} /> SYNC_DATA
                </button>
            </div>
        </div>
    );
}