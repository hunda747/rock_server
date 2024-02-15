// controllers/slipController.js

const Slip = require("../models/slip");
const Game = require("../models/game");
const Cashier = require("../models/cashier");

const { subDays, format, startOfDay, endOfDay } = require("date-fns");

const oddsTable = require("../odd/kiron");

const slipController = {
  getAllSlips: async (req, res, next) => {
    const { shopId, shopOwnerId, gameType, status, startDate, endDate } =
      req.body;
    try {
      let query = Slip.query();

      if (startDate) {
        const startOfDayTime = new Date(startDate);
        startOfDayTime.setHours(0, 0, 0, 0);
        query = query.where("created_at", ">=", startOfDayTime);
      }

      if (endDate) {
        const endOfDayTime = new Date(endDate);
        endOfDayTime.setHours(23, 59, 59, 999);
        query = query.where("created_at", "<=", endOfDayTime);
      }

      if (status && status.length > 0) {
        query = query.whereIn("status", status);
      }

      if (gameType && gameType.length > 0) {
        query = query.whereIn("gameType", gameType);
      }

      if (shopId) {
        query = query.where("shopId", shopId);
      }

      if (shopOwnerId) {
        query = query.where("shopOwnerId", shopOwnerId);
      }

      const slips = await query
        .withGraphFetched("shop")
        .withGraphFetched("cashier")
        .withGraphFetched("game")
        .orderBy("created_at", "desc")
        .limit(100);

      res.json(slips);
    } catch (error) {
      next(error);
    }
  },

  getSlipById: async (req, res, next) => {
    const { id } = req.params;

    try {
      const slip = await Slip.query().findById(id).withGraphFetched("game");
      if (slip) {
        res.json(slip);
      } else {
        res.status(404).json({ error: "Slip not found 1" });
      }
    } catch (error) {
      next(error);
    }
  },

  getSlipByGamenumber: async (req, res, next) => {
    const { code } = req.query;
    console.log("code", code);
    try {
      const slip = await Slip.query()
        .where("id", code)
        .first()
        .withGraphFetched("game")
        .withGraphFetched("shop");
      if (slip) {
        res.json(slip);
      } else {
        res.status(404).json({ error: "Slip not found yet" });
      }
    } catch (error) {
      next(error);
    }
  },

  createSlip: async (req, res, next) => {
    const param = req.body;
    // console.log("param", param);

    // Update the current game with the drawn number
    const currentGame = await Game.query()
      .where("status", "playing")
      .where("gameType", param.gameType)
      .orderBy("time", "desc")
      .first();

    if (!currentGame) {
      return res.status(404).json({ message: "Game Closed." });
    }

    const cashier = await Cashier.query()
      .findById(param.cashier)
      .withGraphFetched("shop");

    if (cashier.cashierLimit < cashier.netWinning) {
      return res.status(200).json({
        error: "Cashier limit reached. Please contact the admin.",
        status: "error",
        err: "true",
      });
    }

    if (!cashier.status || cashier.shop?.status === "inactive") {
      return res
        .status(200)
        .json({
          error: "Account is blocked",
          status: "error",
          err: "true",
          errText: "logout",
        });
    }

    // console.log("param:", param.numberPick);

    try {
      let totalStake = 0;
      let minWin = 0;
      let maxWin = 0;

      if (param.gameType == "keno") {
        // Iterate through numberPick array
        for (const pick of param.numberPick) {
          const numberOfSelections = pick.selection.length;

          // console.log(pick.selection);
          // console.log(pick.selection[0]);
          // console.log(typeof pick.selection[0]);

          totalStake += pick.stake;
          if (typeof pick.selection[0] === "string") {
            let odd;
            if (
              pick.selection[0] === "tails" ||
              pick.selection[0] === "heads"
            ) {
              odd = 2;
            } else {
              odd = 4;
            }
            pick.odd = odd;
            // Update minWin and maxWin based on the stake
            minWin = pick.stake < minWin || minWin === 0 ? pick.stake : minWin; // Assuming the minimum win is the same as the stake
            maxWin += pick.stake * odd; // Assuming the maximum win is the total stake for the pick
          } else {
            // Retrieve the odds table for the specific selection
            const oddsEntry = oddsTable[param.oddType][numberOfSelections];

            if (oddsEntry) {
              const modd = oddsEntry[numberOfSelections - 1];
              // Calculate the stake for the current pick based on the odds table

              pick.odd = Object.values(modd)[0];
              // Update minWin and maxWin based on the stake
              minWin =
                pick.stake < minWin || minWin === 0 ? pick.stake : minWin; // Assuming the minimum win is the same as the stake
              maxWin += pick.stake * Object.values(modd)[0]; // Assuming the maximum win is the total stake for the pick
            }
          }
        }
      } else if (param.gameType == "spin") {
        // console.log(param.numberPick);
        // console.log(param);
        for (const pick of param.numberPick) {
          const numberOfSelections = pick.val.length;
          totalStake += pick.stake;
          if (pick.market == "Color" || pick.market === "OddEven" || pick.market === "HighLow") {
            pick.odd = 2;
            minWin = pick.stake < minWin || minWin === 0 ? pick.stake : minWin;
            maxWin += pick.stake * 2;
          } else if (pick.market == "Column" || pick.market === "Dozens") {
            pick.odd = 3;
            minWin = pick.stake < minWin || minWin === 0 ? pick.stake : minWin;
            maxWin += pick.stake * 3;
          } else if (pick.market == "Sectors") {
            pick.odd = 6;
            minWin = pick.stake < minWin || minWin === 0 ? pick.stake : minWin;
            maxWin += pick.stake * 6;
          } else if (pick.market == "Neighbors") {
            pick.odd = 7;
            minWin = pick.stake < minWin || minWin === 0 ? pick.stake : minWin;
            maxWin += pick.stake * 7;
          } else if (pick.market == "Corner") {
            pick.odd = 9;
            minWin = pick.stake < minWin || minWin === 0 ? pick.stake : minWin;
            maxWin += pick.stake * 9;
          } else if (!isNaN(pick?.val[0])) {
            pick.odd = 36 / numberOfSelections;
            // Update minWin and maxWin based on the stake
            minWin = pick.stake < minWin || minWin === 0 ? pick.stake : minWin; // Assuming the minimum win is the same as the stake
            maxWin += pick.stake * pick.odd;
          }
        }
        // return res.status(400).json({err: "true"});
      } else {
        return res
          .status(404)
          .json({ message: "Game Type not found.", err: "true" });
      }

      if (cashier.shop?.minStake > totalStake) {
        return res
          .status(200)
          .json({
            error: `Minimus stake is ${cashier.shop?.minStake}.`,
            status: "error",
            err: "true",
          });
      }
      if (cashier.shop?.maxStake < totalStake) {
        return res
          .status(200)
          .json({
            error: `Maximus stake is ${cashier.shop?.maxStake}.`,
            status: "error",
            err: "true",
          });
      }
      if (50000 < maxWin) {
        return res
          .status(200)
          .json({
            error: `Maximus win allowed is ${50000}.`,
            status: "error",
            err: "true",
          });
      }

      const slip = await Slip.query().insert({
        gameId: currentGame.id,
        gameType: param.gameType,
        totalStake: totalStake,
        toWinMax: maxWin,
        toWinMin: minWin,
        oddType: param.oddType,
        numberPick: JSON.stringify(param.numberPick),
        shopOwnerId: param.shopOwner,
        shopId: param.shop,
        cashierId: param.cashier,
      });

      function convertDateFormat(inputDate) {
        const date = new Date(inputDate);
        return date.toISOString().slice(0, 16).replace("T", " ");
      }
      function convertDateFormats(inputDate) {
        return new Date(inputDate).toISOString().slice(0, 10);
      }

      // const game = Game.query().findById(currentGame.id)
      // param.numberPick.forEach(async (picks) => {
      //   const slip = await Slip.query().insert({
      //     gameId: currentGame.id,
      //     gameType: param.gameType,
      //     netStake: param.picks.stake,
      //     grossStake: picks.stake,
      //     numberPick: JSON.stringify(picks.selection),
      //     shopOwnerId: param.shopOwner,
      //     shopId: param.shop,
      //     cashierId: param.cashier,
      //   });
      //   console.log(slip);
      // });

      // const fullData = Slip.query().findById(slip.id).withGraphFetched('shop')
      res.status(201).json({
        err: "false",
        errText: "okay",
        id: slip.gameId,
        on: convertDateFormats(currentGame.time),
        gameType: slip.gameType,
        gameStartsOn:
          param.gameType +
          " " +
          convertDateFormat(currentGame.time) +
          " #" +
          currentGame.gameNumber,
        toWinMax: maxWin.toFixed(2),
        toWinMin: minWin.toFixed(2),
        company: "chessbet",
        code: slip.id,
        totalStake: slip.totalStake,
        user: JSON.parse(slip.numberPick),
        showOwnerId: slipController.showOwner,
        ...(cashier.cashierLimit - 500 < cashier.netWinning && {
          limitwarning: "Almost reach cashier limit!",
        }),
        agent: "agent",
        by: "cashier",
      });
    } catch (error) {
      next(error);
    }
  },

  updateSlip: async (req, res, next) => {
    const { id } = req.params;
    const { body } = req;

    try {
      const updatedSlip = await Slip.query().patchAndFetchById(id, body);
      if (updatedSlip) {
        res.json(updatedSlip);
      } else {
        res.status(404).json({ error: "Slip not found 2" });
      }
    } catch (error) {
      next(error);
    }
  },

  redeemSlip: async (req, res, next) => {
    const { id } = req.params;

    try {
      // const currentGame = await Game.query().where("id", gameNumber).where("status", 'done').first();

      // if (!currentGame) {
      //   return res.status(404).json({ message: "Game not found." });
      // }

      const updatedSlip = await Slip.query().findById(id);
      console.log("slip", updatedSlip);
      // if (updatedSlip) {
      if (updatedSlip.status == "active") {
        res.status(404).json({ err: "false", error: "Game not Done" });
      } else if (updatedSlip.status == "canceled") {
        res.status(404).json({ err: "false", error: "Ticket is canceled" });
      } else if (updatedSlip.status == "redeem") {
        const updateSlip = await Slip.query().patchAndFetchById(id, {
          status: "redeemed",
        });
        res.status(200).json({ err: "false", data: updateSlip });
      } else {
        res.status(404).json({ error: "Slip not found 3" });
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  },

  cancelSlip: async (req, res, next) => {
    const { id, gameNumber } = req.params;

    try {
      const currentGame = await Game.query()
        .where("id", gameNumber)
        .where("status", "playing")
        .first();

      if (!currentGame) {
        return res.status(404).json({ message: "Game not found." });
      }

      const slipCurrent = await Slip.query()
        .where("id", id)
        .where("status", "active")
        .first();
      if (!slipCurrent) {
        return res.status(404).json({ message: "Game is closed." });
      }

      const updatedSlip = await Slip.query().patchAndFetchById(id, {
        status: "canceled",
      });
      if (updatedSlip) {
        res.json({ err: "false" });
      } else {
        res.status(404).json({ err: "false", error: "Slip not found 4" });
      }
    } catch (error) {
      next(error);
    }
  },

  generateCashierReport: async (req, res) => {
    const { cashierId } = req.params;
    const { date } = req.query;
    const currentGame = await Cashier.query().findById(cashierId);

    if (!currentGame) {
      return res.status(404).json({ message: "Cashier not found." });
    }

    const today = date ? new Date(date) : new Date();
    const yesterday = subDays(today, 1);

    const formatDate = (date) => format(date, "yyyy-MM-dd HH:mm:ss");

    const getReportData = async (date) => {
      console.log("data", date);
      // const formattedStartDate = formatDate(date);
      // const formattedEndDate = formatDate(subDays(date, -1));
      // Set to the beginning of the day (00:00:00)
      const formattedStartDate = formatDate(startOfDay(date));

      // Set to the end of the day (23:59:59)
      const formattedEndDate = formatDate(endOfDay(date));
      console.log(formattedStartDate);
      console.log(formattedEndDate);
      const getDepostiResult = async () => {
        return await Slip.query()
          .where("cashierId", cashierId)
          .andWhere("created_at", ">=", formattedStartDate)
          .andWhere("created_at", "<", formattedEndDate)
          .select(
            Slip.raw("COALESCE(SUM(totalStake), 0) as amount"),
            Slip.raw("COALESCE(COUNT(*), 0) as number")
          )
          // .sum('totalStake as amount')
          // .count('id as number')
          .first();
      };
      const getQueryResult = async (status) => {
        return await Slip.query()
          .where("cashierId", cashierId)
          .andWhere("created_at", ">=", formattedStartDate)
          .andWhere("created_at", "<", formattedEndDate)
          .andWhere("status", status)
          .select(
            Slip.raw("COALESCE(SUM(totalStake), 0) as amount"),
            Slip.raw("COALESCE(COUNT(*), 0) as number")
          )
          // .sum('totalStake as amount')
          // .count('id as number')
          .first();
      };
      const getQueryRedeemed = async (status) => {
        return await Slip.query()
          .where("cashierId", cashierId)
          .andWhere("created_at", ">=", formattedStartDate)
          .andWhere("created_at", "<", formattedEndDate)
          .andWhere("status", status)
          .select(
            Slip.raw("COALESCE(SUM(netWinning), 0) as amount"),
            Slip.raw("COALESCE(COUNT(*), 0) as number")
          )
          // .sum('totalStake as amount')
          // .count('id as number')
          .first();
      };
      const getUnclaimedResult = async () => {
        return await Slip.query()
          .where("cashierId", cashierId)
          .andWhere("created_at", ">=", formattedStartDate)
          .andWhere("created_at", "<", formattedEndDate)
          .andWhere("status", "redeem")
          .andWhere("netWinning", ">", 0)
          .select(
            Slip.raw("COALESCE(SUM(netWinning), 0) as amount"),
            Slip.raw("COALESCE(COUNT(*), 0) as number")
          )
          // .sum('totalStake as amount')
          // .count('id as number')
          .first();
      };

      const bets = await getDepostiResult();
      console.log("active", bets);
      const redeemed = await getQueryRedeemed("redeemed");
      const canceled = await getQueryResult("canceled");
      const deposited = await getQueryResult("active"); // Implement logic for deposits
      const unclaimed = await getUnclaimedResult();

      const daterang = [];
      daterang.push(formattedStartDate.substring(0, 10));
      daterang.push(formattedEndDate.substring(0, 10));

      return {
        bets,
        redeemed,
        canceled,
        deposited,
        unclaimed,
        date: daterang,
      };
    };

    const todayReport = await getReportData(today);
    const yesterdayReport = await getReportData(yesterday);

    res.status(200).json({
      err: "false",
      today: todayReport,
      yesterday: yesterdayReport,
    });
  },

  generateDetailCashierReport: async (req, res) => {
    const { cashierId } = req.query;
    // console.log(cashierId);
    try {
      // .findById(cashierId)
      const cashierReport = await Cashier.query()
        .withGraphFetched("shop")
        .withGraphFetched("[slips]")
        .modifyGraph("slips", (builder) => {
          builder.select(
            Slip.raw("COUNT(*) as tickets"),
            Slip.raw("SUM(totalStake) as stake"),
            Slip.raw(
              'SUM(CASE WHEN status = "redeemed" THEN netWinning ELSE 0 END) as payout'
            ),
            Slip.raw(
              'SUM(CASE WHEN status = "redeem" THEN netWinning ELSE 0 END) as unclaimed'
            ),
            Slip.raw(
              'COUNT(CASE WHEN status = "canceled" THEN 1 END) as revoked'
            ),
            Slip.raw(
              'SUM(netWinning - CASE WHEN status = "redeemed" THEN netWinning ELSE 0 END - CASE WHEN status = "canceled" THEN 0 ELSE CASE WHEN status = "redeem" THEN netWinning ELSE 0 END END) as ggr'
            ),
            Slip.raw(
              'SUM(netWinning - CASE WHEN status = "redeemed" THEN netWinning ELSE 0 END) as netBalance'
            )
          );
        });

      res.status(200).json(cashierReport);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: true });
    }
  },

  recallBetsReport: async (req, res) => {
    const { cashierId } = req.params;
    const currentGame = await Cashier.query().findById(cashierId);
    if (!currentGame) {
      return res.status(404).json({ message: "Cashier not found." });
    }

    const date = new Date();
    // const yesterday = subDays(today, 1);

    const formatDate = (date) => format(date, "yyyy-MM-dd HH:mm:ss");
    const formattedStartDate = formatDate(startOfDay(date));
    // Set to the end of the day (23:59:59)
    const formattedEndDate = formatDate(endOfDay(date));
    console.log(formattedStartDate);
    console.log(formattedEndDate);

    const result = await Slip.query()
      .where("cashierId", cashierId)
      .andWhere("created_at", ">=", formattedStartDate)
      .andWhere("created_at", "<", formattedEndDate)
      .withGraphFetched("game")
      .orderBy("created_at", "desc")
      .limit(50);

    const rebalancedBets = result.map((slip) =>
      convertToRebalancedFormat(slip)
    );

    // .andWhere('created_at', '>=', formattedEndDate)
    // .andWhere('created_at', '<', formattedStartDate)
    // .andWhere('status', 'redeem')
    // .andWhere('netWinning', '>', 0)
    // .sum('totalStake as amount')
    // .count('id as number')
    // .first();

    res.status(200).json(rebalancedBets);
  },

  deleteSlip: async (req, res, next) => {
    const { id } = req.params;

    try {
      const deletedSlip = await Slip.query().deleteById(id);
      if (deletedSlip) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Slip not found 5" });
      }
    } catch (error) {
      next(error);
    }
  },
};

function convertToRebalancedFormat(slip) {
  const numberPick = JSON.parse(slip.numberPick);
  // console.log(slip);

  return {
    err: "false",
    game: slip.gameType,
    errText: "bet placed.",
    gameStartsOn: `${slip.gameType} # ${slip?.game?.gameNumber}`,
    id: String(slip?.game?.gameNumber),
    on: format(new Date(slip.created_at), "yyyy/MM/dd HH:mm:ss"),
    by: `cashier`,
    agent: "agent",
    TotalStake: slip.totalStake,
    stake: slip.totalStake,
    toWinMax: slip.toWinMax,
    toWinMin: slip.toWinMin,
    code: slip.id, // Generate a unique code or use an existing one
    company: slip.company || "chessbet", // Use 'chessbet' if company is null
    user: numberPick.map((selection) => ({
      odd: selection.odd,
      stake: selection.stake,
      selection: selection.selection || selection.val,
    })),
  };
}

module.exports = slipController;
