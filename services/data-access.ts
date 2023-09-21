import { Action } from "../model/Action";
import { getContractObject, getTestClient } from "../utils/client";
import { getActionsCollection, getAllowancesCollection, getBalancesCollection, getDailyBusdVolumesCollection } from "../utils/database";

const collation = { locale : "en", strength: 2}

type Allowance = { owner: string, spenders: Array<{ spender: string, value: string }>};
type Balance = { owner: string, value: string };
type Volume = {
    basedOnLastTransactionIndex: any;
    basedOnBlock: any; 
    timestamp: number;
    value: string;
};

let isConnected = true;

export function notifyDataAccessor(connected: boolean) {
  isConnected = connected;
}

export async function getOwnerAllowances(owner: string): Promise<Allowance[]> {
    if(!isConnected) {
        return [];
    }
    return await getAllowancesCollection().find({ owner }, { collation }).toArray() as unknown as Allowance[];
}

export async function getUsersOperations(user ?: string): Promise<Action[]> {
    if(!isConnected) {
        return [];
    }
    let filter = {};
    if(user) {
        filter = {
            $or: [
                { "args.from": user },
                { "args.to": user },
                { "args.owner": user },
            ]
        };
    }

    return await getActionsCollection()
        .find(filter, { collation }).sort({
            "blockNumber": -1,
            "transactionIndex": -1,
        }).limit(10).toArray() as unknown as Action[];
}

export async function getBalances(owner ?: string): Promise<Balance[]|string> {
    if(!isConnected) {
        return [];
    }
    else if(owner) {
        const balance = (await getBalancesCollection().find({ owner }, { collation }).toArray())[0];
        return balance ? (await getBalancesCollection().find({ owner }, { collation }).toArray())[0].value as unknown as string : "0";
    }
    return await getBalancesCollection().find().toArray() as unknown as Balance[];
}

export async function getDailyVolumes(): Promise<Volume[]> {
    if(!isConnected) {
        return [];
    }
    return await getDailyBusdVolumesCollection().find().sort({ timestamp: 1 }).toArray() as unknown as Volume[];
}
export async function getTotalSupply(): Promise<string> {
    const value: BigInt = await getContractObject().read.totalSupply() as BigInt;
    return value.toString();
}