import express from 'express';
import WebSocket, { WebSocketServer } from 'ws'; 

const app = express();
app.use(express.static('public'));

const wss = new WebSocketServer({ port: 8080 }); 

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));