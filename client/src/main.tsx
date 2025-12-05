import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
// QUAN TRỌNG: Phải giữ dòng này
import { SocketProvider } from './contexts/SocketContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <SocketProvider>
            <App />
        </SocketProvider>
    </StrictMode>
);