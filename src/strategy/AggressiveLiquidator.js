import { getPairParams } from "../config.js";

// Negative kurtosis desired - Platykurtic Distribution

const calculateProbabilityOfLiquidationAtNextPriceUpdate = (
  priceMovementThreshold
) => {
  // export distribution
  const normDist = new NormalDistribution(mean, standardDeviation);

  liquidiationProbability = 1 - normDist.cdf(priceMovementThreshold);

  return liquidiationProbability;
};

export const AggressiveLiquidatorOnPreviousPrice = (
  price,
  numberOfTokens,
  collateralValue,
  liquidationMargin,
  liquidationReward
) => {
  let thresholdPassed = loanValue * liquidationReward > minimumRewardThreshold;

  let x = getPairParams(pair);

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
