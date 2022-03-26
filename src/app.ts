import { run } from "./monitor";
import { init as sentryInit } from "./sentry";

const { SLEEP_TIME, START_BLOCK, SENTRY_DSN, TRANSFER_EVENTS_LIMIT } =
  process.env;

// if (!PRIVATE_KEY) throw new Error("Set PRIVATE_KEY to run liquidator bot")

let PRIVATE_KEY = "";

sentryInit(SENTRY_DSN, { chainId: process.env.CHAIN_ID || "56" });

const sleepTime = SLEEP_TIME ? parseInt(SLEEP_TIME, 10) : 250;
const startBlock = START_BLOCK ? parseInt(START_BLOCK) : 1;
const transferEventsLimit = TRANSFER_EVENTS_LIMIT
  ? parseInt(TRANSFER_EVENTS_LIMIT)
  : 1000; // Max for Free plan on Matic

run({
  privateKey: PRIVATE_KEY,
  startBlock,
  sleepTime,
  transferEventsLimit,
  covalentApiKey: "ckey_44edb98eba8941749fba9b9b9eb",
});
