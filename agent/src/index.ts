// file index.ts
import { initSocket } from "./core/socket.js";
import { loadConfig } from "./config/env.js";
import { initHeartbeat } from "./core/heartbeat.js";
import { logger } from "./utils/logger.js";

async function main() {
  const config = loadConfig();
  const socket = await initSocket(config);

  initHeartbeat(socket, config);

  logger.info(`Agent ${config.AGENT_ID} initialized.`);
}

main().catch((err) => {
  console.error("Agent startup error:", err);
});
