import { getActionsCollection, getAllowancesCollection, getApprovalsCollection, getBalancesCollection, getDailyBusdVolumesCollection, getTransfersCollection } from "../utils/database";
import BUSD from "../assets/BUSD.json";
import { Address, Block as VBlock } from "viem";
import { Document } from "mongodb";
import { getTestClient } from "../utils/client";
import getConfig from "../utils/config";
import { unset } from "lodash";

const contractAddress = (BUSD.networks["80001"].address as Address).toLowerCase();
const collation = { locale: 'en', strength: 2 };

let isConnected = true;

export function notifyDataRefresher(connected: boolean) {
  isConnected = connected;
}

async function getAllUsers():  Promise<string[]> {
    if(!isConnected) {
        return [];
    }
    const filter: Document = {}; // Actions are already filtered by contract address in the database, no need to filter again
    const actionsCollection = getActionsCollection();
    const users0: any[] = await actionsCollection.distinct("args.from", filter, { collation });
    const users1: any[] = await actionsCollection.distinct("args.to", filter, { collation });
    const users2: any[] = await actionsCollection.distinct("args.owner", filter, { collation });
    const users3: any[] = await actionsCollection.distinct("args.spender", filter, { collation });
    const users = [...users0, ...users1, ...users2, ...users3].map(x => x.toLowerCase())
    const uniqueUsers = [...new Set([...users])];

    return uniqueUsers;
}


async function computeAllUsersAllowances(): Promise<void> {
    if(!isConnected) {
        return;
    }
    const allUsers = await getAllUsers();
    const allAllowances: Record<string, any> = {};

    if(allUsers.length > 0) {
         for(let user of allUsers) {
             const actionsCollection = getActionsCollection();
             const filter: Document = { eventName: 'Approval', address: contractAddress, "args.owner": user };
             const approvalActions = await actionsCollection.find(filter, {collation}).sort({ blockNumber: -1, transactionIndex: -1 }).toArray();
             const approvalActionsFiltered: any[] = [];
             for(let approval of approvalActions) {
                if(!approvalActionsFiltered.some(d => d.args.spender.toLowerCase() === approval.args.spender.toLowerCase())) {
                    approvalActionsFiltered.push(approval)
                }
             }
             allAllowances[user] = approvalActionsFiltered;
         }
     
         // save to DB
         const formattedAllowances = Object.keys(allAllowances)
            .filter((k) => k && allAllowances[k].length > 0)
            .map((k: any) => ({
                _id: k,
                owner: k,
                spenders: allAllowances[k].map((data: any) => ({
                    spender: data.args.spender,
                    value: data.args.value.toString(),
                }))
            }));

         if(formattedAllowances.length > 0) {
            const bulkOperations = formattedAllowances.map((allowance) => {
                unset(allowance, "_id")
                return {
                    updateOne: {
                      filter: { owner: allowance.owner }, 
                      update: { $set: allowance }, 
                      upsert: true,
                    },
                    collation
                };
            });
            if(isConnected) {
                await getAllowancesCollection().bulkWrite(bulkOperations)
            }
            
         }
    }
}


async function computeAllUsersTransfers(): Promise<void> {
    if(!isConnected) {
        return;
    }
    const actionsCollection = getActionsCollection();
    const filter: Document = { eventName: 'Transfer', address: contractAddress };
    const allUsersTransfers: any[] = [...await actionsCollection.find(filter, {collation}).toArray()]
    const retainedTransfers = [];

    for(let transfer of allUsersTransfers) {
        if(!await getTransfersCollection().findOne({ _id: transfer._id})) {
            retainedTransfers.push(transfer);
        }
    }

    // save to DB
    if(isConnected && retainedTransfers.length > 0) {
        await getTransfersCollection().insertMany([...new Set([...retainedTransfers])], { ordered: false });
    }
}

async function computeAllUsersApprovals(): Promise<void> {
    if(!isConnected) {
        return;
    }

    const actionsCollection = getActionsCollection();
    const filter: Document = { eventName: 'Approval' };
    const allUsersApprovals = await actionsCollection.find(filter, {collation}).toArray();

    const retainedApprovals: any[] = [];

    for(let approval of allUsersApprovals) {
        if(!await getApprovalsCollection().findOne({ _id: approval._id})) {
            retainedApprovals.push(approval);
        }
    }

    // save to DB
    if(isConnected && retainedApprovals.length > 0) {
        await getApprovalsCollection().insertMany([...new Set([...retainedApprovals])], { ordered: false });
    }
}

async function computeDailyBUSDVolumes(): Promise<void> {
    if(!isConnected) {
        return;
    }
    const transfers: any[] = await getTransfersCollection().find().toArray();
    const volumes: Record<number, bigint> = {};
    const blockCache : Record<string, number> = {};
    for(let transfer of transfers) {
        let timestamp;
        if(blockCache.hasOwnProperty(transfer.blockNumber.toString())) {
            timestamp = blockCache[transfer.blockNumber.toString()]
        } else {
            const block: VBlock =  await getTestClient().getBlock({ blockNumber: transfer.blockNumber });
            const d = new Date(Number(block.timestamp) * 1000);
            d.setHours(0,0,0,0);
            timestamp = d.getTime()
            blockCache[transfer.blockNumber.toString()] = timestamp;
        }
        
        if(!volumes.hasOwnProperty(timestamp)) {
            volumes[timestamp] = 0n;
        }

        volumes[timestamp] += BigInt(transfer.args.value);
    }

    const formattedData = Object.keys(volumes).map((timestamp: any) => ({
        timestamp: Number(timestamp),
        value: volumes[timestamp].toString()
    }));

    // save to DB
    if(formattedData.length > 0) {
        const bulkOperations = formattedData.map((volume) => ({
            updateOne: {
              filter: { timestamp: volume.timestamp }, 
              update: { $set: volume }, 
              upsert: true,
            },
        }));

        if(isConnected) {
            await getDailyBusdVolumesCollection().bulkWrite(bulkOperations)
        }
        
    }
}


async function computeAllUsersBalances():  Promise<void> {
    if(!isConnected) {
        return;
    }
    const allUsers = await getAllUsers();
    const balances: Record<string, bigint> = {};
    for(let user of allUsers) {
        balances[user] = await getTestClient().getBalance({ address: user as Address });
    }

    const formattedData = Object.keys(balances).map((owner: any) => ({
        owner,
        value: balances[owner].toString()
    }));

    // save to DB
    if(formattedData.length > 0) {
        const bulkOperations = formattedData.map((balance) => ({
            updateOne: {
              filter: { timestamp: balance.owner }, 
              update: { $set: balance }, 
              upsert: true,
            },
        }));

        if(isConnected) {
            await getBalancesCollection().bulkWrite(bulkOperations);
        }
    }
}

export async function dataRefreshTimer() {
    if(!isConnected) {
        return;
    }
    try {
        await computeAllUsersBalances();
        await computeAllUsersTransfers();
        await computeAllUsersApprovals();
        await computeAllUsersAllowances();
        await computeDailyBUSDVolumes();
    } catch(e) {
        console.log(e);
    }
}

export let dataRefreshTimerIntervalRef: NodeJS.Timeout;

export function startDataRefreshTimer() {
    dataRefreshTimer().then(() => {
        dataRefreshTimerIntervalRef = setInterval(async () => {
            if(!isConnected) {
                clearInterval(dataRefreshTimerIntervalRef)
                return;
            }
            await dataRefreshTimer();
        }, getConfig().dataComputerThrottleTime)
    });
}




