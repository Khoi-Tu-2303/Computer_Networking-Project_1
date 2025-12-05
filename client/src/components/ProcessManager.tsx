import { useState, useEffect } from 'react';
import { RefreshCw, XCircle, Search, Layers, Cpu, Activity } from 'lucide-react';
import { ApplicationsTab } from './ApplicationsTab';
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';
import Tabs from './Tabs'; // <-- Import Component Tabs

export interface ProcessInfo {
    pid: number;
    name: string;
    title: string;
    type: 'APP' | 'PROC';
}

export default function ProcessManager() {
    // --- PHẦN NÃO (LOGIC) ---
    const [activeTab, setActiveTab] = useState<'processes' | 'applications'>('processes');
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { socket, isConnected } = useSocket();

    // Hàm Parse dữ liệu
    const parseProcessData = (dataString: string[]): ProcessInfo[] => {
        return dataString.map(str => {
            const typeMatch = str.match(/^\[(APP|PROC)\]/);
            const idMatch = str.match(/ID:(\d+)/);
            const nameMatch = str.match(/Name:\s(.*?)\s\|/);
            const titleMatch = str.match(/Title:\s(.*)$/);

            return {
                type: (typeMatch ? typeMatch[1] : 'PROC') as 'APP' | 'PROC',
                pid: idMatch ? parseInt(idMatch[1]) : 0,
                name: nameMatch ? nameMatch[1].trim() : 'Unknown',
                title: titleMatch ? titleMatch[1].trim() : ''
            };
        });
    };

    useEffect(() => {
        if (!socket) return;
        socket.on("ReceiveProcessList", (data: string[]) => {
            setProcesses(parseProcessData(data));
            setIsLoading(false);
        });
        return () => { socket.off("ReceiveProcessList"); };
    }, [socket]);

    const handleRefresh = async () => {
        if (!isConnected) return;
        setIsLoading(true);
        try {
            await sendCommand('list_processes');
        } catch (error) {
            alert("Lỗi: " + error);
            setIsLoading(false);
        }
    };

    const handleKillProcess = async (pid: number) => {
        if (!window.confirm(`KILL PROCESS PID: ${pid}?`)) return;
        try {
            await sendCommand('kill_process', pid);
            setTimeout(handleRefresh, 1000);
        } catch (error) {
            alert("Lỗi: " + error);
        }
    };

    const filteredProcesses = processes.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pid.toString().includes(searchTerm)
    );

    // --- CHUẨN BỊ NỘI DUNG CHO TABS ---

    // 1. Nội dung Tab Processes (Đóng gói vào biến)
    const processesContent = (
        <div className="flex-1 flex flex-col space-y-4 animate-fade-in h-full">
            {/* Toolbar (Search + Refresh) */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="// SEARCH_PID_OR_NAME"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black neon-border-green px-4 py-2 pl-10 rounded text-green-500 font-mono text-sm placeholder-green-500/30 focus:outline-none focus:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-green-500/50" />
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isLoading || !isConnected}
                    className="bg-black neon-border-cyan hover:bg-cyan-950/30 px-4 py-2 rounded transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 text-cyan-500 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden md:inline text-cyan-500 font-bold text-sm">REFRESH</span>
                </button>
            </div>

            {/* Bảng Dữ Liệu */}
            <div className="terminal-window rounded-lg overflow-hidden flex-1 min-h-[400px]">
                <div className="bg-black border-b border-green-500/30 p-3 sticky top-0 z-10">
                    <div className="grid grid-cols-12 gap-4 text-xs font-bold text-green-500 uppercase tracking-wider">
                        <div className="col-span-2">PID</div>
                        <div className="col-span-5">PROCESS NAME</div>
                        <div className="col-span-3">TYPE</div>
                        <div className="col-span-2 text-center">ACTION</div>
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {processes.length === 0 && !isLoading ? (
                        <div className="p-8 text-center text-green-500/30 font-mono text-sm">
                            {'> NO_DATA_AVAILABLE. PRESS_REFRESH.'}
                        </div>
                    ) : (
                        filteredProcesses.map((proc, index) => (
                            <div
                                key={proc.pid}
                                className={`grid grid-cols-12 gap-4 items-center p-2 text-xs border-b border-green-500/10 hover:bg-green-500/5 transition-colors group ${index % 2 === 0 ? 'bg-black/40' : 'bg-black/20'
                                    }`}
                            >
                                <div className="col-span-2 text-cyan-500 font-mono">{proc.pid}</div>
                                <div className="col-span-5 text-green-400 font-mono truncate" title={proc.name}>
                                    {proc.name}
                                </div>
                                <div className="col-span-3">
                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${proc.type === 'APP'
                                        ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                                        : 'border-gray-600 text-gray-500'
                                        }`}>
                                        {proc.type}
                                    </span>
                                </div>
                                <div className="col-span-2 text-center">
                                    <button
                                        onClick={() => handleKillProcess(proc.pid)}
                                        className="opacity-60 group-hover:opacity-100 hover:text-red-500 transition-all"
                                        title="Kill Process"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Stats */}
            <div className="flex justify-between items-center text-xs text-green-500/50 font-mono px-2">
                <span>TOTAL_THREADS: {processes.length}</span>
                <span>STATUS: {isLoading ? 'SYNCING...' : 'IDLE'}</span>
            </div>
        </div>
    );

    // 2. Nội dung Tab Applications
    const applicationsContent = (
        <ApplicationsTab allProcesses={processes} onRefresh={handleRefresh} />
    );

    // 3. Cấu hình mảng Tabs
    const tabsData = [
        {
            id: 'processes',
            label: 'ALL_PROCESSES',
            icon: <Cpu size={16} />,
            content: processesContent
        },
        {
            id: 'applications',
            label: 'APPLICATIONS',
            icon: <Layers size={16} />,
            content: applicationsContent
        }
    ];

    // --- PHẦN GIAO DIỆN CHÍNH ---
    return (
        <div className="glass-panel p-6 rounded-lg h-full flex flex-col">
            <h2 className="text-xl font-bold text-green-500 neon-glow-green tracking-wider flex items-center gap-2 mb-6">
                <Activity className="w-6 h-6 text-green-500" />
                {'> SYSTEM_TASKS_'}
            </h2>

            {/* GỌI COMPONENT TABS Ở ĐÂY */}
            <Tabs
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as any)}
                tabs={tabsData}
            />
        </div>
    );
}