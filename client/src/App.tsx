import React from 'react';
import { Monitor } from 'lucide-react';

// Import các component
// SỬA LỖI: Thêm đuôi file .tsx vào tất cả các component
import PowerControls from './components/PowerControls.tsx';
import ProcessManager from './components/ProcessManager.tsx';
import ScreenshotCard from './components/ScreenshotCard.tsx';
import KeyloggerCard from './components/KeyloggerCard.tsx';
import WebcamCard from './components/WebcamCard.tsx';
import { AgentSelector } from './components/AgentSelector.tsx';
// (ApplicationsTab được dùng bên trong ProcessManager nên không cần import ở đây)

function App() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
            <div className="container mx-auto px-4 py-8">
                <header className="mb-8">
                    {/* (Giữ nguyên header) */}
                    <div className="flex items-center gap-3 mb-2">
                        <Monitor className="w-8 h-8 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-800">Remote Control Client</h1>
                    </div>
                    <p className="text-gray-600">Manage and monitor remote system operations</p>
                </header>

                <div className="space-y-6">
                    {/* (Giữ nguyên AgentSelector) */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Connection</h2>
                        <AgentSelector />
                    </div>

                    <PowerControls />

                    <ProcessManager />

                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4">System Monitoring</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <ScreenshotCard />
                            <KeyloggerCard /> {/* <-- 2. THÊM DÒNG NÀY (Bỏ comment) */}
                            <WebcamCard />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;