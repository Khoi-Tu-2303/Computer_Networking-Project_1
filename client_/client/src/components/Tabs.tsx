import { ReactNode } from 'react';

interface TabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    tabs: {
        id: string;
        label: string;
        content: ReactNode;
        icon?: ReactNode;
    }[];
    isLocked?: boolean;
}

export default function Tabs({ activeTab, onTabChange, tabs, isLocked = false }: TabsProps) {
    return (
        <div className="w-full flex flex-col h-full">
            {/* --- THANH NAVIGATION --- */}
            <div className={`flex gap-2 mb-2 p-1 rounded-lg border transition-colors duration-500 ${isLocked ? 'bg-red-950/20 border-red-500/20' : 'bg-black/20 border-white/5'}`}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;

                    // --- LOGIC MÀU SẮC (SỬA LẠI: TẤT CẢ ĐỀU LÀ XANH LÁ) ---
                    let activeClass = "";
                    let dotClass = "";

                    if (isLocked) {
                        // 🔴 TRẠNG THÁI LOCKED: MÀU ĐỎ
                        activeClass = 'bg-red-500/10 text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
                        dotClass = 'bg-red-500 shadow-[0_0_5px_red]';
                    } else {
                        // 🟢 TRẠNG THÁI BÌNH THƯỜNG: TẤT CẢ ĐỀU XANH LÁ CÂY (GREEN)
                        // Bất kể là tab nào cũng dùng màu Green
                        activeClass = 'bg-green-500/10 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]';
                        dotClass = 'bg-green-400 shadow-[0_0_5px_#4ade80]';
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                relative flex items-center gap-2 px-4 py-2 text-xs font-bold font-mono tracking-wider transition-all duration-300 clip-path-slant
                                ${isActive
                                    ? `border ${activeClass}`
                                    : `bg-black/40 border border-transparent hover:bg-white/5 ${isLocked ? 'text-red-900 hover:text-red-500' : 'text-gray-500 hover:text-green-500/70'}`
                                }
                            `}
                        >
                            <div className={`absolute top-1 right-1 w-1 h-1 rounded-full ${isActive ? dotClass : 'bg-gray-700'}`} />
                            {tab.icon}
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* --- CONTENT AREA --- */}
            <div className={`flex-1 rounded-lg p-1 relative overflow-hidden border transition-colors duration-500 ${isLocked ? 'bg-red-950/5 border-red-500/20' : 'bg-black/40 border-white/10'}`}>
                {/* Decor lines: Đổi màu theo trạng thái Lock */}
                <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l rounded-tl ${isLocked ? 'border-red-500/50' : 'border-green-500/30'}`}></div>
                <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r rounded-tr ${isLocked ? 'border-red-500/50' : 'border-green-500/30'}`}></div>
                <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l rounded-bl ${isLocked ? 'border-red-500/50' : 'border-green-500/30'}`}></div>
                <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r rounded-br ${isLocked ? 'border-red-500/50' : 'border-green-500/30'}`}></div>

                <div className="h-full p-2 overflow-hidden">
                    {tabs.find((tab) => tab.id === activeTab)?.content}
                </div>
            </div>
        </div>
    );
}