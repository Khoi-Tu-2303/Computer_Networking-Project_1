// file: src/types/index.ts

// Kiểu dữ liệu cho Process (khớp với code Server C# trả về)
export interface ProcessInfo {
    pid: number;
    name: string;
    title: string;
    type: 'APP' | 'PROC';
}

// Kiểu dữ liệu cho Application (nếu dùng riêng)
export interface AppInfo {
    pid: number;
    name: string;
    title: string;
}

// Kiểu dữ liệu Agent
export interface Agent {
    id: string;
    name: string;
    status: 'online' | 'offline';
}