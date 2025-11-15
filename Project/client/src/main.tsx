import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 1. Import SocketProvider từ file context bạn đã tạo
import { SocketProvider } from './contexts/SocketContext.ts';

// 2. Lấy root element
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);

// 3. Bọc <App /> bằng <SocketProvider>
root.render(
    <StrictMode>
        <SocketProvider>
            <App />
        </SocketProvider>
    </StrictMode>
);