import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.static('public'));

const rooms = new Map();
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  ws.roomId = null;
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch(message.type) {
      case 'create-room':
        const roomId = uuidv4();
        rooms.set(roomId, {
          creator: ws,
          participants: new Set([ws])
        });
        ws.roomId = roomId;
        ws.send(JSON.stringify({ type: 'room-created', roomId }));
        break;

      case 'join-room':
        if (rooms.has(message.roomId)) {
          const room = rooms.get(message.roomId);
          room.participants.add(ws);
          ws.roomId = message.roomId;
          ws.send(JSON.stringify({ type: 'room-joined', roomId: message.roomId }));
        }
        break;

      case 'offer':
      case 'answer':
      case 'candidate':
        broadcastToRoom(ws.roomId, data, ws);
        break;
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      const room = rooms.get(ws.roomId);
      room.participants.delete(ws);
      if (room.participants.size === 0) {
        rooms.delete(ws.roomId);
      }
    }
  });
});

function broadcastToRoom(roomId, data, sender) {
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    room.participants.forEach(client => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}

app.listen(3000, () => console.log('http://localhost:3000/'));