import { getPairParams } from "../config.js";

// Negative kurtosis desired - Platykurtic Distribution

const calculateProbabilityOfLiquidationAtNextPriceUpdate = (
  priceMovementThreshold
) => {
  // export distribution
  // const normDist = new NormalDistribution(mean, standardDeviation);

  // liquidiationProbability = 1 - normDist.cdf(priceMovementThreshold);
  let liquidiationProbability = 0.1;

  return liquidiationProbability;
};

export const AggressiveLiquidatorOnPreviousPrice = (
  price,
  numberOfTokens,
  collateralValue,
  liquidationMargin,
  liquidationReward,
  loanValue,
  pair
) => {
  let { minimumRewardThreshold, degreeOfConfidenceThreshold } =
    getPairParams(pair);

  let thresholdPassed = loanValue * liquidationReward > minimumRewardThreshold;

  let liquidiationPrice =
    (collateralValue / numberOfTokens) * (1 + liquidationMargin);

  let priceMovementThreshold = (liquidiationPrice - price) / price;

  // probability that next price update will be greater or equal to priceMovementThreshold
  let degreeOfConfidence = calculateProbabilityOfLiquidationAtNextPriceUpdate(
    priceMovementThreshold
  );

  let makeTrade = degreeOfConfidence > degreeOfConfidenceThreshold;

  return makeTrade;
};
