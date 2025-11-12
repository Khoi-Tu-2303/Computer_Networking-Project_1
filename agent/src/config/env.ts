import dotenv from "dotenv";
dotenv.config();

export interface AgentConfig {
    SERVER_URL: string;
    AGENT_ID: string;
    HEARTBEAT_INTERVAL: number;
}

export function loadConfig(): AgentConfig {
    if (!process.env.SERVER_URL || !process.env.AGENT_ID) {
        throw new Error("Missing SERVER_URL or AGENT_ID in environment");
    }
    return {
        SERVER_URL: process.env.SERVER_URL!,
        AGENT_ID: process.env.AGENT_ID!,
        HEARTBEAT_INTERVAL: Number(process.env.HEARTBEAT_INTERVAL) || 10000,
    };
}
