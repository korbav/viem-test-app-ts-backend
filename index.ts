
import express from 'express'
import getConfig from "./utils/config";
import cors from "cors";
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

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
  triggerDBinitialize();
})