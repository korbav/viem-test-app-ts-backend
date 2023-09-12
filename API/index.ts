import {Express, Request, Response} from "express";
import { triggerDBinitialize } from "..";
import { actionsFetchTimerIntervalRef } from "../services/actions-fetcher";
import { dataRefreshTimerIntervalRef } from "../services/data-refresher";
import { resetDatabase } from "../utils/database";
import { getBalances, getDailyVolumes, getOwnerAllowances, getUsersOperations } from "../services/data-access";


async function resetDB() {
    clearInterval(dataRefreshTimerIntervalRef);
    clearInterval(actionsFetchTimerIntervalRef);
    resetDatabase().then(triggerDBinitialize)
}

export const initializeAPI = (app: Express) => {
    app.delete("/all", (_req: Request, res: Response) => {
        resetDB().then(() => res.send("DB reset done"))
    });

    app.get("/allowances/:owner", (req: Request, res: Response) => {
        const { owner } = req.params;
        getOwnerAllowances(owner).then(d => res.send(d));
    });

    app.get("/operations/:user?", (req: Request, res: Response) => {
        if(req.params.user) { // Specific user operations
            getUsersOperations(req.params.user).then(d => res.send(d));
        } else { // All users operations
            getUsersOperations().then(d => res.send(d));
        }
    });

    app.get("/balances", (_req: Request, res: Response) => {
        getBalances().then(d => res.send(d));
    });


    app.get("/dailyvolumes", (_req: Request, res: Response) => {
        getDailyVolumes().then(d => res.send(d));
    });
}

