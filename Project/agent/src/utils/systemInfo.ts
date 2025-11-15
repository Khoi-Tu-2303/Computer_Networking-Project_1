import si from "systeminformation";

export async function getSystemInfo() {
    const osInfo = await si.osInfo();
    const mem = await si.mem();
    const cpu = await si.cpu();

    return {
        hostname: osInfo.hostname,
        platform: osInfo.platform,
        arch: osInfo.arch,
        totalmem: mem.total,
        cpu: cpu.manufacturer + " " + cpu.brand,
    };
}
