import si from "systeminformation";

/**
 * Dịch mã trạng thái của process thành chữ
 */
function translateProcessStatus(state: string): string {
    switch (state?.toUpperCase()) {
        case "R": return "Running";
        case "S": return "Sleeping";
        case "Z": return "Zombie";
        case "T": return "Stopped";
        case "D": return "Disk Sleep";
        default: return state || "Unknown";
    }
}

export async function listProcesses() {
    const procData = await si.processes();
    return procData.list.map((p) => ({
        pid: p.pid,
        name: p.name,
        cpu: p.cpu,
        mem: p.mem,
        status: translateProcessStatus(p.state),
    }));
}

/**
 * Kill process theo PID
 */
export async function killProcess(pid: number) {
    if (!pid) {
        throw new Error("PID is required to kill a process");
    }

    try {
        // Node.js có sẵn hàm process.kill()
        process.kill(pid, "SIGKILL");
        return { success: true, pid, message: "Process killed" };
    } catch (err: any) {
        throw new Error(`Failed to kill process ${pid}: ${err.message}`);
    }
}
