import React, { useState, useEffect } from 'react';
import { RefreshCw, Play, XCircle } from 'lucide-react';

// SỬA LỖI IMPORT:
// Thử đường dẫn 'core' giống như project 'agent'
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService'; // <-- Dùng hàm sendCommand

/**
 * Định nghĩa cấu trúc dữ liệu cho một ứng dụng
 */
interface AppInfo {
    pid: number;
    name: string;
    title: string;
}

// Gợi ý các app phổ biến
const commonApps = [
    { value: "notepad.exe", label: "Notepad" },
    { value: "calc.exe", label: "Calculator" },
    { value: "cmd.exe", label: "Command Prompt" },
    { value: "explorer.exe", label: "File Explorer" },
    { value: "chrome.exe", label: "Google Chrome" },
    { value: "msedge.exe", label: "Microsoft Edge" },
    { value: "powershell.exe", label: "PowerShell" },
];

/**
 * Component hiển thị tab "Applications"
 * Đã cập nhật Responsive & Thêm lịch sử "Recently Killed" (VÀ SỬA LỖI LOGIC)
 */
export function ApplicationsTab() {
    const { selectedAgentId } = useSocket();
    const [applications, setApplications] = useState<AppInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newAppName, setNewAppName] = useState("");
    const [recentlyKilledApps, setRecentlyKilledApps] = useState<AppInfo[]>([]);

    /**
     * Hàm gọi lên agent để yêu cầu danh sách ứng dụng
     */
    const fetchApplications = async () => {
        if (!selectedAgentId) {
            // Đừng alert, chỉ return thầm lặng
            return;
        }
        console.log("Đang yêu cầu danh sách applications...");
        setIsLoading(true);
        try {
            const response = await sendCommand(
                selectedAgentId,
                'list_applications'
            );
            setApplications(response.payload || []);
        } catch (error: any) {
            alert(`Lỗi khi lấy applications: ${error.message}`);
            setApplications([]);
        }
        setIsLoading(false);
    };

    /**
     * Hàm xử lý kill một ứng dụng
     */
    const handleKillApp = async (appToKill: AppInfo) => {
        if (!selectedAgentId) {
            alert('Vui lòng chọn một Agent trước.');
            return;
        }
        // Dùng confirm (như file trước)
        if (!window.confirm(`Bạn có chắc muốn kill "${appToKill.title || appToKill.name}" (PID: ${appToKill.pid})?`)) {
            return;
        }

        try {
            await sendCommand(selectedAgentId, 'kill_process', { pid: appToKill.pid });

            // Thêm vào danh sách 'recently killed'
            setRecentlyKilledApps(prev => {
                // Kiểm tra xem app này (với PID này) đã có trong danh sách chưa
                const existing = prev.find(a => a.pid === appToKill.pid);
                if (existing) return prev; // Nếu có rồi thì không thêm nữa
                // Thêm app vào đầu danh sách và giới hạn 5 app
                const newList = [appToKill, ...prev];
                return newList.slice(0, 5);
            });

            // Tải lại danh sách chính
            fetchApplications();
        } catch (error: any) {
            alert(`Lỗi khi kill process: ${error.message}`);
        }
    };

    /**
     * Hàm xử lý khởi động một ứng dụng
     */
    const handleStartApp = async (appName: string) => {
        if (!appName.trim()) {
            alert("Vui lòng nhập tên file .exe (ví dụ: notepad.exe)");
            return;
        }
        if (!selectedAgentId) {
            alert('Vui lòng chọn một Agent trước.');
            return;
        }

        console.log(`Đang yêu cầu start app: ${appName}`);
        try {
            await sendCommand(selectedAgentId, 'start_application', { appName: appName });

            // Nếu appName này đang được nhập ở ô input, thì xóa nó
            if (newAppName === appName) {
                setNewAppName("");
            }

            // SỬA LỖI LOGIC: Xóa app này khỏi "Recently Killed"
            // (Dùng toLowerCase để so sánh không phân biệt hoa thường)
            setRecentlyKilledApps(prev =>
                prev.filter(app => app.name.toLowerCase() !== appName.toLowerCase())
            );

            // Chờ 2.5 GIÂY để app kịp khởi động rồi mới refresh
            setTimeout(() => {
                fetchApplications();
            }, 4500); // <-- THAY ĐỔI TỪ 1000 LÊN 2500

        } catch (error: any) {
            alert(`Lỗi khi start application: ${error.message}`);
        }
    };


    /**
     * Effect này sẽ fetch dữ liệu lần đầu khi Agent được chọn
     */
    useEffect(() => {
        if (selectedAgentId) {
            fetchApplications();
        } else {
            // Nếu không chọn agent, xóa sạch dữ liệu
            setApplications([]);
            setRecentlyKilledApps([]);
        }
    }, [selectedAgentId]); // Chạy lại khi selectedAgentId thay đổi

    return (
        <div className="py-4 animate-fade-in">

            {/* === KHUNG START APP (ĐÃ SỬA RESPONSIVE) === */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Start New Application</h3>
                {/* Sửa lại: Dùng flex-col cho di động và sm:flex-row cho màn hình lớn */}
                <form
                    className="flex flex-col sm:flex-row items-stretch gap-2"
                    onSubmit={(e) => { e.preventDefault(); handleStartApp(newAppName); }}
                >
                    <input
                        list="common-apps"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        placeholder="Ví dụ: notepad.exe"
                        // Sửa lại: w-full (trên di động) và sm:w-auto (trên desktop)
                        className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
                        disabled={!selectedAgentId}
                    />
                    <datalist id="common-apps">
                        {commonApps.map((app) => (
                            <option key={app.value} value={app.value}>{app.label}</option>
                        ))}
                        {/* SỬA LỖI GÕ NHẦM: </datalal> thành </datalist> */}
                    </datalist>

                    <button
                        type="submit"
                        disabled={isLoading || !selectedAgentId || !newAppName}
                        // Sửa lại: w-full (trên di động) và sm:w-auto (trên desktop)
                        className="flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 transition-all duration-150 w-full sm:w-auto"
                    >
                        <Play size={16} />
                        Start
                    </button>
                </form>
            </div>

            {/* === KHUNG LÀM MỚI VÀ BẢNG DỮ LIỆU === */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={fetchApplications}
                    disabled={isLoading || !selectedAgentId}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 transition-all duration-150"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    {isLoading ? 'Đang tải...' : 'Làm mới'}
                </button>
            </div>

            {/* === BẢNG DỮ LIỆU (CÓ THANH CUỘN VÀ STICKY HEADER) === */}
            {/* SỬA LỖI: Bỏ overflow-hidden, Thêm overflow-x-auto để cuộn ngang trên di động */}
            <div className="rounded-lg border border-gray-200 shadow-sm max-h-[500px] overflow-y-auto overflow-x-auto relative">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tiêu đề cửa sổ
                            </th>
                            {/* SỬA LỖI TYPO "font-m"edium" */}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tên Tiến Trình
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                PID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading && applications.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-gray-500">Đang tải danh sách ứng dụng...</td>
                            </tr>
                        ) : !applications || applications.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-gray-500">Không tìm thấy ứng dụng nào có cửa sổ đang chạy.</td>
                            </tr>
                        ) : (
                            applications.map((app) => (
                                <tr key={app.pid} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {/* Thêm truncate và title để xem đầy đủ khi hover */}
                                        <div className="text-sm font-medium text-gray-900 truncate" title={app.title}>{app.title || "(Không có tiêu đề)"}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{app.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            {app.pid}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleKillApp(app)}
                                            disabled={!selectedAgentId}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
                                        >
                                            <XCircle size={14} />
                                            Kill
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {/* SỬA LỖI GÕ NHẦM: </> thành </div> */}
            </div>

            {/* === TÍNH NĂNG MỚI: KHUNG "RECENTLY KILLED" === */}
            {/* Chỉ hiện khung này nếu có app trong danh sách */}
            {recentlyKilledApps.length > 0 && (
                <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Recently Killed</h3>
                    <p className="text-sm text-gray-600 mb-4">Khởi động lại ứng dụng bạn vừa đóng nhầm:</p>
                    <div className="flex flex-wrap gap-2">
                        {recentlyKilledApps.map((app) => (
                            <button
                                key={app.pid} // Dùng pid làm key cho an toàn
                                onClick={() => handleStartApp(app.name)} // Sửa ở đây
                                disabled={!selectedAgentId}
                                title={`Start ${app.name}`}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-gray-400 transition-all duration-150"
                            >
                                <Play size={14} />
                                {/* Chỉ hiện tên file (name) thay vì title (có thể rất dài) */}
                                {app.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}