import { getPairParams } from "../config.js";
import BigNumber from "bignumber.js";

// function should only run once when the bot starts running from halt
const importInitialHistoricalPriceData = () => {
  // use theGraph to pull the initial historical data
  // data will be an array of objects
  // each object should contain 2 properties initially - block number and price
  // assumption here is that the block numbers will be equally spaced apart between each price update.
  let priceHistory = 0;

  // calculating price movements
  for (let i = 0; i < priceHistory.length - 1; i++) {
    if (i == 0) {
      priceHistory[i].priceMovement[i] = 0;
    } else {
      priceHistory[i].priceMovement[i] =
        (priceHistory[i].price - priceHistory[i - 1].price) /
        priceHistory[i - 1].price;
    }
  }
};

// const updatePriceHistory = (priceHistory, currentBlockNumber, currentPrice) => {
//   // creating an object for the current price information
//   let currentPriceObject = {};

//   priceHistory = priceHistory ? priceHistory : [];

//   currentPriceObject.blockNumber = currentBlockNumber;
//   currentPriceObject.price = currentPrice;
//   currentPriceObject.priceMovement =
//     (currentPrice - priceHistory.slice(-1).price) /
//     priceHistory.slice(-1).price;

//   // adding the current price information to the existing history
//   return priceHistory.push(currentPriceObject);
// };

const getRelevantHistoricalPriceData = (priceHistory) => {
  // adding the latest price to the history
  let currentPriceObject = {};

  priceHistory = priceHistory ? priceHistory : [];

  let currentPrice = priceHistory[priceHistory.length - 1].toNumber;

  currentPriceObject.price = currentPrice;
  currentPriceObject.priceMovement =
    (currentPrice - priceHistory.slice(-1).price) /
    priceHistory.slice(-1).price;

  // adding the current price information to the existing history
  priceHistory.push(currentPriceObject);

  // getting the relevant historical prices
  let { historicalPriceWindow } = getPairParams();

  let relevantPriceHistory = priceHistory.slice(-historicalPriceWindow);

  return relevantPriceHistory;
};

const calculateProbabilityOfLiquidationAtNextPriceUpdate = (
  currentPrice,
  liquidiationPrice,
  priceHistory
) => {
  // calculating price movement threshold for liquidiation based on current price
  let priceMovementThreshold =
    (liquidiationPrice - currentPrice) / currentPrice;

  // getting relevant price history
  let relevantPriceHistory = getRelevantHistoricalPriceData(priceHistory);

  // getting proportion of price movements that are below the liquidiation threshold
  let cumulativeDistributionFunction =
    relevantPriceHistory.filter(
      (priceItem) => priceItem.priceMovement <= priceMovementThreshold
    ).length / relevantPriceHistory.length;

  // computing complement of the above
  let liquidiationProbability = 1 - cumulativeDistributionFunction;

  return liquidiationProbability;
};

const calculateExpectedLiquidationPayoffAtNextPriceUpdate = (
  liquidiationPrice,
  positionValue,
  liquidationReward,
  liquidationAttemptCost,
  priceHistory
) => {
  // console.log(priceHistory);
  priceHistory = priceHistory.map((price) => {
    // console.log("price");
    // console.log(price);
    // console.log("price.toString()");
    // console.log(price.toString);
    // console.log("parseInt(price.toString())");
    // console.log(parseInt(price.toString));
    return parseInt(price);
  });

  // retrieving probability of liquidiation at next price update based on relevant historical data
  let liquidationProbability =
    calculateProbabilityOfLiquidationAtNextPriceUpdate(
      priceHistory[0],
      liquidiationPrice,
      priceHistory
    );

  // calculating expected gross payoff from liquidiation
  let liquidationPayoff =
    positionValue * liquidationReward * liquidationProbability;

  // calculating expected net payoff from liquidation
  let expectedPayoff = liquidationPayoff - liquidationAttemptCost;

  return expectedPayoff;
};

export const AggressiveLiquidatorOnPreviousPrice = (
  priceHistory,
  collateralValue,
  liquidationMargin,
  liquidationReward,
  amountTokens,
  pair
) => {
  let { minimumRewardThreshold } = getPairParams(pair);

  //todo
  let numberOfTokens = amountTokens;

  priceHistory = priceHistory.length > 1 ? priceHistory : [1];

  console.log(priceHistory);

  // calculating liquidiation price for the address
  let liquidiationPrice =
    collateralValue / (numberOfTokens * (1 + liquidationMargin));

  const liquidationAttemptCost = 1;

  // expected payoff of the liquidation attempt
  let calculateExpectedLiquidationPayoff =
    calculateExpectedLiquidationPayoffAtNextPriceUpdate(
      liquidiationPrice,
      collateralValue, // positionValue
      liquidationReward,
      liquidationAttemptCost,
      priceHistory
    );

  let makeTrade = calculateExpectedLiquidationPayoff > minimumRewardThreshold;

  return makeTrade;
};
