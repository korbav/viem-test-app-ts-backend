import { WebSocketServer, WebSocket } from 'ws';
import { initializeWebSocketHandler } from '../services/data-refresher';

export function initializeWebSocketServer(wsServer: WebSocketServer) {
    wsServer.on('connection', function connection(ws) {
        initializeWebSocketHandler((message) => {
            wsServer.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(message);
                }
              });
        })
    });
}