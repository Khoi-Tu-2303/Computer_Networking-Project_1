import { io, Socket } from "socket.io-client";
import { AgentConfig } from "../config/env.js";
import { handleCommand } from "./commandHandler.js";
// 1. Import "RequestMessage" (ngôn ngữ CHUẨN)
import { RequestMessage } from "../protocol.js";
import { logger } from "../utils/logger.js";

// Bỏ "getSystemInfo" đi, chúng ta không dùng "register_agent" nữa
// import { getSystemInfo } from "../utils/systemInfo.js";

export async function initSocket(config: AgentConfig): Promise<Socket> {
    const socket = io(`${config.SERVER_URL}/agents`, {
        auth: { agentId: config.AGENT_ID },
        reconnection: true,
    });

    socket.on("connect", async () => {
        logger.info(`Connected to server as ${config.AGENT_ID}`);

        // 2. XÓA BỎ DÒNG "register_agent" Ở ĐÂY
        // (Server sẽ tự biết khi chúng ta kết nối)
    });

    socket.on("disconnect", (reason) => {
        logger.warn(`Disconnected: ${reason}`);
    });

    // 3. SỬA CHỮ KÝ Ở ĐÂY
    socket.on("request", async (msg: RequestMessage) => {
        // 4. XÓA BỎ TOÀN BỘ "agentRequest"
        // Gửi thẳng "msg" (gói tin chuẩn) vào handler
        await handleCommand(socket, msg, config);
    });

    return socket;
}