// controllers/gameController.js

const Game = require('../models/game');

const gameController = {
  getAllGames: async (req, res, next) => {
    try {
      const games = await Game.query();
      res.json(games);
    } catch (error) {
      next(error);
    }
  },

  getGameById: async (req, res, next) => {
    const { gameId } = req.params;
    try {
      const game = await Game.query().findById(gameId);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json(game);
    } catch (error) {
      next(error);
    }
  },

  createGame: async (req, res, next) => {
    const gameData = req.body;
    try {
      const newGame = await Game.query().insert(gameData);
      res.status(201).json(newGame);
    } catch (error) {
      next(error);
    }
  },

  updateGame: async (req, res, next) => {
    const { gameId } = req.params;
    const updatedGameData = req.body;
    try {
      const updatedGame = await Game.query().patchAndFetchById(gameId, updatedGameData);
      if (!updatedGame) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json(updatedGame);
    } catch (error) {
      next(error);
    }
  },

  deleteGame: async (req, res, next) => {
    const { gameId } = req.params;
    try {
      const deletedCount = await Game.query().deleteById(gameId);
      if (deletedCount === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
};

module.exports = gameController;
