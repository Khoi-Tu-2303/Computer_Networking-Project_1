// file protocol.ts
export type ProtocolVersion = '1.0';


export type MessageType = 'request' | 'response' | 'event';


export interface MessageMeta {
    timestamp: number;
    origin?: string;
    agentId?: string;
}


export interface BaseMessage {
    protocolVersion: ProtocolVersion;
    id: string;
    type: MessageType;
    meta?: MessageMeta;
}


export interface RequestMessage extends BaseMessage {
    type: 'request';
    action: string;
    payload?: any;
    auth?: { token?: string };
}


export interface ResponseMessage extends BaseMessage {
    type: 'response';
    status: 'ok' | 'error';
    payload?: any;
    error?: { code: string; message: string; details?: any } | null;
}


export interface EventMessage extends BaseMessage {
    type: 'event';
    event: string;
    payload?: any;
}


// Convenience union
export type AnyMessage = RequestMessage | ResponseMessage | EventMessage;