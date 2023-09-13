import fs from 'fs'
import express from 'express'
import getConfig from "./utils/config";
import cors from "cors";
import https from "https";
import { fetchActionsStart, notifyActionsRefresher } from './services/actions-fetcher';
import { notifyDataRefresher, startDataRefreshTimer } from './services/data-refresher';
import { dbClient, initializeDatabase } from './utils/database';
import { initializeAPI } from './API';

const config = getConfig();
const app = express();
app.use(cors());

initializeAPI(app);

export const triggerDBinitialize = () => {
  initializeDatabase().then(() => {

    dbClient.on("close", () => {
      notifyActionsRefresher(false);
      notifyDataRefresher(false);
    });

    dbClient.on("open", () => {
        notifyActionsRefresher(true);
        notifyDataRefresher(true);
    });

    fetchActionsStart();
    startDataRefreshTimer();
  });
}

https
  .createServer({
    key: fs.readFileSync("/home/ubuntu/key.pem"),
    cert: fs.readFileSync("/home/ubuntu/cert.pem"),
  }, app)
  .listen(config.port, "0.0.0.0", () => {
    console.log(`Server listening on port ${config.port}`);
    triggerDBinitialize();
})