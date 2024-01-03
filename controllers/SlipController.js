// controllers/slipController.js

const Slip = require("../models/slip");
const Game = require("../models/game");
const Cashier = require("../models/cashier");

const { subDays, format } = require('date-fns');

const oddsTable = require("../odd/kiron");

const slipController = {
  getAllSlips: async (req, res, next) => {
    try {
      const slips = await Slip.query();
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
        res.status(404).json({ error: "Slip not found" });
      }
    } catch (error) {
      next(error);
    }
  },

  getSlipByGamenumber: async (req, res, next) => {
    const { code } = req.query;
    console.log("code", code);
    try {
      const slip = await Slip.query().where("id", code).first().withGraphFetched("game");
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
    console.log("param", param);

    // Update the current game with the drawn number
    const currentGame = await Game.query()
      .where("status", "playing")
      .where("gameType", param.gameType)
      .orderBy("time", "desc")
      .first();

    if (!currentGame) {
      return res.status(404).json({ message: "Game Closed." });
    }

    console.log("param:", param.numberPick);

    try {
      let totalStake = 0;
      let minWin = 0;
      let maxWin = 0;

      // Iterate through numberPick array
      for (const pick of param.numberPick) {
        const numberOfSelections = pick.selection.length;

        // Retrieve the odds table for the specific selection
        const oddsEntry = oddsTable[numberOfSelections];

        totalStake += pick.stake;
        if (oddsEntry) {
          const modd = oddsEntry[numberOfSelections - 1];
          // Calculate the stake for the current pick based on the odds table

          pick.odd = Object.values(modd)[0];
          // Update minWin and maxWin based on the stake
          minWin = pick.stake < minWin || minWin === 0 ? pick.stake : minWin; // Assuming the minimum win is the same as the stake
          maxWin += pick.stake * Object.values(modd)[0]; // Assuming the maximum win is the total stake for the pick
        }
      }

      const slip = await Slip.query().insert({
        gameId: currentGame.id,
        gameType: param.gameType,
        totalStake: totalStake,
        toWinMax: maxWin,
        toWinMin: minWin,
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
        res.status(404).json({ error: "Slip not found" });
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
      if (updatedSlip.status == "placed") {
        res.status(404).json({ err: "false", error: "Game not Done" });
      } else if (updatedSlip.status == "canceled") {
        res.status(404).json({ err: "false", error: "Ticket is canceled" });
      } else if (updatedSlip.status == "win" || updatedSlip.status == "lose") {
        const updateSlip = await Slip.query().patchAndFetchById(id, {
          status: "redeem",
        });
        res.status(200).json({ err: "false" });
      } else {
        res.status(404).json({ error: "Slip not found" });
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

      const updatedSlip = await Slip.query().patchAndFetchById(id, {
        status: "canceled",
      });
      if (updatedSlip) {
        res.json({ err: "false" });
      } else {
        res.status(404).json({ err: "false", error: "Slip not found" });
      }
    } catch (error) {
      next(error);
    }
  },

  generateCashierReport: async (req, res) => {
    const { cashierId } = req.params;
    const currentGame = await Cashier.query().findById(cashierId);
    if (!currentGame) {
      return res.status(404).json({ message: "Cashier not found." });
    }

    const today = new Date();
    const yesterday = subDays(today, 1);

    const formatDate = (date) => format(date, 'yyyy-MM-dd HH:mm:ss');

    const getReportData = async (date) => {
      const formattedStartDate = formatDate(date);
      const formattedEndDate = formatDate(subDays(date, -1));

      const getDepostiResult = async () => {
        return await Slip.query().where('cashierId', cashierId)
          // .andWhere('created_at', '>=', formattedEndDate)
          // .andWhere('created_at', '<', formattedStartDate)
          .sum('totalStake as amount')
          .count('id as number')
          .first();
      };
      const getQueryResult = async (status) => {
        return await Slip.query().where('cashierId', cashierId)
          // .andWhere('created_at', '>=', formattedEndDate)
          // .andWhere('created_at', '<', formattedStartDate)
          .andWhere('status', status)
          .sum('totalStake as amount')
          .count('id as number')
          .first();
      };

      const bets = await getQueryResult('placed');
      console.log('active', bets);
      const redeemed = await getQueryResult('redeem');
      const canceled = await getQueryResult('');
      const deposited = await getDepostiResult(); // Implement logic for deposits
      const unclaimed = await getQueryResult('win');

      return {
        bets,
        redeemed,
        canceled,
        deposited,
        unclaimed,
        date: formatDate(date),
      };
    };

    const todayReport = await getReportData(today);
    const yesterdayReport = await getReportData(yesterday);

    res.status(200).json({
      err: 'false',
      today: todayReport,
      yesterday: yesterdayReport,
    });
  },

  deleteSlip: async (req, res, next) => {
    const { id } = req.params;

    try {
      const deletedSlip = await Slip.query().deleteById(id);
      if (deletedSlip) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Slip not found" });
      }
    } catch (error) {
      next(error);
    }
  },
};

module.exports = slipController;
