import { ethers } from "ethers";
import { oneEther, protocol } from "@wowswap/evm-sdk";
import { Observable } from "observable-fns";
import { DatastoreRepository } from "../db/repository";
import { amount, bn, oneRay, toBN } from "../math";
import { addBreadcrumb, addException } from "../sentry";
import { defined, fewRetry, infRetry } from "../utils";
import { AbstractMonitor } from "./AbstractMonitor";
import { HeightMonitor } from "./HeightMonitor";
import { Pair, Position } from "./models";
import { healthUpdate } from "../utils/health";
import axios from "axios";
import BigNumber from "bignumber.js";
import { AggressiveLiquidatorOnPreviousPrice } from "../strategy/AggressiveLiquidator.js";

export class PositionMonitor extends AbstractMonitor<Position> {
  private repository!: DatastoreRepository<Position>;
  private pairRepository!: DatastoreRepository<Pair>;

  async run(): Promise<Observable<Position>> {
    this.repository = this.context.db.getRepository(Position);
    this.pairRepository = this.context.db.getRepository(Pair);
    (await this.context.getChannel(HeightMonitor)).subscribe((height) => {
      this.lastHeight = height;
    });

    this.launchLoop(this.updatePairs.bind(this)).then((_) => {
      // Loop launched, do nothing
    });
    this.launchLoop(this.updateHolders.bind(this)).then((_) => {
      // Loop launched, do nothing
    });
    this.launchLoop(this.updatePositions.bind(this)).then((_) => {
      // Loop launched, do nothing
    });
    return this.channel;
  }

  async liquidateUnhealthy() {
    const liquidationMargin = 0.054;
    const liquidationReward = 0.024;

    // price, numberOfTokens, collateralValue, liquidationMargin, liquidationReward
    let shouldLiquidate: boolean = AggressiveLiquidatorOnPreviousPrice(
      1, //price
      1, // number of tokens
      1, // collateral value
      liquidationMargin,
      liquidationReward,
      1, // loanValue
      "0x" // pair address
    );

    console.log("shouldLiquidate");
    console.log(shouldLiquidate);

    // let unhealthy = await this.repository.find("health", { $eq: amount(0) });

    let unhealthy = await this.repository.find("health", {
      $gt: amount(0), // TODO: revert to 1_000_000_000
    });

    // let unhealthy = await this.repository.find("trader", {
    //   $eq: "0xea53f634bd4bb113ee55ea679f7825d2a0dfd4a8", // TODO: revert to 1_000_000_000
    // });

    console.log("/////////////");
    console.log("unhealthy.length");
    console.log(unhealthy.length);
    // console.log(unhealthy);

    // for demo
    // unhealthy = [
    //   { price: 10, amount: 10, collateralValue: 10, value: 10, pair: "0x" },
    // ];

    // unhealthy = [unhealthy[0]];

    // unhealthy = unhealthy.filter((p) => {
    //   AggressiveLiquidatorOnPreviousPrice(
    //     10, //price // TODO
    //     p.amount, // number of tokens
    //     10, // collateral value // TODO
    //     liquidationMargin,
    //     liquidationReward,
    //     p.value, // loanValue
    //     p.pair // pair address
    //   );
    //   return true;
    // });

    console.log("unhealthy.post filter");
    console.log(unhealthy.length);

    unhealthy = unhealthy.filter((p) => {
      console.log("///////////////////////////////");
      console.log("lendable: ", p.lendable);
      console.log("tradable: ", p.tradable);
      console.log("proxy: ", p.proxy);
      console.log("trader: ", p.trader);
      console.log("pair: ", p.pair);
      console.log("updateAt: ", p.updateAt);
      console.log("appearAt: ", p.appearAt);
      console.log("lastUpdatedAt: ", p.lastUpdatedAt);
      console.log("Now          : ", Date.now());
      console.log("expirationDate: ", p.expirationDate.toString());
      console.log("stopLossPercentage: ", p.stopLossPercentage.toString());
      console.log("takeProfitPercentage: ", p.takeProfitPercentage.toString());
      console.log("terminationReward: ", p.terminationReward.toString());
      console.log("amount: ", p.amount.toString());
      console.log("value: ", p.value.toString());
      console.log("selfValue: ", p.selfValue.toString());
      console.log("principalDebt: ", p.principalDebt.toString());
      console.log("currentDebt: ", p.currentDebt.toString());
      console.log("rate: ", p.rate.toString());
      console.log("currentCost: ", p.currentCost.toString());
      console.log("liquidationCost: ", p.liquidationCost.toString());
      console.log("short: ", p.short);
      return p.amount.gt(amount(0));
    });
    unhealthy = await Promise.all(unhealthy.map((p) => this.updatePosition(p)));

    // for (let p of unhealthy.filter((p) => {
    //   p.amount.gt(amount(0));
    // })) {
    for (let p of unhealthy) {
      const { path, tradableToken } = await p.getPath(this.context.db);

      let amount = p.amount
        .decimalPlaces(tradableToken?.decimals!)
        .dividedBy(bn(10).pow(tradableToken!.decimals));

      addBreadcrumb(
        "pair",
        p.pair,
        `Liquidate position: ${path} ` +
          `${p.trader} - ${amount.toString()} ${tradableToken?.symbol}, ` +
          `health: ${p.health.decimalPlaces(27).dividedBy(oneRay)}`
      );

      var defaultOptions = { gasPrice: 1000000000, gasLimit: 1000000 }; // TODO: simply up gas price to bnb network

      // await protocol.IPair__factory.connect(p.pair, this.context.signer)
      //   .liquidatePosition(
      //     p.trader,
      //     this.context.signer.address,
      //     defaultOptions
      //   )
      //   .then((tx) => tx.wait())
      //   .catch((e) =>
      //     addException("pair", p.pair, e, {
      //       message: `Failed liquidate position of ${path} ${p.trader} ${e.message}`,
      //     })
      //   )
      //   .then((v) => {
      //     if (defined(v)) {
      //       // If call was successful
      //       this.context.metrics.increment("liquidations", ["successful"]);
      //     }
      //   });
    }
  }

