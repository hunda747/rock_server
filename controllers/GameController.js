// controllers/gameController.js

const Game = require("../models/game");
const knex = require("knex");
const GameController = {
  constructor: () => {
    this.generateRandomNumbers = this.generateRandomNumbers.bind(this);
    this.createNewGameEntry = this.createNewGameEntry.bind(this);
  },

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
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      next(error);
    }
  },

  createGame: async (req, res, next) => {
    console.log("ss");
    const gameData = req.body;
    console.log(gameData);
    try {
      const newGame = await Game.query().insert(gameData);
      res.send(newGame);
    } catch (error) {
      next(error);
    }
  },

  updateGame: async (req, res, next) => {
    const { id } = req.params;
    const updatedGameData = req.body;

    const updateQuery = {};

    if (updatedGameData.hasOwnProperty("gameNumber")) {
      updateQuery.gameNumber = updatedGameData.gameNumber;
    }

    if (updatedGameData.hasOwnProperty("gameType")) {
      updateQuery.gameType = updatedGameData.gameType;
    }

    if (updatedGameData.hasOwnProperty("pickedNumbers")) {
      updateQuery.pickedNumbers = JSON.stringify(updatedGameData.pickedNumbers);
      // updateQuery.pickedNumbers = Game.raw(
      //   'JSON_SET(pickedNumbers, "$.selection", ?)',
      //   [updatedGameData.pickedNumbers.selection]
      // );
    }

    if (updatedGameData.hasOwnProperty("winner")) {
      updateQuery.winner = updatedGameData.winner;
    }

    if (updatedGameData.hasOwnProperty("status")) {
      updateQuery.status = updatedGameData.status;
    }

    try {
      const updatedGame = await Game.query().findById(id).patch(updateQuery);
      if (!updatedGame) {
        return res.status(404).json({ error: "Game not found" });
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
        return res.status(404).json({ error: "Game not found" });
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },

  generateRandomNumbers: () => {
    const numbers = [];

    while (numbers.length < 20) {
      const randomNum = Math.floor(Math.random() * 80) + 1;

      // Ensure the number is not already in the array
      if (!numbers.includes(randomNum)) {
        numbers.push(randomNum);
      }
    }

    return numbers;
  },

  createNewGameEntry: async (gameType, gameNumber) => {
    try {
      // Use Knex to insert a new entry into the 'games' table
      const newGameEntry = await Game.query()
        .insert({
          gameType: gameType,
          gameNumber: gameNumber,
          // Add other fields as needed based on your table structure
          // Example: pickedNumbers, winner, time, status, etc.
        })
        .returning("*"); // Returning the inserted entry

      // Return the newly created game entry
      return newGameEntry[0];
    } catch (error) {
      console.error("Error creating new game entry:", error);
      throw error; // Rethrow the error for handling in the calling function or route
      return false;
    }
  },

  // Controller
  getLastPlayedGame: async (req, res) => {
    try {
      // Retrieve the last played game
      const lastPlayedGame = await Game.query()
        .where("status", "done")
        .orderBy("time", "desc")
        .first();

      if (!lastPlayedGame) {
        return res.status(404).json({ message: "No games played yet." });
      }

      // Update the current game with the drawn number
      const currentGame = await Game.query()
        .where("status", "playing")
        .orderBy("time", "desc")
        .first();

      let openGame;

      if (currentGame) {
        openGame = currentGame;
      } else {
        openGame = await Game.query()
          .insert({
            gameType: "keno",
            gameNumber: lastPlayedGame.gameNumber + 1,
            // Add other fields as needed based on your table structure
            // Example: pickedNumbers, winner, time, status, etc.
          })
          .returning("*");
      }
      // Retrieve the open game (next game)

      // Construct the response in the specified format
      const response = {
        openGame: openGame
          ? { id: openGame.id, gameNumber: openGame.gameNumber }
          : null,
        result: JSON.parse(lastPlayedGame.pickedNumbers)?.selection,
        lastGame: lastPlayedGame.gameNumber,
        recent: lastPlayedGame.gameNumber,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error retrieving last played game:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  // Controller
  getCurrentGameResult: async (req, res) => {
    const { gameNumber } = req.params;
    try {
      // Update the current game with the drawn number
      const currentGame = await Game.query()
        .where("id", gameNumber)
        .first();

      if (!currentGame) {
        return res.status(404).json({ message: "No active games currently." });
      }
      console.log('result:', currentGame);
      let drawnNumber;
      if (!currentGame.pickedNumbers) {
        // Assume you have a function to draw the number and update the database
        const numbers = [];

        while (numbers.length < 20) {
          const randomNum = Math.floor(Math.random() * 80) + 1;

          // Ensure the number is not already in the array
          if (!numbers.includes(randomNum)) {
            numbers.push(randomNum);
          }
        }
        drawnNumber = numbers;
        // const drawnNumber = this.generateRandomNumbers();


        // Update the pickedNumbers field with the drawn number
        await currentGame
          .$query()
          .patch({
            pickedNumbers: JSON.stringify({ selection: [drawnNumber] }),
            status: "done",
          });
      } else {
        // console.log('resultPA:', );
        drawnNumber = JSON.parse(currentGame?.pickedNumbers)?.selection;
      }

      // Retrieve the previous game
      const previousGame = await Game.query()
        .where("status", "done")
        .orderBy("time", "desc")
        .offset(1)
        .first();


      let openGame;
      // Update the current game with the drawn number
      const newGame = await Game.query()
        .where('status', 'playing')
        .orderBy('time', 'desc')
        .first();

      if (newGame) {
        openGame = newGame;
      } else {
        openGame = await Game.query().insert({
          gameType: 'keno',
          gameNumber: (currentGame.gameNumber + 1),
          // Add other fields as needed based on your table structure
          // Example: pickedNumbers, winner, time, status, etc.
        }).returning('*');
      }

      // Construct the response in the specified format
      const response = {
        openGame: { id: openGame.id, gameNumber: openGame.gameNumber },
        game: { gameNumber: currentGame.gameNumber },
        result: drawnNumber,
        lastGame: previousGame ? previousGame.gameNumber : null,
        recent: [],
      };
      // Respond with the updated game data
      return res.status(200).json(response);
    } catch (error) {
      console.error("Error getting current game result:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },
};

module.exports = GameController;
