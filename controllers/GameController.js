// controllers/gameController.js

const Game = require("../models/game");
const Ticket = require("../models/slip");
const Cashier = require("../models/cashier");
const knex = require("knex");
const oddsTable = require("../odd/kiron");
const { transaction } = require('objection');

const { Mutex } = require('async-mutex');
const gameMutex = new Mutex();

const { generateSpinRandomNumbers } = require("../middleware/spinResult");
const { generateRandomNumbersKeno } = require("../middleware/kenoResultYaf");
// const { generateRandomNumbersKeno } = require("../middleware/kenoResult");
const Shop = require("../models/shop");
const logger = require("../logger");
const { getCurrentDate } = require("./DailyReportController");
const { stringify } = require("uuid");

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
    // console.log("ss");
    const gameData = req.body;
    // console.log(gameData);
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

    // if (updatedGameData.hasOwnProperty("gameNumber")) {
    //   updateQuery.gameNumber = updatedGameData.gameNumber;
    // }

    // if (updatedGameData.hasOwnProperty("gameType")) {
    //   updateQuery.gameType = updatedGameData.gameType;
    // }

    // if (updatedGameData.hasOwnProperty("pickedNumbers")) {
    //   updateQuery.pickedNumbers = JSON.stringify(updatedGameData.pickedNumbers);
    //   // updateQuery.pickedNumbers = Game.raw(
    //   //   'JSON_SET(pickedNumbers, "$.selection", ?)',
    //   //   [updatedGameData.pickedNumbers.selection]
    //   // );
    // }

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

  createNewGameEntry: async (gameType, gameNumber, shopId) => {
    try {
      // Use Knex to insert a new entry into the 'games' table
      const newGameEntry = await Game.query()
        .insert({
          gameType: gameType,
          gameNumber: gameNumber,
          shopId: shopId,
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
    const timezoneOffset = 0;
    const reportDate = new Date().toISOString().substr(0, 10);
    const startOfDay = new Date(`${reportDate}T00:00:00.000Z`);
    startOfDay.setMinutes(startOfDay.getMinutes() - timezoneOffset);
    const endOfDay = new Date(`${reportDate}T23:59:59.999Z`);
    endOfDay.setMinutes(endOfDay.getMinutes() - timezoneOffset);

    let { shopId } = req.body;
    try {
      if (!shopId) {
        return res.status(404).json({ message: "No active games currently." });
      }
      const findshop = await Shop.query().where("username", shopId).first();
      if (!findshop) {
        return res.status(404).json({ message: "No active games currently." });
      }
      shopId = findshop.id;

      // Retrieve the last played game
      const lastPlayedGame = await Game.query()
        .where("status", "done")
        .andWhere("gameType", "keno")
        .andWhere("shopId", shopId)
        .andWhere("created_at", ">=", startOfDay)
        .andWhere("created_at", "<=", endOfDay)
        .orderBy("id", "desc")
        .limit(1)
        .first();

      // if (!lastPlayedGame) {
      //   return res.status(404).json({ message: "No games played yet." });
      // }

      // Update the current game with the drawn number
      const currentGame = await Game.query()
        // .where("status", "playing")
        .andWhere("gameType", "keno")
        .andWhere("created_at", ">=", startOfDay)
        .andWhere("created_at", "<=", endOfDay)
        .andWhere("shopId", shopId)
        .orderBy("id", "desc")
        .limit(1)
        .first();

      let openGame;

      if (currentGame && currentGame?.status === "playing") {
        openGame = currentGame;
      } else {
        const gn = currentGame?.gameNumber || findshop?.kenoStartNumber || 8100;
        openGame = await Game.query()
          .insert({
            gameType: "keno",
            gameNumber: gn + 1,
            shopId: shopId
          })
          .returning("*");
      }
      // Retrieve the open game (next game)
      // console.log("json", lastPlayedGame.pickedNumbers);
      // console.log("json", lastPlayedGame.pickedNumbers.selection);
      // Construct the response in the specified format
      const response = {
        openGame: openGame
          ? { id: openGame.id, gameNumber: openGame.gameNumber }
          : null,
        result: lastPlayedGame ? JSON.parse(lastPlayedGame.pickedNumbers)?.selection.map(
          (item) => ({ value: item })
        ) : [],
        lastGame: lastPlayedGame
          ? { id: lastPlayedGame.id, gameNumber: lastPlayedGame.gameNumber }
          : null,
        recent: await getLast10Games(shopId),
        // recent: lastPlayedGame.gameNumber,
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error("Error retrieving last played keno game:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  getCurrentGameResult: async (req, res) => {
    let { gameNumber, shopId } = req.body;
    // console.log('game', gameNumber);
    try {
      // Validate input
      if (!gameNumber || !shopId) {
        return res.status(400).json({ message: "Invalid input data." });
      }

      // Acquire lock
      const release = await acquireLockWithTimeout(gameMutex, 5000);
      if (!release) {
        logger.error(`Failed to acquire lock. for shop: ${shopId} gameNumber: ${gameNumber}`)
        return res.status(500).json({ message: "Failed to acquire lock." });
      }

      // Start transaction
      await transaction(Game.knex(), async (trx) => {
        // Check shop existence
        const findShop = await Shop.query().findOne({ username: shopId });
        if (!findShop) {
          release();
          return res.status(404).json({ message: "Shop not found." });
        }

        shopId = findShop.id;

        // Retrieve current game
        const currentGame = await Game.query()
          .findOne({ id: gameNumber, gameType: 'keno', shopId, status: 'playing' })
          .forUpdate();
        // .findOne({ status: 'playing', gameType: 'keno', shopId })

        if (!currentGame) {
          logger.error(`current game not found keno for shop: ${findShop?.username}`);
          release();
          return res.status(404).json({ message: "Game not found." });
        }

        let response;
        if (!currentGame.pickedNumbers) {
          // Generate random numbers securely
          const numbers = await generateRandomNumbersKeno(gameNumber, findShop.rtp, shopId, res);

          // Update game with drawn numbers
          let headsCount = 0;
          let tailsCount = 0;

          for (const num of numbers) {
            if (num >= 1 && num <= 40) {
              headsCount++;
            } else if (num >= 41 && num <= 80) {
              tailsCount++;
            }
          }

          const winner = headsCount > tailsCount ? "heads" : tailsCount > headsCount ? "tails" : "tails";

          // Update game
          await currentGame.$query(trx).patch({
            pickedNumbers: JSON.stringify({ selection: numbers }),
            status: "done",
            winner: winner
          });

          const newGameNumber = currentGame.gameNumber + 1;
          await trx.raw(`
            CREATE TABLE IF NOT EXISTS game_lock (
              game_number VARCHAR(255) PRIMARY KEY
            );
          `);

          const lockAcquired = await trx.raw(`
            INSERT INTO game_lock (game_number) VALUES ('${getTodayDate() + '_' + currentGame.gameType + '_' + shopId.toString() + '_' + (newGameNumber).toString()}');
          `);

          if (lockAcquired.length === 0) {
            // Lock could not be acquired (handle conflict)
            release();
            logger.error(`Failed to acquire lock for game: ${gameNumber} in SHop: ${shopId}`);
            return res.status(409).json({ message: "Conflict detected. Please try again." }); // Or retry logic
          }
          // Create new game
          const newGame = await Game.query(trx).insert({
            gameType: "keno",
            gameNumber: newGameNumber,
            shopId
          }).returning("*");

          let finalgameobject = await finalResult(currentGame, numbers)
          const last10Result = await getLast10Games(shopId);
          last10Result.unshift(finalgameobject);

          // Calculate winning numbers
          calculateWiningNumbers(gameNumber, numbers, winner);

          response = {
            openGame: { id: newGame.id, gameNumber: newGame.gameNumber },
            game: { gameNumber: currentGame.gameNumber },
            result: numbers.map((item) => ({ value: item })),
            lastGame: currentGame.gameNumber,
            recent: last10Result
          };
        } else {
          release();
          logger.error(`Game with picked number on game id: ${gameNumber}, shop id: ${shopId}`)
          return res.status(404).json({ message: "Game not found." });
        }

        // Release lock and respond with data
        release();
        return res.status(200).json(response);
      });
    } catch (error) {
      logger.error(`Error getting current game result: ${error}`);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  getCurrentGameResultOld: async (req, res) => {
    let { gameNumber, shopId } = req.body;
    console.log(gameNumber);
    try {
      // const release = await gameMutex.acquire();
      const release = await acquireLockWithTimeout(gameMutex, 5000);
      try {
        if (!shopId) {
          return res.status(404).json({ message: "No active games currently." });
        }
        const findshop = await Shop.query().where("username", shopId).first();
        if (!findshop) {
          return res.status(404).json({ message: "No active games currently." });
        }
        shopId = findshop.id;
        let response;
        // Update the current game with the drawn number
        // Wrap critical operations within a transaction
        await transaction(Game.knex(), async (trx) => {
          // const currentGame = await Game.query().where("id", gameNumber).andWhere('gameType', 'keno').andWhere('shopId', shopId).first();
          const currentGame = await Game.query().where("status", "playing").andWhere('gameType', 'keno').andWhere('shopId', shopId).first();

          if (!currentGame) {
            return res.status(404).json({ message: "No active games currently." });
          }
          // console.log("result:", currentGame);
          let drawnNumber;
          if (!currentGame.pickedNumbers) {
            // Assume you have a function to draw the number and update the database
            const numbers = await generateRandomNumbersKeno(gameNumber, findshop.rtp, shopId, res);
            drawnNumber = numbers;

            let headsCount = 0;
            let tailsCount = 0;
            let evenCount = 0;

            for (const num of numbers) {
              if (num <= 40) {
                evenCount++;
                // Assuming heads for even numbers, tails for odd numbers
                headsCount++;
              } else {
                tailsCount++;
              }
            }
            // const drawnNumber = this.generateRandomNumbers();
            const winner =
              headsCount > tailsCount
                ? "heads"
                : tailsCount > headsCount
                  ? "tails"
                  : "evens";
            // Update the pickedNumbers field with the drawn number
            await currentGame.$query().patch({
              pickedNumbers: JSON.stringify({ selection: drawnNumber }),
              status: "done",
              winner: winner,
            });

            calculateWiningNumbers(gameNumber, drawnNumber, winner);
          } else {
            // console.log('resultPA:', );
            drawnNumber = JSON.parse(currentGame?.pickedNumbers)?.selection;
          }
          // calculateWiningNumbers(drawnNumber, gameNumber);

          // Retrieve the previous game
          const previousGame = await Game.query()
            .where("status", "done")
            .andWhere("gameType", "keno")
            .andWhere('shopId', shopId)
            .orderBy("id", "desc")
            .offset(1)
            .first();

          let openGame;
          // Update the current game with the drawn number
          const newGame = await Game.query()
            .where("status", "playing")
            .andWhere("gameType", "keno")
            .andWhere('shopId', shopId)
            .orderBy("id", "desc")
            .first();

          if (newGame) {
            openGame = newGame;
          } else {
            openGame = await Game.query()
              .insert({
                gameType: "keno",
                gameNumber: currentGame.gameNumber + 1,
                shopId: shopId
                // Add other fields as needed based on your table structure
                // Example: pickedNumbers, winner, time, status, etc.
              })
              .returning("*");
          }

          // Construct the response in the specified format
          response = {
            openGame: { id: openGame.id, gameNumber: openGame.gameNumber },
            game: { gameNumber: currentGame.gameNumber },
            result: drawnNumber.map((item) => ({ value: item })),
            lastGame: previousGame ? previousGame.gameNumber : null,
            recent: await getLast10Games(shopId),
          };
          release();
        })
        // Respond with the updated game data
        return res.status(200).json(response);
      } catch (error) {
        console.error("Error getting current game result:", error);
        return res.status(500).json({ message: "Internal server error." });
      } finally {
        // Release the lock when the critical section is done
        if (release) {
          release();
        } else {
          console.log('no time out keno');
        }
      }
    } catch (error) {
      // Handle timeout error
      if (error instanceof knex.KnexTimeoutError) {
        // throw new Error('Failed to acquire lock within the specified timeout');
        logger.error('Failed to acquire lock within the specified timeout');
        return res.status(500).json({ message: "Internal server error." });
      }
      // Handle other errors
      // throw error;
      logger.error(error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  // Controller
  getLastPlayedGameSpin: async (req, res) => {
    let { shopId } = req.body;

    const timezoneOffset = 0;
    const reportDate = new Date().toISOString().substr(0, 10);
    const startOfDay = new Date(`${reportDate}T00:00:00.000Z`);
    startOfDay.setMinutes(startOfDay.getMinutes() - timezoneOffset);
    const endOfDay = new Date(`${reportDate}T23:59:59.999Z`);
    endOfDay.setMinutes(endOfDay.getMinutes() - timezoneOffset);
    try {
      if (!shopId) {
        return res.status(404).json({ message: "No active games currently." });
      }

      const findshop = await Shop.query().where("username", shopId).first();
      if (!findshop) {
        return res.status(404).json({ message: "No active games currently." });
      }
      shopId = findshop.id;

      // Retrieve the last played game
      // const lastPlayedGame = await Game.query()
      //   .where("status", "done")
      //   .andWhere("gameType", "spin")
      //   .andWhere("shopId", shopId)
      //   .andWhere("created_at", ">=", startOfDay)
      //   .andWhere("created_at", "<=", endOfDay)
      //   .orderBy("id", "desc")
      //   .first().limit(1);

      // if (!lastPlayedGame) {
      //   return res.status(404).json({ message: "No games played yet." });
      // }

      // Update the current game with the drawn number
      const currentGame = await Game.query()
        // .where("status", "playing")
        .andWhere("gameType", "spin")
        .andWhere("created_at", ">=", startOfDay)
        .andWhere("created_at", "<=", endOfDay)
        .andWhere("shopId", shopId)
        .orderBy("id", "desc")
        .limit(1)
        .first();

      let openGame;

      if (currentGame && currentGame?.status === "playing") {
        openGame = currentGame;
      } else {
        const gm = currentGame?.gameNumber || findshop?.spinStartNumber || 25000;
        openGame = await Game.query()
          .insert({
            gameType: "spin",
            gameNumber: gm + 1,
            shopId: shopId
          })
          .returning("*");
      }
      // Retrieve the open game (next game)
      // console.log("json", lastPlayedGame.pickedNumbers);
      // console.log("json", lastPlayedGame.pickedNumbers.selection);
      // Construct the response in the specified format
      const response = {
        openGame: openGame
          ? { id: openGame.id, gameNumber: openGame.gameNumber }
          : null,
        recent: await getLast100Games(shopId),
        // recent: lastPlayedGame.gameNumber,
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error("Error retrieving last played spin game:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  // Controller
  getCurrentGameResultSpin: async (req, res) => {
    let { gameNumber, shopId } = req.body;

    try {
      if (!shopId || !gameNumber) {
        return res.status(404).json({ message: "No agent username." });
      }

      const release = await acquireLockWithTimeout(gameMutex, 5000);
      if (!release) {
        logger.error(`Failed to acquire lock. for shop: ${shopId} gameNumber: ${gameNumber}`)
        return res.status(500).json({ message: "Failed to acquire lock." });
      }

      await transaction(Game.knex(), async (trx) => {
        // Check shop existence
        const findshop = await Shop.query().findOne({ username: shopId });
        if (!findshop) {
          release();
          logger.error("Shop not found for result", shopId);
          return res.status(404).json({ message: "No shop found." });
        }
        shopId = findshop.id;

        // Retrieve current game
        const currentGame = await Game.query()
          .findOne({ id: gameNumber, gameType: 'spin', shopId, status: 'playing' })
          .orderBy("id", "desc")
          .forUpdate();
        // console.log(currentGame);

        if (!currentGame) {
          logger.error(`current game not found spin for shop: ${shopId}`);
          release();
          return res.status(404).json({ message: "No active games currently." });
        }

        let response;
        if (!currentGame.pickedNumbers) {
          // Assume you have a function to draw the number and update the database
          let drawnNumber = await generateSpinRandomNumbers(gameNumber, findshop.spinRtp, shopId)
          // console.log('ddraw', drawnNumber);

          const winners = determineAllWinners(drawnNumber);

          // Update the pickedNumbers field with the drawn number
          await currentGame.$query().patch({
            pickedNumbers: JSON.stringify({ selection: drawnNumber }),
            status: "done",
            winner: JSON.stringify(winners),
          });

          const newGameNumber = currentGame.gameNumber + 1;
          await trx.raw(`
            CREATE TABLE IF NOT EXISTS game_lock (
              game_number VARCHAR(255) PRIMARY KEY
            );
          `);
          const lockAcquired = await trx.raw(`
            INSERT INTO game_lock (game_number) VALUES ('${getTodayDate() + '_' + currentGame.gameType + '_' + shopId.toString() + '_' + (newGameNumber).toString()}');
          `);

          if (lockAcquired.length === 0) {
            // Lock could not be acquired (handle conflict)
            release();
            logger.error(`Failed to acquire lock for game: ${gameNumber} in SHop: ${shopId}`);
            return res.status(409).json({ message: "Conflict detected. Please try again." }); // Or retry logic
          }
          // Create new game
          const newGame = await Game.query(trx).insert({
            gameType: "spin",
            gameNumber: newGameNumber,
            shopId
          }).returning("*");

          calculateSlipWiningNumbers(gameNumber, drawnNumber, winners);

          response = {
            openGame: { id: newGame.id, gameNumber: newGame.gameNumber },
            result: {
              gameResult: drawnNumber,
              gameNumber: currentGame.gameNumber,
              id: currentGame.id,
            },
            recent: await getLast100Games(shopId),
            // recent: await getLast100Games(shopId),
          };
        } else {
          release();
          logger.error(`SPIN Game with picked number on game id: ${gameNumber}, shop id: ${shopId}`)
          return res.status(404).json({ message: "Game not found." });
        }

        release()
        return res.status(200).json(response);
      })
    } catch (error) {
      // Handle timeout error
      if (error instanceof knex.KnexTimeoutError) {
        logger.error('Failed to acquire lock within the specified timeout', error);
        return res.status(500).json({ message: "Internal server error." });
      }
      // Handle other errors
      logger.error('Error drawing spin result', error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  resetGameNumber: async () => {
    const shops = await Shop.query();

    shops.map(async (shop) => {
      const currentGame = await Game.query().where("status", "playing").andWhere('gameType', 'keno').andWhere('shopId', shop.id).orderBy("id", "desc").first();

      if (currentGame) {
        const numbers = await generateRandomNumbersKeno(currentGame.id, shop.rtp, shop.id);

        let headsCount = 0;
        let tailsCount = 0;
        let evenCount = 0;

        for (const num of numbers) {
          if (num <= 40) {
            evenCount++;
            // Assuming heads for even numbers, tails for odd numbers
            headsCount++;
          } else {
            tailsCount++;
          }
        }
        // const drawnNumber = this.generateRandomNumbers();
        const winner =
          headsCount > tailsCount
            ? "heads"
            : tailsCount > headsCount
              ? "tails"
              : "evens";
        // Update the pickedNumbers field with the drawn number
        await currentGame.$query().patch({
          pickedNumbers: JSON.stringify({ selection: numbers }),
          status: "done",
          winner: winner,
        });
        // console.log('keno', currentGame);

        calculateWiningNumbers(currentGame.id, numbers, winner);
      } else {
        console.log('No game');
      }

      const openGame = await Game.query()
        .insert({
          gameType: "keno",
          gameNumber: shop.kenoStartNumber,
          shopId: shop.id
          // Add other fields as needed based on your table structure
          // Example: pickedNumbers, winner, time, status, etc.
        })

      const currentGameSpin = await Game.query().where("status", "playing").andWhere('gameType', 'spin').andWhere('shopId', shop.id).orderBy("id", "desc").first();

      if (currentGameSpin) {
        const drawnNumber = await generateSpinRandomNumbers(currentGameSpin.id, shop.spinRtp, shop.id)
        // console.log('ddraw', drawnNumber);

        const winners = determineAllWinners(drawnNumber);
        // console.log(winners);
        // Update the pickedNumbers field with the drawn number
        await currentGameSpin.$query().patch({
          pickedNumbers: JSON.stringify({ selection: drawnNumber }),
          status: "done",
        });
        // console.log('spinres', cu);

        calculateSlipWiningNumbers(currentGame.id, drawnNumber, winners);
      } else {
        console.log(" no smin game");
      }

      const openGameSpin = await Game.query()
        .insert({
          gameType: "spin",
          gameNumber: shop.spinStartNumber,
          shopId: shop.id
          // Add other fields as needed based on your table structure
          // Example: pickedNumbers, winner, time, status, etc.
        })
    })

    return true;
  },

  searchGame: async (req, res) => {
    try {
      const { gameType, date, eventId, shopId } = req.query;
      let result = [];
      if (!shopId) {
        return res.status(404).json({ error: "Missing Shop Id" });
      }
      if (!gameType) {
        return res.status(404).json({ error: "Missing game type" });
      }
      if (eventId) {
        result = await Game.query().where("gameNumber", eventId).andWhere("shopId", shopId);
      } else {
        let query = Game.query().where("gameType", gameType);
        if (date) {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);

          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          query = query
            .where("time", ">=", startOfDay)
            .where("time", "<=", endOfDay);
        }
        result = (await query.where('shopId', shopId).orderBy('gameNumber', 'desc'));
      }

      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  getGameRusult: async (req, res) => {
    const { gameNumber, shop } = req.params;
    try {
      const reportDate = getCurrentDate();
      const timezoneOffset = 0; // Set the time zone offset to 0 for UTC

      const startOfDay = new Date(`${reportDate}T00:00:00.000Z`);
      startOfDay.setMinutes(startOfDay.getMinutes() - timezoneOffset);

      const endOfDay = new Date(`${reportDate}T23:59:59.999Z`);
      endOfDay.setMinutes(endOfDay.getMinutes() - timezoneOffset);
      // Update the current game with the drawn number
      const currentGame = await Game.query()
        .where("gameNumber", gameNumber)
        .andWhere("shopId", shop)
        .andWhere("status", "done")
        .where("created_at", ">=", startOfDay)
        .where("created_at", "<=", endOfDay)
        .first();

      if (!currentGame) {
        return res.status(404).json({ message: "Game not found." });
      }

      const drawnNumber = JSON.parse(currentGame?.pickedNumbers)?.selection;
      // console.log('dd', drawnNumber);
      if (!drawnNumber || !(drawnNumber)) {
        return res.status(500).json({ message: "Invalid drawn numbers." });
      }

      let drawn = [];
      if (!Array.isArray(drawnNumber)) {
        drawn.push(drawnNumber)
      } else {
        drawn = null
      }


      let resultObject = null;
      if (!Array.isArray(drawn)) {
        // console.log("draw", drawn);
        resultObject = {
          err: "false",
          0: currentGame.gameType,
          ...drawnNumber?.reduce((acc, number, index) => {
            acc[index + 1] = number;
            return acc;
          }, {}) || drawnNumber,
          21: currentGame.gameNumber,
          22: currentGame.gameNumber, // Assuming gameId is what you want for "21" and "22"
        };
      } else {
        // console.log("draw", drawnNumber);
        const winc = determineAllWinners(drawnNumber);
        resultObject = {
          err: 'false',
          1: drawnNumber,
          2: (winc.color),
          3: (winc.oddEven),
          21: currentGame.gameNumber,
          22: currentGame.gameNumber, // Assuming gameId is what you want for "21" and "22"
          0: currentGame.gameType,
        }
      }
      res.status(200).send(resultObject);
    } catch (error) {
      console.error("Error getting current game result:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },
};

const finalResult = async (currentGame, numbers) => {
  return {
    "id": currentGame.id,
    "gameNumber": currentGame.gameNumber,
    "status": "done",
    "results": numbers.map((item) => ({ value: item }))
  }
}
const formatSpinFinalResult = async (currentGame, results) => {
  return { id: currentGame.id, gameNumber: currentGame.gameNumber, status: 'done', gameResult: results };
}
// const gameLocks = {}; // Object to store locks for each game

// // Function to acquire per-game lock
// const acquireLockWithTimeout = async (gameNumber) => {
//   return new Promise((resolve, reject) => {
//     if (!gameLocks[gameNumber]) {
//       gameLocks[gameNumber] = new Mutex();
//     }

//     const timer = setTimeout(() => {
//       reject(new Error('Timeout while acquiring lock'));
//     }, 5000); // Timeout value can be adjusted

//     gameLocks[gameNumber].acquire().then((release) => {
//       clearTimeout(timer);
//       resolve(release);
//     }).catch((error) => {
//       clearTimeout(timer);
//       reject(error);
//     });
//   });
// };

const acquireLockWithTimeout = async (mutex, timeout) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      mutex.release();
      reject(new Error('Timeout while acquiring lock'));
    }, timeout);

    mutex.acquire().then((release) => {
      clearTimeout(timer);
      resolve(release);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

const getTodayDate = () => {
  var currentDate = new Date();

  // Format the date into YYYYMMDD format
  return currentDate.getFullYear() +
    ('0' + (currentDate.getMonth() + 1)).slice(-2) +
    ('0' + currentDate.getDate()).slice(-2);
}

const generateRandomNumbersWithNoConsq = () => {
  const numbers = [];

  const isConsecutive = (arr) => {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] + 1 === arr[i + 1]) {
        return true; // Found consecutive numbers
      }
    }
    return false; // No consecutive numbers found
  };

  while (numbers.length < 20 || isConsecutive(numbers)) {
    numbers.length = 0; // Reset the array if consecutive numbers are found

    while (numbers.length < 20) {
      const randomNum = Math.floor(Math.random() * 80) + 1;

      // Ensure the number is not already in the array
      if (!numbers.includes(randomNum)) {
        numbers.push(randomNum);
      }
    }
  }

  return numbers;
};

const calculateCashierWinnings = async (gameNumber, tickets) => {
  // Collect unique cashier IDs
  const uniqueCashierIds = [
    ...new Set(tickets.map((ticket) => ticket.cashierId)),
  ];

  for (const cashierId of uniqueCashierIds) {
    const tickets = await Ticket.query()
      .where("cashierId", cashierId)
      .where("gameId", gameNumber)
      .whereNot("status", "canceled");

    let totalCashierWin = 0;
    let totalStakeWin = 0;

    for (const ticket of tickets) {
      totalCashierWin += parseInt(ticket.netWinning);
      totalStakeWin += parseInt(ticket.totalStake);
    }

    const existingNetWinning = (
      await Cashier.query().select("netWinning").where("id", cashierId)
    )[0]?.netWinning || 0;

    // Calculate the updated netWinning value
    const updatedNetWinning =
      existingNetWinning + (totalStakeWin - totalCashierWin);

    await Cashier.query()
      .patch({ netWinning: updatedNetWinning })
      .where("id", cashierId);
  }
};

const calculateWiningNumbers = async (gameNumber, winningNumbers, winner) => {
  // const { gameNumber } = req.params;
  // let winningNumbers = [25, 62, 47, 8, 27, 36, 35, 10, 20, 30];
  // console.log(winner);
  const tickets = await Ticket.query()
    .where("gameId", gameNumber)
    .whereNot("status", "canceled");

  if (!tickets) {
    return false;
  }
  // Iterate through each ticket
  for (const ticket of tickets) {
    const ticketPicks = JSON.parse(ticket.numberPick);

    // Initialize variables for each ticket
    let ticketWin = 0;

    for (const pick of ticketPicks) {
      const numberOfSelections = pick.selection.length;
      // console.log("nums:", pick.selection);
      // console.log("nums:", pick.selection[0]);
      // Retrieve the odds table for the specific selection
      if (typeof pick?.selection[0] === "string") {
        if (winner === "evens" && pick?.selection[0] === winner) {
          ticketWin += pick.stake * 4;
        } else if (pick?.selection[0] === winner) {
          ticketWin += pick.stake * 2;
        }
      } else {
        const oddsEntry = oddsTable[ticket.oddType][numberOfSelections];

        const actualWinnings = countCorrectGuesses(
          pick.selection,
          winningNumbers
        );
        // console.log("wins:", actualWinnings);
        if (oddsEntry && actualWinnings) {
          const modd = oddsEntry[actualWinnings - 1];
          // console.log("mod", modd);
          // Calculate the stake for the current pick based on the odds table
          // console.log("amount", pick.stake * Object.values(modd)[0]);
          ticketWin += pick.stake * Object.values(modd)[0];
        }
      }
    }
    const updatedTicket = await Ticket.query().patchAndFetchById(ticket.id, {
      netWinning: ticketWin,
      status: "redeem",
    });

    console.log("total win:", ticketWin);
  }

  // calculateCashierWinnings(gameNumber, tickets);
};

const calculateSlipWiningNumbers = async (
  gameNumber,
  winningNumbers,
  winner
) => {
  // const { gameNumber } = req.params;
  // let winningNumbers = [25, 62, 47, 8, 27, 36, 35, 10, 20, 30];
  // console.log(nums);
  const tickets = await Ticket.query()
    .where("gameId", gameNumber)
    .whereNot("status", "canceled");

  if (!tickets) {
    return false;
  }
  // Iterate through each ticket
  for (const ticket of tickets) {
    const ticketPicks = JSON.parse(ticket.numberPick);

    // Initialize variables for each ticket
    let ticketWin = 0;
    let ticketMinWin = 0;
    let ticketMaxWin = 0;

    for (const pick of ticketPicks) {
      // Retrieve the odds table for the specific selection
      if (pick.market === "OddEven") {
        if (pick?.val[0] == winner?.oddEven) {
          ticketWin += pick.stake * pick.odd;
        }
      } else if (pick.market === "Color") {
        if (pick.val[0] == winner?.color) {
          ticketWin += pick.stake * pick.odd;
        }
      } else {
        // console.log("numbers", winningNumbers);
        // if(pick.val.includes(winningNumbers)){
        if (pick?.val.map(Number).includes(winningNumbers)) {
          ticketWin += pick.stake * pick.odd;
        }
      }
    }
    const updatedTicket = await Ticket.query().patchAndFetchById(ticket.id, {
      netWinning: ticketWin,
      status: "redeem",
    });

    console.log("total win:", ticketWin);
  }
  // Iterate through the picks in the ticket

  // Now, compare the ticket's picks with the winning numbers to determine the actual winnings

  // Assuming actualWinnings is the amount won by matching the user's picks with the winning numbers
  // Update the Slip (ticket) record with the actual winnings

  // You can also do additional processing or logging here if needed
  // res.send(true);
  // await Ticket.query().findById(ticket.id).patch({ actualWinnings });
};

function countCorrectGuesses(userSelection, winningNumbers) {
  // Implement logic to count the number of correct guesses between userSelection and winningNumbers
  const correctGuesses = userSelection.filter((num) =>
    winningNumbers.includes(num)
  ).length;
  return correctGuesses;
}

const getLast10Games = async (shopId) => {
  try {
    const timezoneOffset = 0;
    const reportDate = new Date().toISOString().substr(0, 10);
    const startOfDay = new Date(`${reportDate}T00:00:00.000Z`);
    startOfDay.setMinutes(startOfDay.getMinutes() - timezoneOffset);

    const endOfDay = new Date(`${reportDate}T23:59:59.999Z`);
    endOfDay.setMinutes(endOfDay.getMinutes() - timezoneOffset);
    const games = await Game.query()
      .select("id", "gameNumber", "status", "pickedNumbers")
      .where("status", "done")
      .andWhere("gameType", "keno")
      .andWhere('shopId', shopId)
      .andWhere("created_at", ">=", startOfDay)
      .andWhere("created_at", "<=", endOfDay)
      .orderBy("id", "desc")
      .limit(10);

    const formattedGames = games.map((game) => {
      const { id, gameNumber, status, pickedNumbers } = game;
      const results = JSON.parse(pickedNumbers)?.selection.map((item) => ({
        value: item,
      }));
      return { id, gameNumber, status, results };
    });
    // console.log(formattedGames);

    return formattedGames;
  } catch (error) {
    console.error(error);
    return [];
  }
};

const getLast100Games = async (shopId) => {
  try {
    const timezoneOffset = 0;
    const reportDate = new Date().toISOString().substr(0, 10);
    const startOfDay = new Date(`${reportDate}T00:00:00.000Z`);
    startOfDay.setMinutes(startOfDay.getMinutes() - timezoneOffset);

    const endOfDay = new Date(`${reportDate}T23:59:59.999Z`);
    endOfDay.setMinutes(endOfDay.getMinutes() - timezoneOffset);
    const games = await Game.query()
      .select("id", "gameNumber", "status", "pickedNumbers")
      .where("status", "done")
      .andWhere("gameType", "spin")
      .andWhere('shopId', shopId)
      .andWhere("created_at", ">=", startOfDay)
      .andWhere("created_at", "<=", endOfDay)
      .orderBy("id", "desc")
      .limit(200);

    const formattedGames = games.map((game) => {
      const { id, gameNumber, status, pickedNumbers } = game;
      const results = JSON.parse(pickedNumbers)?.selection;
      return { id, gameNumber, status, gameResult: results };
    });
    // console.log(formattedGames);

    return formattedGames;
  } catch (error) {
    console.error(error);
    return [];
  }
};

// Function to determine winning colors based on the drawn number
function determineWinningColors(drawnNumber) {
  return numberToColorMap[drawnNumber];
}

// Function to determine winners for all groups based on the drawn number
function determineAllWinners(drawnNumber) {
  const allWinners = {};
  // Check win option
  allWinners.win = drawnNumber;

  // Check color option
  const drawnColors = determineWinningColors(drawnNumber);
  allWinners.color = (drawnNumber === '0') ? '-' : drawnColors[0];

  // Check oddEven option
  allWinners.oddEven = (drawnNumber == '0') ? '-' : drawnNumber % 2 === 0 ? "EVN" : "ODD";

  return allWinners;
}

const numberToColorMap = {
  0: ["-", "-"],
  1: ["RED", "purple"],
  2: ["BLK", "orange"],
  3: ["RED", "white"],
  4: ["BLK", "orange"],
  5: ["RED", "purple"],
  6: ["BLK", "blue"],
  7: ["RED", "white"],
  8: ["BLK", "pink"],
  9: ["RED", "yellow"],
  10: ["BLK", "pink"],
  11: ["BLK", "pink"],
  12: ["RED", "white"],
  13: ["BLK", "blue"],
  14: ["RED", "yellow"],
  15: ["BLK", "orange"],
  16: ["RED", "purple"],
  17: ["BLK", "blue"],
  18: ["RED", "yellow"],
  19: ["RED", "orange"],
  20: ["BLK", "purple"],
  21: ["RED", "orange"],
  22: ["BLK", "yellow"],
  23: ["RED", "pink"],
  24: ["BLK", "purple"],
  25: ["RED", "blue"],
  26: ["BLK", "orange"],
  27: ["RED", "blue"],
  28: ["BLK", "white"],
  29: ["BLK", "yellow"],
  30: ["RED", "pink"],
  31: ["BLK", "yellow"],
  32: ["RED", "orange"],
  33: ["BLK", "purple"],
  34: ["RED", "blue"],
  35: ["BLK", "white"],
  36: ["RED", "pink"],
};

module.exports = GameController;

// ticket, stake, payout, unclamed, revoked, ggr, net balance
