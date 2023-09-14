import {  walletActions, publicActions, http, createTestClient  } from "viem";
import { polygonMumbai } from "viem/chains";

export function getTestClient() {
    return createTestClient({
        chain: polygonMumbai,
        transport: http("https://polygon-mumbai.infura.io/v3/27051503de824552a932ba71cc0b5583"),
        mode: "ganache"
    })
    .extend(walletActions)
    .extend(publicActions);
}