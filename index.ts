
import express from 'express'
import getConfig from "./utils/config";
import cors from "cors";
import { WebSocketServer } from 'ws';
import { fetchActionsStart, notifyActionsRefresher } from './services/actions-fetcher';
import { notifyDataRefresher, startDataRefreshTimer, handleLiveRefresh } from './services/data-refresher';
import { dbClient, initializeDatabase } from './utils/database';
import { initializeAPI } from './API';
import { notifyDataAccessor } from './services/data-access';
import { subscribeToWebSocketTestClient } from './utils/client';
import { initializeWebSocketServer } from './utils/websocket-server';

const config = getConfig();
const app = express();

let reconnectTimer: NodeJS.Timeout | undefined;
function connectWebSocketServer() {
  clearTimeout(reconnectTimer);
  const wsServer = new WebSocketServer({
    port: config.webSocketPort,
  });
  wsServer.on("close", () => {
    reconnectTimer = setTimeout(connectWebSocketServer, 3000);
  });
  initializeWebSocketServer(wsServer);
}

app.use(cors());

initializeAPI(app);

export const triggerDBinitialize = () => {

  initializeDatabase().then(async () => {

    dbClient.on("close", () => {
      notifyActionsRefresher(false);
      notifyDataRefresher(false);
      notifyDataAccessor(false);
    });

    dbClient.on("open", () => {
        notifyActionsRefresher(true);
        notifyDataRefresher(true);
        notifyDataAccessor(true);
    });

    fetchActionsStart();
    startDataRefreshTimer();
    subscribeToWebSocketTestClient(handleLiveRefresh);
    connectWebSocketServer();
  });
}

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Server listening on port ${config.port}`);
  triggerDBinitialize();
})