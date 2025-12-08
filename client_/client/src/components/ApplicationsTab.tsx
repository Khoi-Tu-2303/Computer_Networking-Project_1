import React, { useState } from 'react';
import { Play, Plus, Trash2, RefreshCw } from 'lucide-react'; // Import icon mới
import { sendCommand } from '../services/socketService';
import { ProcessInfo } from './ProcessManager';

// Nhận props từ cha (ProcessManager)
interface Props {
    allProcesses: ProcessInfo[];
    onRefresh: () => void;
}

// Danh sách gợi ý (Giữ nguyên)
const commonApps = [
    { value: "notepad.exe", label: "Notepad" },
    { value: "calc.exe", label: "Calculator" },
    { value: "cmd.exe", label: "Command Prompt" },
    { value: "mspaint.exe", label: "Paint" },
    { value: "explorer.exe", label: "Explorer" },
    { value: "chrome.exe", label: "Chrome" },
    { value: "msedge.exe", label: "Edge" },
];

export function ApplicationsTab({ allProcesses, onRefresh }: Props) {
    const [newAppName, setNewAppName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Lọc ra các ứng dụng (Type = APP) từ danh sách tổng
    const applications = allProcesses.filter(p => p.type === 'APP');

    // --- LOGIC START APP (GIỮ NGUYÊN) ---
    const handleStartApp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAppName.trim()) return;

        setIsLoading(true);
        try {
            await sendCommand('start_app', newAppName);
            setNewAppName("");

            // Đợi 2s để app mở lên rồi refresh list
            setTimeout(() => {
                onRefresh();
                setIsLoading(false);
            }, 2000);
        } catch (error) {
            alert("Lỗi start app: " + error);
            setIsLoading(false);
        }
    };

    // --- LOGIC KILL APP (GIỮ NGUYÊN) ---
    const handleKillApp = async (pid: number) => {
        if (!window.confirm(`Đóng ứng dụng PID ${pid}?`)) return;
        try {
            await sendCommand('kill_process', pid);
            setTimeout(onRefresh, 1000);
        } catch (err) {
            alert(err);
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">

            {/* --- FORM NHẬP TÊN APP (GIAO DIỆN MỚI) --- */}
            <form onSubmit={handleStartApp} className="flex gap-2">
                <div className="flex-1 relative">
                    <input
                        list="common-apps"
                        type="text"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        placeholder="// ENTER_APP_NAME_OR_PATH (ex: notepad.exe)"
                        className="w-full bg-black neon-border-cyan px-4 py-2 rounded text-cyan-500 font-mono text-sm placeholder-cyan-500/30 focus:outline-none focus:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300"
                        disabled={isLoading}
                    />
                    {/* Datalist cho gợi ý */}
                    <datalist id="common-apps">
                        {commonApps.map((app) => (
                            <option key={app.value} value={app.value}>{app.label}</option>
                        ))}
                    </datalist>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !newAppName}
                    className="bg-black neon-border-green hover:bg-green-950/30 px-4 py-2 rounded transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin text-green-500" /> : <Plus className="w-4 h-4 text-green-500" />}
                    <span className="text-green-500 font-bold text-sm">LAUNCH</span>
                </button>
            </form>

            {/* --- BẢNG DANH SÁCH APP (GIAO DIỆN TERMINAL) --- */}
            <div className="terminal-window rounded-lg overflow-hidden">
                {/* Header Bảng */}
                <div className="bg-black border-b border-green-500/30 p-3">
                    <div className="grid grid-cols-12 gap-4 text-xs font-bold text-green-500 uppercase tracking-wider">
                        <div className="col-span-4">APPLICATION NAME</div>
                        <div className="col-span-5">WINDOW TITLE</div>
                        <div className="col-span-2 text-center">PID</div>
                        <div className="col-span-1 text-right">KILL</div>
                    </div>
                </div>

                {/* Body Bảng */}
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {applications.length === 0 ? (
                        <div className="p-8 text-center text-green-500/30 font-mono text-sm">
                            {'> NO_ACTIVE_APPLICATIONS_FOUND'}
                        </div>
                    ) : (
                        applications.map((app, index) => (
                            <div
                                key={app.pid}
                                className={`grid grid-cols-12 gap-4 items-center p-3 text-xs border-b border-green-500/10 hover:bg-green-500/5 transition-colors group ${index % 2 === 0 ? 'bg-black/40' : 'bg-black/20'
                                    }`}
                            >
                                {/* Cột Name */}
                                <div className="col-span-4 flex items-center gap-2 overflow-hidden">
                                    <Play className="w-3 h-3 text-green-500/50 flex-shrink-0" />
                                    <span className="text-green-400 font-mono truncate" title={app.name}>{app.name}</span>
                                </div>

                                {/* Cột Title (Category cũ) */}
                                <div className="col-span-5 text-cyan-500/80 font-mono truncate" title={app.title}>
                                    {app.title || "N/A"}
                                </div>

                                {/* Cột PID (Memory cũ) */}
                                <div className="col-span-2 text-center font-bold text-yellow-500 font-mono">
                                    {app.pid}
                                </div>

                                {/* Cột Action */}
                                <div className="col-span-1 flex justify-end">
                                    <button
                                        onClick={() => handleKillApp(app.pid)}
                                        className="opacity-60 group-hover:opacity-100 transition-opacity hover:scale-110"
                                        title="Close Application"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500 hover:text-red-400 hover:drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Stats */}
            <div className="p-3 bg-green-950/20 border border-green-500/30 rounded text-xs text-green-400 font-mono flex justify-between items-center">
                <span>{`> TOTAL_RUNNING: ${applications.length}`}</span>
                <button onClick={onRefresh} className="hover:text-green-300 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> REFRESH_DATA
                </button>
            </div>
        </div>
    );
}