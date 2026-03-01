import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Matchmaker } from './Matchmaker.js';
import { GameDatabase } from './Database.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const db = new GameDatabase();
const matchmaker = new Matchmaker(io);

app.get('/api/leaderboard', (_req, res) => {
  const leaders = db.getLeaderboard(20);
  res.json(leaders);
});

app.get('/api/profile/:id', (req, res) => {
  const profile = db.getOrCreatePlayer(req.params.id);
  res.json(profile);
});

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  db.getOrCreatePlayer(socket.id);

  socket.on('message', (msg) => {
    switch (msg.type) {
      case 'JOIN_QUEUE':
        matchmaker.addToQueue(socket);
        break;
      case 'LEAVE_QUEUE':
        matchmaker.removeFromQueue(socket.id);
        break;
      case 'PLAY_BOT':
        matchmaker.startBotMatch(socket);
        break;
      default:
        matchmaker.handleMessage(socket.id, msg);
        break;
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    matchmaker.handleDisconnect(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`DIG server running on :${PORT}`);
});
