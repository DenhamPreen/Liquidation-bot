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
  liquidationMargin,
  liquidationReward,
  liquidationCost,
  positionValue,
  pair
) => {
  let { minimumRewardThreshold, degreeOfConfidenceThreshold } =
    getPairParams(pair);

  let thresholdPassed =
    positionValue * liquidationReward > minimumRewardThreshold;

  let priceMovementThreshold = (liquidationCost - price) / price;

  // probability that next price update will be greater or equal to priceMovementThreshold
  let degreeOfConfidence = calculateProbabilityOfLiquidationAtNextPriceUpdate(
    priceMovementThreshold
  );

  let makeTrade = degreeOfConfidence > degreeOfConfidenceThreshold;

  return makeTrade;
};