  async terminateUnhealthy() {
    const positions = await this.repository.all();
    let terminable = positions.filter(Position.isTerminable);
    terminable = await Promise.all(
      terminable.map((p) => this.updatePosition(p))
    );

    for (let p of terminable.filter(Position.isTerminable)) {
      const { path, tradableToken } = await p.getPath(this.context.db);

      let amount = p.amount
        .decimalPlaces(tradableToken?.decimals!)
        .dividedBy(bn(10).pow(tradableToken!.decimals));

      addBreadcrumb(
        "pair",
        p.pair,
        `Terminate position: ${path} ` +
          `${p.trader} - ${amount.toString()} ${tradableToken?.symbol}`
      );

      await protocol.IPair__factory.connect(p.pair, this.context.signer)
        .terminatePosition(p.trader)
        .then((tx) => tx.wait())
        .catch((e) =>
          addException("pair", p.pair, e, {
            message: `Failed terminate position of ${path} ${p.trader} ${e.message}`,
          })
        )
        .then((v) => {
          if (defined(v)) {
            // If call was successful
            this.context.metrics.increment("terminations", ["successful"]);
          }
        });
    }
  }

  private async updatePositions(height: number) {
    // console.log("update positions at height", height);

    const positionToUpdate = await this.repository.all();
    await Promise.all(
      positionToUpdate.map((position) => this.updatePosition(position))
    ).catch((e) =>
      addException("-", "-", e, { message: `Failed update position run` })
    );

    await this.liquidateUnhealthy().catch((e) =>
      addException("-", "-", e, { message: `Failed liquidation run` })
    );
    await this.terminateUnhealthy().catch((e) =>
      addException("-", "-", e, { message: `Failed termination run` })
    );
  }

