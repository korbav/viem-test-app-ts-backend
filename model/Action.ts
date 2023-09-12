export interface Action {
    args: Record<string, any>;
    eventName: string;
    blockNumber: number;
    transactionIndex: number;
    transactionHash: string;
  }