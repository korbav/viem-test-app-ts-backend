import { Action } from "../model/Action";
import { getActionsCollection, getAllowancesCollection, getBalancesCollection, getDailyBusdVolumesCollection } from "../utils/database";

const collation = { locale : "en", strength: 2}

type Allowance = { owner: string, spenders: Array<{ spender: string, value: string }>};
type Balance = { owner: string, value: string };
type Volume = { timestamp: number, value: string };

export async function getOwnerAllowances(owner: string): Promise<Allowance[]> {
    return await getAllowancesCollection().find({ owner }, { collation }).toArray() as unknown as Allowance[];
}

export async function getUsersOperations(user ?: string): Promise<Action[]> {
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
    if(owner) {
        return (await getBalancesCollection().find({ owner }, { collation }).toArray())[0].value as unknown as string;
    }
    return await getBalancesCollection().find().toArray() as unknown as Balance[];
}

export async function getDailyVolumes(): Promise<Volume[]> {
    return await getDailyBusdVolumesCollection().find().sort({ timestamp: 1 }).toArray() as unknown as Volume[];
}