import { MongoClient } from 'mongodb'
import getConfig from './config';

const config = getConfig();
const url = config.MongoDBURL; 
const dbName = config.MongoDBName;

// Create a MongoClient
export const dbClient = new MongoClient(url, { });

export async function resetDatabase(): Promise<void> {
    try {
        await dbClient.db(dbName).dropDatabase();
        await dbClient.close();
        console.log("Database closed")
        console.log("Database dropped")
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

export async function initializeDatabase() {
  try {
    // Connect to the MongoDB server
    await dbClient.connect();

    // Get a reference to the database
    const db = dbClient.db(dbName);

    // Check if the database exists
    const databaseList = await dbClient.db().admin().listDatabases();
    const databaseExists = databaseList.databases.some((dbInfo) => dbInfo.name === dbName);

    if (!databaseExists) {
      console.log(`Database '${dbName}' has been initialized.`);

      const actionsCollection = db.collection('actions');
      await actionsCollection.createIndex({ 'address': 1 }); 
      await actionsCollection.createIndex({ 'args.from': 1 });
      await actionsCollection.createIndex({ 'args.to': 1 }); 
      await actionsCollection.createIndex({ eventName: 1 }); 
      await actionsCollection.createIndex({ 'args.owner': 1 }); 
      await actionsCollection.createIndex({ 'args.spender': 1 });
      await actionsCollection.createIndex({ blockNumber: 1 });
      await actionsCollection.createIndex({ transactionHash: 1 });
      await actionsCollection.createIndex({ transactionIndex: 1 }); 

      const allowancesCollection = db.collection('allowances');
      await allowancesCollection.createIndex({ 'owner': 1 });
   
      const transfersCollection = db.collection('transfers');
      await transfersCollection.createIndex({ 'args.from': 1 });
      await transfersCollection.createIndex({ 'args.to': 1 });
   
      const approvalsCollection = db.collection('approvals');
      await approvalsCollection.createIndex({ 'args.owner': 1 });
      await approvalsCollection.createIndex({ 'args.spender': 1 });
   
      const dailyBusdVolumesCollection = db.collection('daily_busd_volumes');
      await dailyBusdVolumesCollection.createIndex({ 'timestamp': 1 });
      await dailyBusdVolumesCollection.createIndex({ 'value': 1 });
   
      const balancesCollection = db.collection('balances');
      await balancesCollection.createIndex({ 'owner': 1 });
    } else {
      console.log(`Database '${dbName}' already exists.`);
    }
    
    console.log("Database initialized")
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

export const getActionsCollection = () => dbClient.db(dbName).collection("actions");
export const getAllowancesCollection = () => dbClient.db(dbName).collection("allowances");
export const getTransfersCollection = () => dbClient.db(dbName).collection("transfers");
export const getApprovalsCollection = () => dbClient.db(dbName).collection("approvals");
export const getDailyBusdVolumesCollection = () => dbClient.db(dbName).collection("daily_busd_volumes");
export const getBalancesCollection = () => dbClient.db(dbName).collection("balances");
