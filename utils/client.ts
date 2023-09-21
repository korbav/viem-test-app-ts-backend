import {  walletActions, publicActions, http, webSocket, createTestClient, Abi, Address, createPublicClient, getContractAddress, GetContractReturnType, PublicClient, WalletClient, getContract  } from "viem";
import { polygonMumbai } from "viem/chains";
import BUSD from "../assets/BUSD.json";

export function getTestClient() {
    return createTestClient({
        chain: polygonMumbai,
        transport: http("https://polygon-mumbai.infura.io/v3/4458cf4d1689497b9a38b1d6bbf05e78", {
            retryDelay: 500, // 150 by default
            retryCount: 1 // 3 by default
        }),
        mode: "ganache",
        cacheTime: 20_000,
    })
    .extend(walletActions)
    .extend(publicActions);
}

const address = BUSD.networks["80001"].address as Address;

const getContractParameters = () => ({
    address,
    abi: BUSD.abi as Abi,
    publicClient: getTestClient()
});

export function getContractObject(): GetContractReturnType<typeof BUSD.abi, PublicClient, WalletClient> {
    return getContract(getContractParameters() as any) as GetContractReturnType<typeof BUSD.abi, PublicClient, WalletClient>;
}

export function subscribeToWebSocketTestClient(onData: (data: any) => void) {
    try {
        const transport = webSocket("wss://polygon-mumbai.infura.io/ws/v3/27051503de824552a932ba71cc0b5583", {
            timeout: 30000,
            retryCount: 10,
            retryDelay: 1000
        });
    
        const wsClient = createPublicClient({
            chain: polygonMumbai,
            transport,
        })

        wsClient.watchContractEvent({
            abi: BUSD.abi as Abi,
            address,
            onError: (e) => console.log(e),
            onLogs: (logs) => {
                const event: any = logs[0];
                if(["Transfer", "Approval"].includes(event.eventName)) {
                    onData(event)
                }
            }
        });
    } catch(e) {
        console.log(e)
    }
}