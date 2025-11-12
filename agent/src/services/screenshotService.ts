import screenshot from 'screenshot-desktop';
import { logger } from '../utils/logger.js';

/**
 * Chụp ảnh màn hình chính và trả về dưới dạng Base64.
 */
export async function takeScreenshot() {
    try {
        // Chụp màn hình, định dạng buffer (dữ liệu thô)
        const imgBuffer = await screenshot({ format: 'png' });

        // Chuyển buffer thành chuỗi Base64
        const base64Image = imgBuffer.toString('base64');

        // Trả về object chứa chuỗi Base64
        return { imageBase64: base64Image };

    } catch (err: any) {
        logger.error(`Failed to take screenshot: ${err.message}`);
        throw new Error(`Failed to take screenshot: ${err.message}`);
    }
}