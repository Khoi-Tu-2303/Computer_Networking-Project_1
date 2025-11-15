// file auther.ts
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { logger } from './logger';


const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';


export interface TokenPayload {
    agentId?: string;
    sub?: string;
    scope?: string[];
    exp?: number;
}


export function verifySocketAuth(socket: Socket): TokenPayload | null {
    // socket.handshake.auth is where the client can send token when using socket.io
    const token = (socket.handshake.auth && (socket.handshake.auth as any).token) || null;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
        return payload;
    } catch (err) {
        logger.warn('Invalid token on socket connect', (err as Error).message);
        return null;
    }
}