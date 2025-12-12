import { useState, useEffect } from 'react';
import { RefreshCw, Search, Cpu, Layers, Activity, AlertTriangle, XCircle, HardDrive } from 'lucide-react';
import { ApplicationsTab } from './ApplicationsTab';
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';
import Tabs from './Tabs';

export interface ProcessInfo {
    pid: number;
    name: string;
    title: string;
    type: 'APP' | 'PROC';
    cpu: string; // Thêm trường này (dạng chuỗi "12.5")
    mem: number; // Thêm trường này (số MB)
}

export default function ProcessManager() {
    const [sysStats, setSysStats] = useState({ cpu: 0, ramUsed: 0, ramTotal: 0 });
    const [activeTab, setActiveTab] = useState<'processes' | 'applications'>('processes');
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Lấy trạng thái kết nối từ Context
    const { socket, isConnected } = useSocket();

    // --- LOGIC PARSE MỚI (Đọc format từ C#) ---
    const parseProcessData = (dataString: string[]): ProcessInfo[] => {
        return dataString.map(str => {
            // Format Server: [APP] ID:123 | Name:abc | Title:xyz | CPU:12.0 | RAM:500
            const typeMatch = str.match(/^\[(APP|PROC)\]/);
            const idMatch = str.match(/ID:(\d+)/);
            const nameMatch = str.match(/Name:(.*?)\s\|/);
            const titleMatch = str.match(/Title:(.*?)\s\|/);
            const cpuMatch = str.match(/CPU:(\d+\.?\d*)/); // Regex lấy số thập phân
            const ramMatch = str.match(/RAM:(\d+)/);       // Regex lấy số nguyên

            return {
                type: (typeMatch ? typeMatch[1] : 'PROC') as 'APP' | 'PROC',
                pid: idMatch ? parseInt(idMatch[1]) : 0,
                name: nameMatch ? nameMatch[1].trim() : 'Unknown',
                title: titleMatch ? titleMatch[1].trim() : '',
                cpu: cpuMatch ? cpuMatch[1] : "0.0", // Dữ liệu thật từ Server
                mem: ramMatch ? parseInt(ramMatch[1]) : 0 // Dữ liệu thật từ Server
            };
        });
    };
    useEffect(() => {
        if (!socket) return;
        socket.on("ReceiveProcessList", (data: string[]) => {
            setProcesses(parseProcessData(data));
            setIsLoading(false);
        });
        // Listener MỚI: System Stats Realtime
        socket.on("ReceiveSystemStats", (data: any) => {
            setSysStats(data);
        });
        return () => {
            socket.off("ReceiveProcessList"); socket.off("ReceiveSystemStats"); };
    }, [socket]);

    const handleRefresh = async () => {
        if (!isConnected) return;
        setIsLoading(true);
        try { await sendCommand('list_processes'); } catch (error) { setIsLoading(false); }
    };

    const handleKillProcess = async (pid: number) => {
        if (!window.confirm(`KILL PROCESS PID: ${pid}?`)) return;
        try { await sendCommand('kill_process', pid); setTimeout(handleRefresh, 1000); } catch (error) { alert(error); }
    };

    const filteredProcesses = processes.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pid.toString().includes(searchTerm)
    );

    // Tính tổng RAM thật
    const totalMem = sysStats.ramUsed / 1024; // Đổi MB -> GB
    const cpuPercent = sysStats.cpu;
    const runningApps = processes.filter(p => p.type === 'APP').length;

    // --- NỘI DUNG TAB: ALL PROCESSES ---
    const processesContent = (
        <div className="flex flex-col h-full space-y-2 animate-fade-in">
            {/* Toolbar Compact */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="// SEARCH..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/50 border border-green-500/30 px-3 py-1 pl-8 rounded text-green-500 font-mono text-xs focus:outline-none focus:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                    />
                    <Search className="absolute left-2.5 top-1.5 w-3 h-3 text-green-500/50" />
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={!isConnected}
                    className="bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 px-2 rounded transition-all text-green-500 disabled:opacity-50"
                >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Data Grid */}
            <div className="flex-1 min-h-0 overflow-hidden border border-green-500/20 rounded bg-black/40 flex flex-col">
                {/* Header: Tăng size lên text-[10px] cho dễ đọc hơn (cũ là 9px) */}
                <div className="grid grid-cols-12 gap-2 p-1.5 bg-green-900/20 border-b border-green-500/20 text-[10px] font-bold text-green-400 uppercase font-mono">
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
                                // UPDATE: Đổi text-[10px] thành text-xs (cho to bằng bên App)
                                className={`grid grid-cols-12 gap-2 items-center p-2 text-xs border-b border-green-500/5 hover:bg-green-500/10 transition-colors group font-mono ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}`}
                            >
                                <div className="col-span-2 text-cyan-600">{proc.pid}</div>
                                <div className="col-span-4 overflow-hidden">
                                    <div className="text-green-300 truncate font-bold">{proc.name}</div>
                                    {/* Subtitle: Tăng từ 8px lên 10px */}
                                    {proc.title && <div className="text-gray-500 text-[10px] truncate">{proc.title}</div>}
                                </div>
                                <div className="col-span-2 text-right text-yellow-500">{proc.cpu}%</div>
                                <div className="col-span-2 text-right text-blue-400">{proc.mem} MB</div>
                                <div className="col-span-1 text-center">
                                    {/* Badge Type: Tăng size chữ lên xíu */}
                                    <span className={`text-[10px] px-1 rounded border ${proc.type === 'APP' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-transparent text-gray-600'}`}>
                                        {proc.type}
                                    </span>
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <button onClick={() => handleKillProcess(proc.pid)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all">
                                        <XCircle size={14} /> {/* Tăng size icon lên 14 */}
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
        // CONTAINER CHÍNH: Padding p-3 (nhỏ), h-auto (co giãn theo nội dung)
        <div className="glass-panel p-6 rounded-lg h-auto flex flex-col bg-black/90 relative overflow-hidden shadow-2xl border border-white/5">

            {/* HEADER COMPACT: Margin mb-2, Font chữ nhỏ hơn */}
            <div className="flex items-center justify-between mb-2 z-10">
                <h2 className="text-lg font-black text-green-500 tracking-tighter flex items-center gap-2 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                    <span className="text-xl">{'>'}</span> PROCESS_MANAGER
                </h2>

                {/* STATUS BADGE */}
                <div className={`text-[10px] font-mono border px-2 py-0.5 rounded flex items-center gap-2 transition-colors duration-300 ${isConnected ? 'text-green-500/50 border-green-500/20' : 'text-red-500/50 border-red-500/20'}`}>
                    STATUS:
                    <span className={`font-bold ${isConnected ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}>
                        {isConnected ? 'ON' : 'OFF'}
                    </span>
                </div>
            </div>

            {/* TABS AREA */}
            <div className="flex-1 min-h-0 z-10">
                <Tabs activeTab={activeTab} onTabChange={(id) => setActiveTab(id as any)} tabs={tabsData} />
            </div>

            {/* FOOTER COMPACT: Cao h-14, Icon size 24, Bỏ thanh loading bar cho gọn */}
            <div className="mt-2 grid grid-cols-3 gap-2 h-14 z-10">
                {/* Card 1: CPU */}
                <div className="bg-black/60 border border-green-500/30 p-2 rounded relative overflow-hidden group flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-50 transition-opacity"><Cpu size={24} /></div>
                    <div className="text-[8px] text-green-500/60 font-mono tracking-widest">CPU USAGE</div>
                    <div className="text-xl font-bold text-green-400 font-mono leading-none">{cpuPercent}%</div>
                    {/* Thanh Progress bar cho CPU */}
                    <div className="w-full bg-green-900/30 h-1 mt-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${cpuPercent}%` }}></div>
                    </div>
                </div>

                {/* Card 2: Memory */}
                <div className="bg-black/60 border border-cyan-500/30 p-2 rounded relative overflow-hidden group flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-50 transition-opacity text-cyan-500"><HardDrive size={24} /></div>
                    <div className="text-[8px] text-cyan-500/60 font-mono tracking-widest">MEM (GB)</div>
                    <div className="text-xl font-bold text-cyan-400 font-mono leading-none">
                        {totalMem.toFixed(1)} <span className="text-xs">/ {(sysStats.ramTotal / 1024).toFixed(0)} GB</span>
                    </div>
                </div>

                {/* Card 3: Apps */}
                <div className="bg-black/60 border border-red-500/30 p-2 rounded relative overflow-hidden group flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-50 transition-opacity text-red-500"><AlertTriangle size={24} /></div>
                    <div className="text-[8px] text-red-500/60 font-mono tracking-widest">APPS</div>
                    <div className="text-xl font-bold text-red-400 font-mono leading-none">{runningApps}</div>
                </div>
            </div>
        </div>
    );
}