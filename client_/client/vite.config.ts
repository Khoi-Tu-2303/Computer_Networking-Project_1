import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './',
    server: {
        // '0.0.0.0' có nghĩa là "chạy trên tất cả các địa chỉ IP"
        // (bao gồm cả localhost và IP mạng LAN của bạn)
        host: '0.0.0.0'
    },
    optimizeDeps: {
        // Thêm vào để khắc phục các sự cố liên quan đến pre-bundling của Vite
        exclude: ['lucide-react'],
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    define: {
        'process.env': process.env,   // ‼️ THÊM DÒNG NÀY
    },
})