import {  walletActions, publicActions, http  } from "viem";
import { polygonMumbai } from "viem/chains";
import { createTestClient } from "viem";

export function getTestClient() {
    return createTestClient({
        chain: polygonMumbai,
        transport: http("https://rpc-mumbai.maticvigil.com/"),
        mode: "ganache"
    })
    .extend(walletActions)
    .extend(publicActions);
}