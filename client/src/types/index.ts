export interface Process {
  id: string;
  name: string;
  pid: number;
  status: 'Running' | 'Sleeping' | 'Stopped';
}

export interface Application {
  id: string;
  name: string;
  isRunning: boolean;
}

export interface KeylogEntry {
  id: string;
  timestamp: string;
  key: string;
}
export interface KeylogEntry {
    id: string;
    timestamp: string;
    key: string;
}

export interface ElectronAPI {
    startSystemLogging: () => Promise<boolean>;
    stopSystemLogging: () => Promise<boolean>;
    clearSystemLogs: () => Promise<boolean>;
    getSystemLogs: () => Promise<KeylogEntry[]>;
    getLoggingStatus: () => Promise<boolean>;
    onKeyLog: (callback: (log: KeylogEntry) => void) => void;
    removeAllListeners: (channel: string) => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}