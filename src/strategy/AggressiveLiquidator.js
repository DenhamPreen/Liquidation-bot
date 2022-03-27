import { getPairParams } from "../config.js";

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

const updatePriceHistory = (priceHistory, currentBlockNumber, currentPrice) => {
  // creating an object for the current price information
  let currentPriceObject = {};
  currentPriceObject.blockNumber = currentBlockNumber;
  currentPriceObject.price = currentPrice;
  currentPriceObject.priceMovement =
    (currentPrice - priceHistory.slice(-1).price) /
    priceHistory.slice(-1).price;

  // adding the current price information to the existing history
  priceHistory.push(currentPriceObject);
};

const getRelevantHistoricalPriceData = (priceHistory, currentBlockNumber, currentPrice) => {
  // adding the latest price to the history
  priceHistory = updatePriceHistory(priceHistory, currentBlockNumber, currentPrice);

  // getting the relevant historical prices
  relevantPriceHistory = priceHistory.slice(-historicalPriceWindow);

  return relevantPriceHistory;
};

const calculateProbabilityOfLiquidationAtNextPriceUpdate = (
  currentPrice,
  liquidiationPrice,
  priceHistory
) => {
  // calculating price movement threshold for liquidiation based on current price
  priceMovementThreshold = (liquidiationPrice - currentPrice) / currentPrice;

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
  price,
  liquidiationPrice,
  positionValue,
  liquidationReward,
  liquidationAttemptCost,
  priceHistory
) => {
  // retrieving probability of liquidiation at next price update based on relevant historical data
  let liquidationProbability =
    calculateProbabilityOfLiquidationAtNextPriceUpdate(
      price,
      liquidiationPrice,
      priceHistory
    );
  
  // calculating expected gross payoff from liquidiation
  liquidationPayoff = positionValue * liquidationReward * liquidationProbability;

  // calculating expected net payoff from liquidation
  expectedPayoff =
    liquidationPayoff - liquidationAttemptCost;

  return expectedPayoff;
};

export const AggressiveLiquidatorOnPreviousPrice = (
  price,
  collateralValue,
  liquidationMargin,
  liquidationReward,
  // loanValue,
  pair
) => {
  let { minimumRewardThreshold } = getPairParams(pair);

  // calculating liquidiation price for the address 
  let liquidiationPrice =
    (collateralValue / numberOfTokens) * (1 + liquidationMargin);

  // expected payoff of the liquidation attempt
  let calculateExpectedLiquidationPayoff =
    calculateExpectedLiquidationPayoffAtNextPriceUpdate(
      price,
      liquidiationPrice,
      liquidationProbability,
      positionValue,
      liquidationReward,
      liquidationAttemptCost
    );


  let makeTrade = calculateExpectedLiquidationPayoff > minimumRewardThreshold;

  return makeTrade;
};
