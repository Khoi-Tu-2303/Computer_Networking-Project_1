import { ReactNode } from 'react';

interface TabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    // Giữ nguyên cấu trúc dữ liệu cũ để tương thích với ProcessManager
    tabs: {
        id: string;
        label: string;
        content: ReactNode;
        icon?: ReactNode; // Thêm tùy chọn icon nếu muốn
    }[];
}

export default function Tabs({ activeTab, onTabChange, tabs }: TabsProps) {
    return (
        <div className="w-full">
            {/* --- PHẦN THANH ĐIỀU HƯỚNG TAB --- */}
            <div className="flex border-b border-green-500/30 gap-1 p-2 bg-black/40 rounded-t-lg overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`px-4 py-2 rounded-t text-sm font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 font-mono ${activeTab === tab.id
                                ? 'bg-green-500/20 text-green-500 neon-border-green border-b-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                : 'bg-black/50 text-green-500/50 border border-transparent hover:bg-green-500/10 hover:text-green-400'
                            }`}
                    >
                        {tab.icon && <span>{tab.icon}</span>}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* --- PHẦN NỘI DUNG TAB --- */}
            <div className="bg-black border border-t-0 border-green-500/30 rounded-b-lg p-4 min-h-[300px]">
                {tabs.find((tab) => tab.id === activeTab)?.content}
            </div>
        </div>
    );
}