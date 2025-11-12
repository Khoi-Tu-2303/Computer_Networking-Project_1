import { Socket } from "socket.io-client";
import { AgentConfig } from "../config/env.js";
import { logger } from "../utils/logger.js";

export function initHeartbeat(socket: Socket, config: AgentConfig) {
    setInterval(() => {
        socket.emit("heartbeat", { agentId: config.AGENT_ID, ts: Date.now() });
        logger.debug("Heartbeat sent.");
    }, config.HEARTBEAT_INTERVAL);
}
