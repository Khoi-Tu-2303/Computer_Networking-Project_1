import { useState } from 'react';
import { Camera } from 'lucide-react';
// 1. IMPORT HOOK VÀ SERVICE
import { useSocket } from '../contexts/SocketContext';
import { sendCommand } from '../services/socketService';

export default function ScreenshotCard() {
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    // 2. LẤY AGENT ID
    const { selectedAgentId, isConnected } = useSocket();

    const handleTakeScreenshot = async () => {
        if (!selectedAgentId) {
            alert('Vui lòng chọn một Agent trước.');
            return;
        }

        setLoading(true);
        setScreenshot(null); // Xóa ảnh cũ

        try {
            // 3. GỌI API THẬT
            const response = await sendCommand(selectedAgentId, 'take_screenshot');

            // 4. KIỂM TRA VÀ HIỂN THỊ ẢNH BASE64
            // Agent trả về: { imageBase64: "..." }
            if (response.payload && response.payload.imageBase64) {
                // Thêm tiền tố data URL để trình duyệt hiểu
                setScreenshot(`data:image/png;base64,${response.payload.imageBase64}`);
            } else {
                throw new Error("Invalid response from agent");
            }

        } catch (error: unknown) { // <-- 5. DÙNG UNKNOWN

            // 6. SỬA LỖI Ở ĐÂY: KIỂM TRA LỖI AN TOÀN
            let errorMessage = "Lỗi không xác định";
            if (error instanceof Error) {
                errorMessage = error.message; // <-- Giờ TS mới cho phép
            }
            alert(`Lỗi khi chụp màn hình: ${errorMessage}`);
        }

        setLoading(false);
    };

    const isDisabled = loading || !selectedAgentId || !isConnected;

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Screenshot
            </h3>

            <button
                onClick={handleTakeScreenshot}
                disabled={isDisabled} // 5. THÊM DISABLED
                className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {loading ? 'Capturing...' : 'Take Screenshot'}
            </button>

            <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 min-h-[300px] flex items-center justify-center">
                {screenshot ? (
                    // 7. SỬA HIỂN THỊ: Dùng object-contain để ảnh không bị vỡ/giãn
                    <img src={screenshot} alt="Screenshot" className="w-full h-full object-contain" />
                ) : loading ? (
                    <p className="text-gray-500 text-sm">Loading...</p>
                ) : (
                    <p className="text-gray-400 text-sm">No screenshot taken</p>
                )}
            </div>
        </div>
    );
}