
import express from 'express'
import getConfig from "./utils/config";
import cors from "cors";
import { fetchActionsStart, notifyActionsRefresher } from './services/actions-fetcher';
import { notifyDataRefresher, startDataRefreshTimer } from './services/data-refresher';
import { dbClient, initializeDatabase } from './utils/database';
import { initializeAPI } from './API';
import { notifyDataAccessor } from './services/data-access';

const config = getConfig();
const app = express();
app.use(cors());

initializeAPI(app);

export const triggerDBinitialize = () => {
  initializeDatabase().then(() => {

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
  });
}

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Server listening on port ${config.port}`);
  triggerDBinitialize();
})