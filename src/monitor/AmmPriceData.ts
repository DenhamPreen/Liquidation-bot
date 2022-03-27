import { ethers } from "ethers";
import { amount, bn, oneRay, toBN, oneEther } from "../math";
import BigNumber from "bignumber.js";

let factoryAbi = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
];

let pairAbi = [
  " function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)",
];

export const getPrice = async (lendableAddress, tradableAddress, signer) => {
  //   try {
  const pangolinFactoryAddress = "0xefa94DE7a4656D787667C749f7E1223D71E9FD88";

  let factory = new ethers.Contract(pangolinFactoryAddress, factoryAbi, signer);

  let pairAddress = await factory.getPair(tradableAddress, lendableAddress);

  let pair = new ethers.Contract(pairAddress, pairAbi, signer);

  let reserves = await pair.functions.getReserves();

  // todo min of rev
  let numer =
    reserves["_reserve1"].sub(reserves["_reserve0"]) > bn(0)
      ? reserves["_reserve1"]
      : reserves["_reserve0"];
  let denom =
    reserves["_reserve0"].sub(reserves["_reserve1"]) > bn(0)
      ? reserves["_reserve1"]
      : reserves["_reserve0"];
  let price = reserves["_reserve1"].div(reserves["_reserve0"]).div(1000); // rnd integer scaling

  //   console.log("price.toString()");
  //   console.log(price.toString());
  return price;
  //   } catch (e) {
  //     // console.log(e);
  //     return bn(1);
  //   }
};
