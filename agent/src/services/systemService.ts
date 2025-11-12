import { exec } from "child_process";
import { platform } from "os";
import { logger } from "../utils/logger.js";

function executeSystemCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                logger.error(`Exec error: ${stderr || error.message}`);
                reject(new Error(stderr || error.message));
                return;
            }
            resolve(stdout);
        });
    });
}

export async function shutdownSystem() {
    const osPlatform = platform();
    let command: string;

    if (osPlatform === 'win32') {
        command = 'shutdown /s /t 0'; // Tắt máy Windows ngay lập tức
    } else {
        command = 'shutdown -h now'; // Tắt máy Linux/macOS
    }
    
    logger.warn(`Executing system shutdown: ${command}`);
    // Gửi lệnh đi, không cần chờ phản hồi (vì máy sẽ tắt)
    executeSystemCommand(command); 
    return { success: true, message: "Shutdown command issued." };
}

export async function restartSystem() {
    const osPlatform = platform();
    let command: string;

    if (osPlatform === 'win32') {
        command = 'shutdown /r /t 0'; // Khởi động lại Windows ngay lập tức
    } else {
        command = 'shutdown -r now'; // Khởi động lại Linux/macOS
    }
    
    logger.warn(`Executing system restart: ${command}`);
    // Gửi lệnh đi, không cần chờ phản hồi
    executeSystemCommand(command);
    return { success: true, message: "Restart command issued." };
}