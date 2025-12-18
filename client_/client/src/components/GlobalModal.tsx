import { useEffect, useRef } from 'react';
import { X, AlertTriangle, Info, CheckCircle, Power } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

export default function GlobalModal() {
    const { modalConfig, closeModal } = useSocket();
    const btnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (modalConfig) {
            setTimeout(() => btnRef.current?.focus(), 100);
        }
    }, [modalConfig]);

    if (!modalConfig) return null;

    const { type, title, message, onConfirm, showCancel } = modalConfig;

    // Icon logic vẫn giữ nguyên để phân biệt loại thông báo, 
    // nhưng màu sắc sẽ được override bên dưới theo theme Hacker
    let Icon = Info;
    if (type === 'error') Icon = AlertTriangle;
    if (type === 'success') Icon = CheckCircle;
    if (type === 'warning') Icon = Power;

    return (
        // Overlay nền tối
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">

            {/* Modal Box: Viền xanh neon, nền đen, đổ bóng xanh (Glow effect) */}
            <div className="w-full max-w-sm bg-black border border-green-500 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.3)] relative overflow-hidden">

                {/* Decoration: Dòng kẻ quét ngang trang trí (Optional scanline effect) */}
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500/30"></div>

                <div className="p-6 text-center">
                    {/* Icon Wrapper: Vòng tròn xanh mờ */}
                    <div className="mx-auto mb-4 p-3 rounded-full bg-green-500/10 w-fit border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                        <Icon className="w-8 h-8 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" />
                    </div>

                    {/* Title: Font Mono, màu xanh neon */}
                    <h3 className="text-xl font-mono font-bold mb-2 text-green-400 tracking-widest uppercase drop-shadow-sm">
                        {title}
                    </h3>

                    {/* Message: Màu xanh nhạt hơn, style code */}
                    <p className="text-green-600/80 text-sm font-mono mb-6 leading-relaxed">
                        {`> ${message}`} <span className="animate-pulse">_</span>
                    </p>

                    <div className="flex gap-4 justify-center">
                        {showCancel && (
                            <button
                                onClick={closeModal}
                                className="px-5 py-2 border border-green-900/50 text-green-700 rounded hover:bg-green-900/20 hover:text-green-500 transition-all font-mono text-xs uppercase tracking-wider"
                            >
                                [ CANCEL ]
                            </button>
                        )}

                        {/* Nút Confirm: Màu đỏ nổi bật (Danger zone style) */}
                        <button
                            ref={btnRef}
                            onClick={() => {
                                if (onConfirm) onConfirm();
                                closeModal();
                            }}
                            className={`px-6 py-2 bg-red-500/10 border border-red-500 text-red-500 rounded 
                                hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] 
                                transition-all font-bold font-mono text-xs tracking-widest uppercase`}
                        >
                            {showCancel ? 'CONFIRM' : 'CLOSE'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}