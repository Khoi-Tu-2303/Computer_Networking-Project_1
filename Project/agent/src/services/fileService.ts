import fs from "fs";
import path from "path";

/**
 * Liệt kê tất cả file và thư mục trong một thư mục cụ thể.
 */
export async function listFiles(dirPath: string) {
    try {
        const resolvedPath = path.resolve(dirPath);
        const files = await fs.promises.readdir(resolvedPath, { withFileTypes: true });

        // Tạo một mảng các "lời hứa" (promises) để lấy thông tin
        const fileDetailsPromises = files.map(async (f) => {
            const filePath = path.join(resolvedPath, f.name);
            let size = 0;
            let isDirectory = f.isDirectory();

            if (f.isFile()) {
                try {
                    // Dùng hàm stat BẤT ĐỒNG BỘ
                    const stats = await fs.promises.stat(filePath);
                    size = stats.size;
                } catch (statErr) {
                    // Bỏ qua nếu không thể đọc (ví dụ: permission denied)
                    console.error(`Could not stat file ${filePath}: ${statErr}`);
                }
            }

            return {
                name: f.name,
                path: filePath,
                isDirectory: isDirectory,
                size: size,
            };
        });

        // Chờ tất cả "lời hứa" hoàn thành
        return await Promise.all(fileDetailsPromises);

    } catch (err: any) {
        // Trả về một LỖI duy nhất, thay vì một object thành công
        throw new Error(`Failed to list files: ${err.message}`);
    }
}

/**
 * Đọc nội dung của một tệp văn bản.
 */
export async function readFileContent(filePath: string) {
    try {
        const resolvedPath = path.resolve(filePath);
        const data = await fs.promises.readFile(resolvedPath, "utf8");
        return { content: data }; // Trả về object chứa content
    } catch (err: any) {
        throw new Error(`Cannot read file: ${err.message}`);
    }
}

/**
 * Xóa tệp chỉ định.
 */
export async function deleteFile(filePath: string) {
    try {
        const resolvedPath = path.resolve(filePath);
        await fs.promises.unlink(resolvedPath);
        return { success: true }; // Trả về object xác nhận
    } catch (err: any) {
        throw new Error(`Cannot delete file: ${err.message}`);
    }
}