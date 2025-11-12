// src/components/ProcessManager.tsx
import { useState } from 'react';
import { RefreshCw, Play, XCircle } from 'lucide-react';
import Tabs from './Tabs';
// 1. Import hook và service
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';
// 2. Import kiểu dữ liệu từ file protocol (giả sử bạn đã tạo)
import { Process, Application } from '../types'; // (Bạn có thể giữ type cũ)
import { ApplicationsTab } from './ApplicationsTab';
// 3. XÓA BỎ MOCK DATA (mockProcesses, mockApplications)

export default function ProcessManager() {
    const [activeTab, setActiveTab] = useState('processes');
    const [processes, setProcesses] = useState<Process[]>([]);
    // const [applications, setApplications] = useState<Application[]>([]); // Không cần nữa
    const [isLoading, setIsLoading] = useState(false);

    const { selectedAgentId } = useSocket();

    const handleRefreshProcesses = async () => {
        if (!selectedAgentId) {
            alert('Vui lòng chọn một Agent trước.');
            setProcesses([]); // Xóa list nếu k có agent
            return;
        }
        setIsLoading(true);
        try {
            const response = await sendCommand(
                selectedAgentId,
                'list_processes'
            );
            setProcesses(response.payload);
        } catch (error: any) {
            alert(`Lỗi khi lấy process: ${error.message}`);
            setProcesses([]); // Xóa list nếu lỗi
        }
        setIsLoading(false);
    };

    const handleKillProcess = async (pid: number) => {
        if (!selectedAgentId) {
            alert('Vui lòng chọn một Agent trước.');
            return;
        }
        setIsLoading(true); // Bật loading
        try {
            await sendCommand(selectedAgentId, 'kill_process', { pid: pid });
            // Thêm delay 500ms rồi refresh
            setTimeout(handleRefreshProcesses, 500);
        } catch (error: any) {
            alert(`Lỗi khi kill process: ${error.message}`);
            setIsLoading(false); // Tắt loading nếu lỗi
        }
        // handleRefreshProcesses() sẽ tự tắt loading
    };

    // (Bạn có thể cập nhật các hàm handleStartNewProcess, handleStartApp, handleStopApp
    //  tương tự bằng cách dùng `sendCommand`...)

    // ... (Nội dung JSX của processesContent và applicationsContent) ...

    const processesContent = (
        <div className="py-4"> {/* Thêm padding cho tab content */}
            <div className="flex gap-3 mb-4">
                <button
                    onClick={handleRefreshProcesses}
                    disabled={isLoading || !selectedAgentId}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Đang tải...' : 'Refresh List'}
                </button>
                {/* ... (Nút Start New Process) ... */}
            </div>

            {/* Thông báo loading / rỗng */}
            {isLoading && processes.length === 0 ? (
                <p className="text-center text-gray-500">Đang tải danh sách processes...</p>
            ) : !selectedAgentId ? (
                <p className="text-center text-gray-500">Vui lòng chọn một agent để xem processes.</p>
            ) : processes.length === 0 && !isLoading ? (
                <p className="text-center text-gray-500">Không tìm thấy process nào (hoặc chưa tải).</p>
            ) : (
                // ****** THAY ĐỔI Ở ĐÂY ******
                // Thêm max-h-[500px] (chiều cao tối đa 500px) và overflow-y-auto (cuộn dọc)
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm max-h-[500px] overflow-y-auto relative">
                    <table className="w-full border-collapse min-w-[600px]">
                        {/* Thêm sticky top-0 để tiêu đề "dính" lại khi cuộn */}
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            {/* ================================================ */}
                            <tr className="bg-gray-50">
                                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b">Name</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b">PID</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b">Status</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {processes.map((process: any) => ( // Dùng 'any' nếu type chưa khớp
                                <tr key={process.pid} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{process.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{process.pid}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${process.status === 'Running' // (Kiểm tra xem agent có trả về status không)
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                        >
                                            {process.status || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleKillProcess(process.pid)}
                                            disabled={isLoading || !selectedAgentId} // Thêm disabled
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Kill
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // Sử dụng component <ApplicationsTab /> trực tiếp
    const applicationsContent = (
        <ApplicationsTab />
    );

    const tabs = [
        { id: 'processes', label: 'Processes', content: processesContent },
        { id: 'applications', label: 'Applications', content: applicationsContent },
    ];

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Process & App Manager</h2>
            <Tabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
        </div>
    );
}