  private async updateHolders(height: number) {
    // console.log("update holders at height", height);
    const startedAt = Number(new Date());

    let positions = await this.repository.all();
    const pairs = await this.pairRepository.all(); //.find("updateAt", { $lt: height });

    const pairsWithHolders = await Promise.all(
      pairs
        .filter((pair) => pair.totalSupply !== "0")
        .filter(PositionMonitor.areAllPositionsFound(positions, false))
        .map(async (pair) => {
          return {
            pair,
            holders: await this.updateHoldersForPair(pair).catch((e) => {
              addException("pair", pair.address, e, {
                message: "Failed to get TransferEvents",
              });
              return [];
            }),
          };
        })
    );

    await Promise.all(
      pairsWithHolders.map(async ({ pair, holders }) => {
        const known = await this.repository.find("pair", pair.address);
        const unknown = holders.filter(
          (h) => !known.some((k) => k.trader === h.address)
        );

        await Promise.all(
          unknown.map(({ address }) => {
            const position = new Position();
            position.lendable = pair.lendable;
            position.tradable = pair.tradable;
            position.proxy = pair.proxy;
            position.short = pair.short;
            position.pair = pair.address;
            position.trader = address;
            position.amount = bn(0);
            position.value = bn(0);
            position.selfValue = bn(0);
            position.principalDebt = bn(0);
            position.currentDebt = bn(0);
            position.rate = bn(0);
            position.currentCost = bn(0);
            position.liquidationCost = bn(0);
            position.updateAt = 0;
            position.appearAt = height;
            position.lastUpdatedAt = Date.now();

            return this.repository.put(position);
          })
        );
      })
    );

    healthUpdate(this.context.metrics);
    this.context.metrics.update(
      "position_monitor_update_holders_duration",
      Number(new Date()) - startedAt
    );
  }

  async updatePosition(position: Position) {
    // console.log(position);

    if (position.amount.eq(bn(0)) && position.appearAt < position.updateAt) {
      position.lastUpdatedAt = Date.now();

      await this.repository.put(position).catch((e) => {
        addException("pair", position.pair, e, {
          position: position.toString(),
        });
      });

      // Already fresh and empty position
      return position;
    }

    const { path } = await position.getPath(this.context.db);
    const inputs = [position.trader, position.lendable];

    if (position.proxy) {
      inputs.push(position.proxy);
    }

    inputs.push(position.tradable);

    const method = position.short
      ? position.proxy
        ? "getProxyShortPosition"
        : "getShortPosition"
      : position.proxy
      ? "getProxyPosition"
      : "getPosition";

    const [
      posAmount,
      value,
      selfValue,
      principalDebt,
      currentDebt,
      rate,
      currentCost,
      liquidationCost,
      expirationDate,
      stopLossPercentage,
      takeProfitPercentage,
      terminationReward,
      updateAt,
    ]: BigNumber[] = await infRetry(() =>
      this.context.ctx.core
        .useCallWithBlock(
          this.context.ctx.router.router,
          method,
          ...(inputs as any)
        )
        .then(({ result, blockHeight }) => {
          // @ts-ignore
          return [...result.flat().map(toBN), toBN(blockHeight)];
        })
        .catch((e) => {
          addException("pair", position.pair, e, {
            message: `Error on position state ${path} ${position.trader}`,
          });
          throw e;
        })
    );

    position.amount = posAmount;
    position.value = value;
    position.selfValue = selfValue;
    position.principalDebt = principalDebt;
    position.currentDebt = currentDebt;
    position.rate = rate;
    position.currentCost = currentCost;
    position.liquidationCost = liquidationCost;
    position.updateAt = updateAt.toNumber();
    position.lastUpdatedAt = Date.now();
    position.expirationDate = expirationDate;
    position.stopLossPercentage = stopLossPercentage;
    position.takeProfitPercentage = takeProfitPercentage;
    position.terminationReward = terminationReward;

    addBreadcrumb(
      "pair",
      position.pair,
      `Update ${position.short ? "short" : "long"} position:  ${path} ${
        position.trader
      } (health: ${position.health
        .decimalPlaces(27)
        .dividedBy(oneRay)}, value: ${position.value
        .decimalPlaces(18)
        .dividedBy(oneEther)}), amount: ${position.amount
        .decimalPlaces(18)
        .dividedBy(oneEther)})`
    );

    await this.repository.put(position).catch((e) => {
      addException("pair", position.pair, e, { position: position.toString() });
    });

    return position;
  }

