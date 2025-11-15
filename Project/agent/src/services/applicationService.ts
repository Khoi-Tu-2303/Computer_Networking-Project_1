import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

/**
 * Kiểu dữ liệu trả về cho client.
 * Phải khớp với interface 'AppInfo' bên client.
 */
interface AppInfo {
    pid: number;
    name: string;
    title: string;
}

/**
 * Lấy danh sách các ứng dụng đang chạy có cửa sổ (window title).
 * Lưu ý: Lệnh 'powershell' này chỉ hoạt động trên Windows.
 */
export async function getApplications(): Promise<AppInfo[]> {
    // Kiểm tra nếu không phải Windows thì trả về mảng rỗng
    if (os.platform() !== 'win32') {
        console.warn('Get applications with titles is only supported on Windows. Returning empty list.');
        return [];
    }

    // Lệnh PowerShell:
    // 1. Get-Process: Lấy tất cả tiến trình
    // 2. Where-Object: Lọc ra những cái có MainWindowTitle (không rỗng)
    // 3. Select-Object: Chỉ chọn 3 cột 'Id', 'ProcessName', 'MainWindowTitle'
    // 4. Đổi tên 'Id' thành 'pid', 'ProcessName' thành 'name', 'MainWindowTitle' thành 'title' (để khớp với client)
    // 5. ConvertTo-Json: Chuyển kết quả thành chuỗi JSON
    const command = `powershell "Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object @{Name='pid'; Expression={$_.Id}}, @{Name='name'; Expression={$_.ProcessName}}, @{Name='title'; Expression={$_.MainWindowTitle}} | ConvertTo-Json"`;

    try {
        // Chạy lệnh
        const { stdout } = await execAsync(command);

        if (!stdout) {
            return []; // Không có kết quả
        }

        // Parse chuỗi JSON
        const result = JSON.parse(stdout);

        // PowerShell có thể trả về 1 object (nếu chỉ có 1 app)
        // hoặc 1 mảng (nếu có nhiều app). Ta chuẩn hóa nó về mảng.
        if (Array.isArray(result)) {
            return result as AppInfo[]; // Trả về mảng
        } else if (result) {
            return [result as AppInfo]; // Trả về mảng có 1 phần tử
        } else {
            return []; // Không có gì
        }
    } catch (error) {
        console.error('Error fetching applications:', error);
        throw new Error('Failed to get application list.');
    }
}

/**
 * Khởi chạy một ứng dụng bằng tên của nó.
 * Ví dụ: 'notepad.exe', 'calc.exe'
 */
export async function startApplication(payload: { appName: string }): Promise<{ status: string; message: string }> {
    const { appName } = payload;

    // Sanitize input: Chỉ cho phép chữ, số, dấu chấm, gạch dưới, gạch ngang và khoảng trắng
    const sanitizedName = appName.replace(/[^a-zA-Z0-9.\-_\s]/g, '');

    if (!sanitizedName) {
        throw new Error('Invalid application name.');
    }

    // Dùng lệnh 'start' của Windows, nó an toàn và linh hoạt hơn
    const command = `start ${sanitizedName}`;

    try {
        await execAsync(command);
        return { status: 'ok', message: `Successfully attempted to start ${sanitizedName}` };
    } catch (error) {
        console.error(`Error starting application ${sanitizedName}:`, error);
        throw new Error(`Failed to start ${sanitizedName}.`);
    }
}