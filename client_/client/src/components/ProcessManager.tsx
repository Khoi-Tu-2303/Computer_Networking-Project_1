import { useState, useEffect } from 'react';
import { RefreshCw, Search, Cpu, Layers, Activity, AlertTriangle, XCircle, HardDrive, ShieldAlert } from 'lucide-react';
import { ApplicationsTab } from './ApplicationsTab';
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';
import Tabs from './Tabs';

export interface ProcessInfo {
    pid: number;
    name: string;
    title: string;
    type: 'APP' | 'PROC';
    cpu: string;
    mem: number;
}

export default function ProcessManager() {
    const [sysStats, setSysStats] = useState({ cpu: 0, ramUsed: 0, ramTotal: 0 });
    const [activeTab, setActiveTab] = useState<'processes' | 'applications'>('processes');
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // [FIX] Lấy showModal (đúng tên trong Context của ông)
    const { socket, isConnected, isSystemLocked, showModal } = useSocket();

    const parseProcessData = (dataString: string[]): ProcessInfo[] => {
        return dataString.map(str => {
            const typeMatch = str.match(/^\[(APP|PROC)\]/);
            const idMatch = str.match(/ID:(\d+)/);
            const nameMatch = str.match(/Name:(.*?)\s\|/);
            const titleMatch = str.match(/Title:(.*?)\s\|/);
            const cpuMatch = str.match(/CPU:(\d+\.?\d*)/);
            const ramMatch = str.match(/RAM:(\d+)/);

            return {
                type: (typeMatch ? typeMatch[1] : 'PROC') as 'APP' | 'PROC',
                pid: idMatch ? parseInt(idMatch[1]) : 0,
                name: nameMatch ? nameMatch[1].trim() : 'Unknown',
                title: titleMatch ? titleMatch[1].trim() : '',
                cpu: cpuMatch ? cpuMatch[1] : "0.0",
                mem: ramMatch ? parseInt(ramMatch[1]) : 0
            };
        });
    };

    useEffect(() => {
        if (!socket) return;
        socket.on("ReceiveProcessList", (data: string[]) => {
            setProcesses(parseProcessData(data));
            setIsLoading(false);
        });
        socket.on("ReceiveSystemStats", (data: any) => {
            setSysStats(data);
        });
        return () => {
            socket.off("ReceiveProcessList"); socket.off("ReceiveSystemStats");
        };
    }, [socket]);

    const handleRefresh = async () => {
        if (!isConnected) return;
        if (isSystemLocked) {
            // [FIX] Dùng showModal
            showModal({ type: 'error', title: 'ACCESS_DENIED', message: 'System is currently LOCKED. Refresh action aborted.' });
            return;
        }
        setIsLoading(true);
        try { await sendCommand('list_processes'); } catch (error) { setIsLoading(false); }
    };

    const handleKillProcess = (pid: number, name: string) => {
        if (isSystemLocked) {
            // [FIX] Dùng showModal
            showModal({ type: 'error', title: 'ACCESS_DENIED', message: 'Server is in PROTECTED MODE. Kill signal blocked.' });
            return;
        }

        // [FIX] Dùng showModal
        showModal({
            type: 'warning',
            title: 'TERMINATE_PROCESS',
            message: `Execute kill signal for process "${name}" (PID: ${pid})? Unsaved data will be lost immediately.`,
            showCancel: true,
            onConfirm: async () => {
                try {
                    await sendCommand('kill_process', pid);
                    setTimeout(handleRefresh, 1000);
                } catch (error) {
                    console.error(error);
                }
            }
        });
    };

    const filteredProcesses = processes.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pid.toString().includes(searchTerm)
    );

    const totalMem = sysStats.ramUsed / 1024;
    const cpuPercent = sysStats.cpu;
    const runningApps = processes.filter(p => p.type === 'APP').length;

    // --- NỘI DUNG TAB: ALL PROCESSES ---
    const processesContent = (
        <div className="flex flex-col h-full space-y-2 animate-fade-in">
            {/* Toolbar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder={isSystemLocked ? "LOCKED" : "// SEARCH..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={isSystemLocked}
                        className={`w-full bg-black/50 border px-3 py-1 pl-8 rounded font-mono text-xs focus:outline-none transition-all ${isSystemLocked ? 'border-red-500/30 text-red-500/50 cursor-not-allowed placeholder-red-900' : 'border-green-500/30 text-green-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}
                    />
                    <Search className={`absolute left-2.5 top-1.5 w-3 h-3 ${isSystemLocked ? 'text-red-500/30' : 'text-green-500/50'}`} />
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={!isConnected || isSystemLocked}
                    className={`border px-2 rounded transition-all ${isSystemLocked
                        ? 'bg-red-950/30 border-red-500/30 text-red-500 opacity-50 cursor-not-allowed'
                        : 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-500'
                        }`}
                >
                    {isSystemLocked ? <ShieldAlert className="w-3 h-3" /> : <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />}
                </button>
            </div>

            {/* Data Grid */}
            <div className={`flex-1 min-h-0 overflow-hidden border rounded bg-black/40 flex flex-col transition-colors ${isSystemLocked ? 'border-red-500/20' : 'border-green-500/20'}`}>
                <div className={`grid grid-cols-12 gap-2 p-1.5 border-b text-[10px] font-bold uppercase font-mono ${isSystemLocked ? 'bg-red-900/20 border-red-500/20 text-red-400' : 'bg-green-900/20 border-green-500/20 text-green-400'}`}>
                    <div className="col-span-2">PID</div>
                    <div className="col-span-4">NAME / DESC</div>
                    <div className="col-span-2 text-right">CPU</div>
                    <div className="col-span-2 text-right">MEM</div>
                    <div className="col-span-1 text-center">TYPE</div>
                    <div className="col-span-1 text-center">KILL</div>
                </div>

                <div className="h-[350px] overflow-y-auto custom-scrollbar p-1">
                    {filteredProcesses.map((proc, index) => {
                        return (
                            <div
                                key={proc.pid}
                                className={`grid grid-cols-12 gap-2 items-center p-2 text-xs border-b hover:bg-white/5 transition-colors group font-mono ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'} ${isSystemLocked ? 'border-red-500/5' : 'border-green-500/5'}`}
                            >
                                <div className={`col-span-2 ${isSystemLocked ? 'text-red-800' : 'text-cyan-600'}`}>{proc.pid}</div>
                                <div className="col-span-4 overflow-hidden">
                                    <div className={`${isSystemLocked ? 'text-red-400' : 'text-green-300'} truncate font-bold`}>{proc.name}</div>
                                    {proc.title && <div className="text-gray-500 text-[10px] truncate">{proc.title}</div>}
                                </div>
                                <div className="col-span-2 text-right text-yellow-500">{proc.cpu}%</div>
                                <div className="col-span-2 text-right text-blue-400">{proc.mem} MB</div>
                                <div className="col-span-1 text-center">
                                    <span className={`text-[10px] px-1 rounded border ${proc.type === 'APP' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-transparent text-gray-600'}`}>
                                        {proc.type}
                                    </span>
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <button
                                        onClick={() => handleKillProcess(proc.pid, proc.name)}
                                        disabled={isSystemLocked}
                                        className={`transition-all ${isSystemLocked
                                            ? 'text-gray-600 cursor-not-allowed'
                                            : 'opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400'
                                            }`}
                                    >
                                        {isSystemLocked ? <ShieldAlert size={12} /> : <XCircle size={14} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const tabsData = [
        { id: 'processes', label: 'SYSTEM_MONITOR', icon: <Activity size={16} />, content: processesContent },
        { id: 'applications', label: 'APPLICATIONS', icon: <Layers size={16} />, content: <ApplicationsTab allProcesses={processes} onRefresh={handleRefresh} /> }
    ];

    return (
        <div className={`glass-panel p-6 rounded-lg h-auto flex flex-col relative overflow-hidden shadow-2xl border transition-colors duration-500 ${isSystemLocked ? 'bg-red-950/10 border-red-500/20' : 'bg-black/90 border-white/5'}`}>

            {/* HEADER */}
            <div className="flex items-center justify-between mb-2 z-10">
                <h2 className={`text-lg font-black tracking-wider flex items-center gap-2 ${isSystemLocked ? 'text-red-500 neon-glow-red' : 'text-green-500 neon-glow-green'}`}>
                    <span className="text-xl">{'>'}</span> PROCESS_MANAGER_
                </h2>

                <div className={`text-[10px] font-mono border px-2 py-0.5 rounded flex items-center gap-2 transition-colors duration-300 ${isSystemLocked
                    ? 'text-red-400 border-red-500/50 bg-red-900/20'
                    : (isConnected ? 'text-green-500/50 border-green-500/20' : 'text-red-500/50 border-red-500/20')
                    }`}>
                    STATUS:
                    <span className={`font-bold flex items-center gap-1 ${isSystemLocked
                        ? 'text-red-500 drop-shadow-[0_0_8px_red]'
                        : (isConnected ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'text-red-500')
                        }`}>
                        {isSystemLocked ? <><ShieldAlert size={10} /> LOCKED</> : (isConnected ? 'ON' : 'OFF')}
                    </span>
                </div>
            </div>

            {/* TABS */}
            <div className="flex-1 min-h-0 z-10">
                <Tabs
                    activeTab={activeTab}
                    onTabChange={(id) => setActiveTab(id as any)}
                    tabs={tabsData}
                    isLocked={isSystemLocked}
                />
            </div>

            {/* FOOTER */}
            <div className="mt-2 grid grid-cols-3 gap-2 h-14 z-10">
                <div className="bg-black/60 border border-green-500/30 p-2 rounded relative overflow-hidden group flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-50 transition-opacity"><Cpu size={24} /></div>
                    <div className="text-[8px] text-green-500/60 font-mono tracking-widest">CPU USAGE</div>
                    <div className="text-xl font-bold text-green-400 font-mono leading-none">{cpuPercent}%</div>
                    <div className="w-full bg-green-900/30 h-1 mt-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${cpuPercent}%` }}></div>
                    </div>
                </div>

                <div className="bg-black/60 border border-cyan-500/30 p-2 rounded relative overflow-hidden group flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-50 transition-opacity text-cyan-500"><HardDrive size={24} /></div>
                    <div className="text-[8px] text-cyan-500/60 font-mono tracking-widest">MEM (GB)</div>
                    <div className="text-xl font-bold text-cyan-400 font-mono leading-none">
                        {totalMem.toFixed(1)} <span className="text-xs">/ {(sysStats.ramTotal / 1024).toFixed(0)} GB</span>
                    </div>
                </div>

                <div className="bg-black/60 border border-red-500/30 p-2 rounded relative overflow-hidden group flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-50 transition-opacity text-red-500"><AlertTriangle size={24} /></div>
                    <div className="text-[8px] text-red-500/60 font-mono tracking-widest">APPS</div>
                    <div className="text-xl font-bold text-red-400 font-mono leading-none">{runningApps}</div>
                </div>
            </div>
        </div>
    );
}