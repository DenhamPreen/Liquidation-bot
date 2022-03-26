import { run } from "./monitor";
import { init as sentryInit } from "./sentry";
import { PrivateKey } from "./privateKey";

const {
  PRIVATE_KEY,
  SLEEP_TIME,
  START_BLOCK,
  SENTRY_DSN,
  TRANSFER_EVENTS_LIMIT,
} = process.env;

let PVT_KEY = PRIVATE_KEY || PrivateKey;

if (!PVT_KEY) throw new Error("Set PRIVATE_KEY to run liquidator bot");

sentryInit(SENTRY_DSN, { chainId: process.env.CHAIN_ID || "56" });

const sleepTime = SLEEP_TIME ? parseInt(SLEEP_TIME, 10) : 250;
const startBlock = START_BLOCK ? parseInt(START_BLOCK) : 1;
console.log(startBlock);
const transferEventsLimit = TRANSFER_EVENTS_LIMIT
  ? parseInt(TRANSFER_EVENTS_LIMIT)
  : 1000; // Max for Free plan on Matic

run({
  privateKey: PVT_KEY,
  startBlock,
  sleepTime,
  transferEventsLimit,
  covalentApiKey: "ckey_17fa8d7b9d5c4efe958eb67ae40",
});
