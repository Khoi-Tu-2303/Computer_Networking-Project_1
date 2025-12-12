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
}

export default function Tabs({ activeTab, onTabChange, tabs }: TabsProps) {
    return (
        <div className="w-full flex flex-col h-full">
            {/* --- THANH NAVIGATION (COMPACT) --- */}
            {/* Giảm mb-4 -> mb-2, p-2 -> p-1 */}
            <div className="flex gap-2 mb-2 bg-black/20 p-1 rounded-lg border border-white/5">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            // Giảm px-6 py-3 -> px-4 py-2
                            // Giảm text-sm -> text-xs
                            className={`
                                relative flex items-center gap-2 px-4 py-2 text-xs font-bold font-mono tracking-wider transition-all duration-300 clip-path-slant
                                ${isActive
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                    : 'bg-black/40 text-gray-500 border border-transparent hover:text-green-500/70 hover:bg-green-500/5'
                                }
                            `}
                        >
                            <div className={`absolute top-1 right-1 w-1 h-1 rounded-full ${isActive ? 'bg-green-400 shadow-[0_0_5px_#4ade80]' : 'bg-gray-700'}`} />
                            {tab.icon}
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="flex-1 bg-black/40 border border-green-500/20 rounded-lg p-1 relative overflow-hidden">
                {/* Decor lines nhỏ hơn */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500/50 rounded-tl"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500/50 rounded-tr"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-green-500/50 rounded-bl"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500/50 rounded-br"></div>

                {/* Giảm padding p-4 -> p-2 */}
                <div className="h-full p-2 overflow-hidden">
                    {tabs.find((tab) => tab.id === activeTab)?.content}
                </div>
            </div>
        </div>
    );
}