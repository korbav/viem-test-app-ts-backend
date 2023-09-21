import { WebSocketServer } from 'ws';
import { initializeWebSocketHandler } from '../services/data-refresher';

export function initializeWebSocketServer(wsServer: WebSocketServer) {
    wsServer.on('connection', function connection(ws) {
        initializeWebSocketHandler((message) => ws.send(message))
    });
}