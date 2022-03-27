const defaultPairParams = {
  minimumRewardThreshold: 10,
  historicalPriceWindow: 20
};

const pairParams = {
  "0x": {
    minimumRewardThreshold: 10,
    historicalPriceWindow: 20
  },
};

export const getPairParams = (pair) => {
  return pair in pairParams ? pairParams[pair] : defaultPairParams;
};

export default { getPairParams };
