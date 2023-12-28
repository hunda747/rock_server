// controllers/slipController.js

const Slip = require('../models/slip');
const Game = require('../models/game');

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
      const slip = await Slip.query().findById(id);
      if (slip) {
        res.json(slip);
      } else {
        res.status(404).json({ error: 'Slip not found' });
      }
    } catch (error) {
      next(error);
    }
  },

  createSlip: async (req, res, next) => {
    const param = req.body;

    // Update the current game with the drawn number
    const currentGame = await Game.query()
    .where("status", "playing")
    .where("gameType", "keno")
    .orderBy("time", "desc")
    .first();

    if (!currentGame) {
      return res.status(404).json({ message: "Game Closed." });
    }

    try {
      const slip = await Slip.query().insert({
        gameId: currentGame.id,
        gameType: param.gameType,
        netStake: param.netStake,
        grossStake: param.netStake,
        numberPick: JSON.stringify(param.numberPick),
        shopOwnerId: param.shopOwner,
        shopId: param.shop,
        cashierId: param.cashier,
      });
      res.status(201).json(slip);
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
        res.status(404).json({ error: 'Slip not found' });
      }
    } catch (error) {
      next(error);
    }
  },

  deleteSlip: async (req, res, next) => {
    const { id } = req.params;

    try {
      const deletedSlip = await Slip.query().deleteById(id);
      if (deletedSlip) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: 'Slip not found' });
      }
    } catch (error) {
      next(error);
    }
  },
};

module.exports = slipController;
