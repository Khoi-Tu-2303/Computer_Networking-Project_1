import React, { useState } from 'react';
import { Play, Terminal, Trash2, RefreshCw, Cpu, Activity, ShieldAlert, Lock } from 'lucide-react';
import { sendCommand } from '../services/socketService';
import { ProcessInfo } from './ProcessManager';
import { useSocket } from '../contexts/SocketContext';

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

export function ApplicationsTab({ allProcesses, onRefresh }: Props) {
    const [newAppName, setNewAppName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // [FIX] Lấy showModal (đúng tên trong Context của ông)
    const { isSystemLocked, showModal } = useSocket();

    const applications = allProcesses.filter(p => p.type === 'APP');

    const handleStartApp = async (e: React.FormEvent) => {
        e.preventDefault();

        // [FIX] Dùng showModal
        if (isSystemLocked) {
            showModal({ type: 'error', title: 'EXECUTION_DENIED', message: 'System LOCKED. Cannot start new processes.' });
            return;
        }

        if (!newAppName.trim()) return;
        setIsLoading(true);
        try {
            await sendCommand('start_app', newAppName);
            setNewAppName("");
            setTimeout(() => { onRefresh(); setIsLoading(false); }, 2000);
        } catch (error) {
            // [FIX] Dùng showModal
            showModal({ type: 'error', title: 'EXECUTION_ERROR', message: `Failed to start app: ${error}` });
            setIsLoading(false);
        }
    };

    const handleKillApp = (pid: number, name: string) => {
        if (isSystemLocked) {
            // [FIX] Dùng showModal
            showModal({ type: 'error', title: 'ACCESS_DENIED', message: 'Firewall: Active protection enabled. Action blocked.' });
            return;
        }

        // [FIX] Dùng showModal
        showModal({
            type: 'warning',
            title: 'FORCE_CLOSE_APP',
            message: `Force quit application "${name}" (PID: ${pid})? Unsaved work will be lost.`,
            showCancel: true,
            onConfirm: async () => {
                try {
                    await sendCommand('kill_process', pid);
                    setTimeout(onRefresh, 1000);
                } catch (err) {
                    console.error(err);
                }
            }
        });
    };

    return (
        <div className="flex flex-col h-full space-y-4 animate-fade-in">
            {/* --- TERMINAL INPUT FORM --- */}
            <div className={`border p-2 rounded bg-gradient-to-r transition-colors duration-300 ${isSystemLocked
                ? 'bg-red-950/20 border-red-500/30 from-red-950/20 to-black' // Style Locked
                : 'bg-black border-cyan-500/30 from-cyan-950/20 to-black'
                }`}>
                <form onSubmit={handleStartApp} className="flex gap-2 items-center">
                    <div className={`${isSystemLocked ? 'text-red-500' : 'text-cyan-500 animate-pulse'}`}>
                        {isSystemLocked ? <Lock size={16} /> : <Terminal size={16} />}
                    </div>

                    <div className="flex-1 relative group">
                        <span className={`absolute left-0 top-1/2 -translate-y-1/2 font-mono text-xs ${isSystemLocked ? 'text-red-500/50' : 'text-cyan-500/50'}`}>{'>'}</span>
                        <input
                            list="common-apps"
                            type="text"
                            value={newAppName}
                            onChange={(e) => setNewAppName(e.target.value)}
                            // Thay đổi placeholder và disable input khi khóa
                            placeholder={isSystemLocked ? "SYSTEM ACCESS LOCKED" : "ENTER_COMMAND..."}
                            className={`w-full bg-transparent border-b px-3 py-1 font-mono text-xs focus:outline-none transition-all ${isSystemLocked
                                ? 'border-red-500/30 text-red-500/50 cursor-not-allowed placeholder-red-800'
                                : 'border-cyan-500/30 text-cyan-400 focus:border-cyan-400 placeholder-cyan-800'
                                }`}
                            disabled={isLoading || isSystemLocked}
                        />
                        <datalist id="common-apps">
                            {commonApps.map((app) => <option key={app.value} value={app.value}>{app.label}</option>)}
                        </datalist>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !newAppName || isSystemLocked}
                        className={`px-3 py-1 border text-[10px] font-bold font-mono transition-all uppercase whitespace-nowrap flex items-center gap-1 ${isSystemLocked
                            ? 'bg-red-900/20 border-red-500/30 text-red-500 cursor-not-allowed opacity-70'
                            : 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                            }`}
                    >
                        {isSystemLocked ? <ShieldAlert size={10} /> : (isLoading ? '...' : 'RUN')}
                    </button>
                </form>
            </div>

            {/* --- DATA GRID --- */}
            <div className="flex-1 flex flex-col min-h-0 border border-green-500/20 rounded bg-black/40">
                <div className="grid grid-cols-12 gap-2 p-3 bg-green-500/5 border-b border-green-500/20 text-[10px] font-bold text-green-500/70 font-mono uppercase tracking-widest">
                    <div className="col-span-4">APPLICATION / TITLE</div>
                    <div className="col-span-2 text-right">PID</div>
                    <div className="col-span-2 text-right">CPU%</div>
                    <div className="col-span-2 text-right">MEM (MB)</div>
                    <div className="col-span-2 text-center">ACTION</div>
                </div>

                <div className="h-[280px] overflow-y-auto custom-scrollbar p-1">
                    {applications.length === 0 ? (
                        <div className="p-8 text-center text-green-500/30 font-mono text-xs italic">
                            {'> NO_ACTIVE_APPLICATIONS_DETECTED'}
                        </div>
                    ) : (
                        applications.map((app, index) => {
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
                                    <div className="col-span-2 text-right font-mono text-yellow-500">{app.cpu}%</div>
                                    <div className="col-span-2 text-right font-mono text-blue-400">{app.mem} MB</div>

                                    <div className="col-span-2 flex justify-center">
                                        <button
                                            onClick={() => handleKillApp(app.pid, app.name)}
                                            disabled={isSystemLocked}
                                            className={`transition-all ${isSystemLocked
                                                ? 'text-gray-600 cursor-not-allowed'
                                                : 'text-red-500/50 hover:text-red-500 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                                                }`}
                                        >
                                            {isSystemLocked ? <ShieldAlert size={12} /> : <Trash2 size={14} />}
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
                    <span className="flex items-center gap-1"><Cpu size={10} /> SYS_PROCS: {allProcesses.length}</span>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={isSystemLocked}
                    className={`flex items-center gap-1 transition-colors ${isSystemLocked ? 'text-gray-600 cursor-not-allowed' : 'hover:text-cyan-400'}`}
                >
                    {isSystemLocked ? <ShieldAlert size={10} /> : <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />}
                    SYNC_DATA
                </button>
            </div>
        </div>
    );
}