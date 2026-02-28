import { io, Socket as IOSocket } from 'socket.io-client';
import { ClientMessage, ServerMessage } from '@dig/shared';

type MessageHandler = (msg: ServerMessage) => void;

class SocketManager {
  private socket: IOSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<MessageHandler> = new Set();

  connect(url: string = 'http://localhost:3001') {
    if (this.socket?.connected) return;
    this.socket = io(url, { transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('message', (msg: ServerMessage) => {
      for (const handler of this.globalHandlers) {
        handler(msg);
      }
      const typeHandlers = this.handlers.get(msg.type);
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          handler(msg);
        }
      }
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });
  }

  send(msg: ClientMessage) {
    this.socket?.emit('message', msg);
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: string, handler: MessageHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  onAny(handler: MessageHandler) {
    this.globalHandlers.add(handler);
  }

  offAny(handler: MessageHandler) {
    this.globalHandlers.delete(handler);
  }

  get id(): string | undefined {
    return this.socket?.id;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketManager = new SocketManager();
