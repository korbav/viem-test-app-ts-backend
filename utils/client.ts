import {  walletActions, publicActions, http, createTestClient  } from "viem";
import { polygonMumbai } from "viem/chains";

export function getTestClient() {
    return createTestClient({
        chain: polygonMumbai,
        transport: http("https://polygon-mumbai.infura.io/v3/4458cf4d1689497b9a38b1d6bbf05e78"),
        mode: "ganache"
    })
    .extend(walletActions)
    .extend(publicActions);
}