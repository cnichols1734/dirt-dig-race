import { Server, Socket } from 'socket.io';
import { GameRoom } from './GameRoom.js';

export class Matchmaker {
  private io: Server;
  private queue: Array<{ socket: Socket; joinedAt: number }> = [];
  private rooms: Map<string, GameRoom> = new Map();
  private playerRoomMap: Map<string, string> = new Map();
  private botCheckInterval: ReturnType<typeof setInterval>;

  constructor(io: Server) {
    this.io = io;

    this.botCheckInterval = setInterval(() => {
      this.checkBotMatch();
    }, 5000);
  }

  addToQueue(socket: Socket) {
    if (this.queue.find(q => q.socket.id === socket.id)) return;
    this.queue.push({ socket, joinedAt: Date.now() });
    socket.emit('message', { type: 'QUEUE_JOINED', payload: { position: this.queue.length } });
    this.tryMatch();
  }

  removeFromQueue(socketId: string) {
    this.queue = this.queue.filter(q => q.socket.id !== socketId);
  }

  tryMatch() {
    while (this.queue.length >= 2) {
      const p1 = this.queue.shift()!;
      const p2 = this.queue.shift()!;

      const roomId = 'room-' + Math.random().toString(36).slice(2, 10);
      const room = new GameRoom(roomId, this.io);
      room.addPlayer(p1.socket, 'Player 1');
      room.addPlayer(p2.socket, 'Player 2');

      this.rooms.set(roomId, room);
      this.playerRoomMap.set(p1.socket.id, roomId);
      this.playerRoomMap.set(p2.socket.id, roomId);

      room.start();
    }
  }

  private checkBotMatch() {
    const now = Date.now();
    const expired = this.queue.filter(q => now - q.joinedAt > 30000);
    for (const p of expired) {
      this.queue = this.queue.filter(q => q.socket.id !== p.socket.id);

      const roomId = 'room-' + Math.random().toString(36).slice(2, 10);
      const room = new GameRoom(roomId, this.io);
      room.addPlayer(p.socket, 'Player');
      room.addBot();

      this.rooms.set(roomId, room);
      this.playerRoomMap.set(p.socket.id, roomId);

      room.start();
    }
  }

  startBotMatch(socket: Socket) {
    this.removeFromQueue(socket.id);

    const roomId = 'room-' + Math.random().toString(36).slice(2, 10);
    const room = new GameRoom(roomId, this.io);
    room.addPlayer(socket, 'Player');
    room.addBot();

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(socket.id, roomId);

    room.start();
  }

  handleMessage(socketId: string, msg: any) {
    const roomId = this.playerRoomMap.get(socketId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.handleMessage(socketId, msg);
  }

  handleDisconnect(socketId: string) {
    this.removeFromQueue(socketId);
    const roomId = this.playerRoomMap.get(socketId);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.removePlayer(socketId);
        if (room.players.size === 0) {
          this.rooms.delete(roomId);
        }
      }
      this.playerRoomMap.delete(socketId);
    }
  }

  getRoomForPlayer(socketId: string): GameRoom | undefined {
    const roomId = this.playerRoomMap.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  destroy() {
    clearInterval(this.botCheckInterval);
  }
}