  private async updateHoldersForPair(
    pair: Pair
  ): Promise<Array<{ address: string }>> {
    const covalentHolders = await this.requestCovalentHolders(pair).catch(
      (_) => []
    );

    console.log("covalentHolders");
    console.log(covalentHolders);

    // request holders from api, if present return them and skip rest of this method
    if (covalentHolders.length > 0) {
      addBreadcrumb(
        "pair",
        pair.address,
        `Got ${covalentHolders.length} holders from Covalent`
      );
      return covalentHolders;
    }

    let ranges = [];
    if (pair.queryBottom === 0) {
      pair.queryBottom = this.lastHeight;
      pair.queryUpper = this.lastHeight;
    }

    if (pair.queryBottom > this.context.startBlock) {
      const from = Math.max(
        this.context.startBlock,
        pair.queryBottom - this.context.transferEventsLimit
      );
      const to = pair.queryBottom;

      pair.queryBottom = from;

      ranges.push({ from, to });
    }

    if (pair.queryUpper !== 0) {
      const from = pair.queryUpper;
      const to = Math.min(
        this.lastHeight,
        pair.queryUpper + this.context.transferEventsLimit
      );

      pair.queryUpper = to;

      ranges.push({ from, to });
    }

    const transferEvents = (
      await Promise.all(
        ranges.map(async ({ from, to }) => {
          const pairContract = this.context.ctx.core.useContract(
            protocol.Pair__factory,
            pair.address
          );

          const transfers = pairContract.filters.Transfer(null, null, null);
          const events = await pairContract
            .queryFilter(transfers, from, to)
            .catch((_) => []);

          const { path, tradableToken } = await pair.getPath(this.context.db);
          addBreadcrumb(
            "pair",
            pair.address,
            `Got ${events.length} events with holders of ${path} (total supply is ` +
              `${bn(pair.totalSupply).human(tradableToken?.decimals)} ` +
              `${tradableToken?.symbol}) (from ${from} to ${to}) ${
                from === pair.queryBottom ? "bottom" : "up"
              }`
          );

          return events;
        })
      )
    ).flat();

    await this.pairRepository.put(pair);

    return transferEvents!.reduce((map, ev) => {
      [ev.args.to, ev.args.from]
        .filter(
          (address) =>
            address !== pair.address && address !== ethers.constants.AddressZero
        )
        .forEach((address) => map.push({ address }));

      return map;
    }, [] as Array<{ address: string }>);
  }

  private async requestCovalentHolders(
    pair: Pair
  ): Promise<Array<{ address: string }>> {
    console.log("make covalent holders req");

    // If key is blank or chain is not supported, use other methods
    if (
      this.context.covalentApiKey.length === 0 ||
      ![1, 56, 137, 43114].includes(this.context.chainId)
    ) {
      console.log("this");
      return [];
    }

    return await fewRetry(() =>
      axios
        .get<{
          data: { items: Array<{ address: string }> };
        }>(
          `https://api.covalenthq.com/v1/${this.context.chainId}/tokens/${pair.address}/token_holders/`,
          {
            params: {
              key: this.context.covalentApiKey,
            },
          }
        )
        .then((r) => {
          console.log("r.data.data.items");
          console.log(r.data.data.items);
          return r.data.data.items;
        })
    );
  }

  async updatePairs() {
    const pairs = await this.pairRepository.all();

    await Promise.all(
      pairs.map(async (pair) => {
        const totalSupply = await this.context.ctx.core
          .useCall(
            this.context.ctx.core.useContract(
              protocol.Pair__factory,
              pair.address
            ),
            "totalSupply"
          )
          .then((bn) => bn.toString())
          .catch((e) => {
            addException("pair", pair.address, e);
            return undefined;
          });

        if (
          typeof totalSupply !== "undefined" &&
          pair.totalSupply != totalSupply
        ) {
          pair.totalSupply = totalSupply;

          return this.pairRepository.put(pair);
        }
      })
    );
  }

  static areAllPositionsFound(
    positions: Position[],
    condition: boolean = true
  ): (pair: Pair) => boolean {
    return (pair) => {
      const pairPositions = positions.filter((p) => p.pair === pair.address);
      const pairPositionsTotal = pairPositions.reduce(
        (total, position) => total.add(position.amount),
        bn(0)
      );
      const pairTotal = bn(pair.totalSupply);

      return pairTotal.eq(pairPositionsTotal) === condition;
    };
  }
}
