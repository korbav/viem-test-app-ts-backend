import { getTestClient } from "../utils/client";
import { Address, parseAbi } from "viem";
import bigIntLib from "big-integer";
import BUSD from "../assets/BUSD.json";
import { getActionsCollection } from "../utils/database";
import { Action } from "../model/Action";
import getConfig from "../utils/config";


const getContractAddress = () => BUSD.networks["80001"].address as Address;

let isConnected = true;

export function notifyActionsRefresher(connected: boolean) {
  isConnected = connected;
}

export function fetchActionsStart() {
    startLatestActionsFetchTimer();
    fetchHistoryActions().then();
}

async function getOldestBlockInDatabase(): Promise<bigint|null> {
    // Retrieve the action in our collection having the smallest block number
    const actionsCollection = getActionsCollection();

    const oldestAction = await actionsCollection
      .find({})
      .sort({ blockNumber: 1 }) // Sort by blockNumber in ascending order
      .limit(1) // Limit the result to one document
      .project({ blockNumber: 1 }) // Project only the 'blockNumber' field
      .toArray();

    if (oldestAction.length === 0) {
      // Handle the case where no actions are found in the collection
      return null;
    }

    // Extract and return the smallest block number as a BigInt
    return BigInt(oldestAction[0].blockNumber);
}

async function getNewestBlockInDatabase(): Promise<bigint|null> {
    // Retrieve the action in our collection having the smallest block number
    const actionsCollection = getActionsCollection();

    const newestAction = await actionsCollection
      .find({})
      .sort({ blockNumber: -1 }) // Sort by blockNumber in ascending order
      .limit(1) // Limit the result to one document
      .project({ blockNumber: 1 }) // Project only the 'blockNumber' field
      .toArray();

    if (newestAction.length === 0) {
      // Handle the case where no actions are found in the collection
      return null;
    }

    // Extract and return the smallest block number as a BigInt
    return BigInt(newestAction[0].blockNumber);
}

async function storeActionsToDatabase(newActions: Action[]): Promise<void> {
  try {
    const actionsCollection = getActionsCollection();
    const retainedActions  = [];
    for(let action of newActions) {
      if(!await actionsCollection.findOne({ _id: action.transactionHash } as any, { collation: { locale: "en", strength: 2 }})) {
        retainedActions.push({ ...action, _id: action.transactionHash, args: { ...action.args, value: `${action.args.value.toString()}` } } as any)
      }
    }

    retainedActions.forEach((a: any) => {
      delete a["_id"]
    });

    if(retainedActions.length > 0) {
      await actionsCollection.insertMany(retainedActions, { ordered: false });
    }
  } catch (err) {
    console.error('Error storing the new action:', err);
  }
}

const actionsLoop = async (currentBlockNumber: bigint, oldestBlockNumber: bigint) => {
    if(!isConnected) {
      return;
    }
    
    const BLOCK_STEP = BigInt(1000);
    while (currentBlockNumber >= oldestBlockNumber) {
        if(!isConnected) {
          break;
        }
        const actions = await getTestClient().getLogs({
            address: getContractAddress(),
            events: parseAbi([ 
                'event Approval(address indexed owner, address indexed spender, uint256 value)',
                'event Transfer(address indexed from, address indexed to, uint256 value)',
            ]),
            fromBlock: BigInt(bigIntLib(currentBlockNumber as bigint).subtract(BLOCK_STEP).toString()),
            toBlock: BigInt(currentBlockNumber.toString()),
        })
        currentBlockNumber = BigInt(bigIntLib(currentBlockNumber as bigint).subtract(BLOCK_STEP).toString());
        await storeActionsToDatabase(actions as unknown as Action[]);
    }
}

export async function fetchHistoryActions(): Promise<void> {  
    let oldestBlockNumber =  await getOldestBlockInDatabase() || 22069112n;
    let currentBlockNumber = await getNewestBlockInDatabase() || await getTestClient().getBlockNumber();
    return await actionsLoop(currentBlockNumber, oldestBlockNumber);
}

export let actionsFetchTimerIntervalRef: NodeJS.Timeout;

export function startLatestActionsFetchTimer() {
  actionsFetchTimerIntervalRef = setInterval(async () => {
        if(!isConnected) {
          clearInterval(actionsFetchTimerIntervalRef)
          return;
        }
        const toBlock = await getTestClient().getBlockNumber();;
        if(toBlock !== null) {
            return new Promise(async () => {
                let oldestBlockNumber =  (await getNewestBlockInDatabase() || await getTestClient().getBlockNumber());
                let currentBlockNumber = (await getTestClient().getBlockNumber());
                await actionsLoop(currentBlockNumber, oldestBlockNumber);
            });
        }
    }, getConfig().actionsFetcherThrottleTime)
}