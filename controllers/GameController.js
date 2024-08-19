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
const { getCurrentDate, generateDailyReport } = require("./DailyReportController");
const { stringify } = require("uuid");
const { acquireLockWithTimeoutRedis, releaseLock } = require("../util/common");
const { addReportJob } = require("../util/queue");
const { checkIfGameInQueue } = require("../util/resultQueue");

const KENOLOCK = 'game_lock_keno'
const SPINLOCK = 'game_lock_spin'

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
    const { startOfDay, endOfDay } = getStartAndEndOfDay(0);

    let { shopId } = req.body;
    // Acquire lock
    // const release = await acquireLockWithTimeout(gameMutex, 4000);
    // if (!release) {
    //   logger.error(`Failed to acquire lock KENO OPEN. for shop: ${shopId} gameNumber: ${gameNumber}`)
    //   return res.status(500).json({ message: "Failed to acquire first time OPEN lock." });
    // }
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

      // Update the current game with the drawn number
      const currentGame = await getLastGamePlayed('keno', shopId)

      let openGame;

      if (currentGame && currentGame?.status === "playing") {
        openGame = currentGame;
      } else {
        // Call this function to start a transaction
        await transaction(Game.knex(), async (trx) => {
          const gn = currentGame?.gameNumber || findshop?.kenoStartNumber || 8100;
          await checkRepeatNumber(trx, 'keno', shopId, (gn + 1), KENOLOCK);
          openGame = await Game.query()
            .insert({
              gameType: "keno",
              gameNumber: gn + 1,
              shopId: shopId
            })
            .returning("*");
        })
      }
      // release();
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
      // if (release) {
      //   release();
      // }
      logger.error("Error retrieving last played keno game:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  getCurrentGameResult: async (req, res) => {
    let { gameNumber, shopId } = req.body;

    try {
      if (!gameNumber || !shopId) {
        return res.status(400).json({ message: "Invalid input data." });
      }
      console.log("request from shop id ", shopId);
      // Check shop existence
      const findShop = await Shop.query().findOne({ username: shopId });
      if (!findShop) {
        // releaseLock(release);
        return res.status(404).json({ message: "Shop not found." });
      }
      shopId = findShop.id;

      let currentGame = await Game.query().findOne({ id: gameNumber, gameType: 'keno', shopId });

      if (!currentGame) {
        console.log("game not founc in ", findShop.username);
        return res.status(404).json({ message: "Game not found." });
      }

      // if (!currentGame.pickedNumbers) {
      //   console.log("Result is still being processed shop id ", findShop.username);
      //   return res.status(404).json({ message: "Result is still being processed." });
      // }

      // Check if result is ready
      if (!currentGame.pickedNumbers) {
        // Queue monitoring and retry mechanism
        const maxRetries = 2;
        const retryDelay = 1000; // milliseconds
        let retries = 0;
        let foundResult = false;

        while (retries < maxRetries) {
          // Check if the game is being processed in the queue
          const isProcessing = await checkIfGameInQueue(gameNumber, shopId); // Implement this function
          console.log("shop id try no ", retries, shopId);
          if (!isProcessing) {
            break; // Exit if the game is no longer in the queue
          }

          // Wait before retrying
          await delay(retryDelay);
          retries++;

          // Re-fetch the game to check if the result is now ready
          const updatedGame = await Game.query()
            .findOne({ id: gameNumber, gameType: 'keno', shopId });

          if (updatedGame.pickedNumbers) {
            console.log("shop id after delay n# ", retries, shopId);
            // Result is now ready, return it
            foundResult = true;
            currentGame = updatedGame;
            break;
          }
        }

        // If we exit the loop without a result, respond with a delay message
        if (!foundResult) {
          console.log("no luck try again! ");
          return res.status(404).json({ message: "Result is still being processed. Please try again shortly." });
        }
      }

      const drawnNumber = JSON.parse(currentGame?.pickedNumbers)?.selection;
      const last10Result = await getLast10Games(shopId);

      // Update the current game with the drawn number
      const latestGame = await getLastGamePlayed('keno', shopId)

      let openGame;

      if (latestGame && latestGame?.status === "playing") {
        openGame = latestGame;
      } else {
        // Call this function to start a transaction
        await transaction(Game.knex(), async (trx) => {
          const gn = latestGame?.gameNumber || findShop?.kenoStartNumber || 8100;
          await checkRepeatNumber(trx, 'keno', shopId, (gn + 1), KENOLOCK);
          openGame = await Game.query()
            .insert({
              gameType: "keno",
              gameNumber: gn + 1,
              shopId: shopId
            })
            .returning("*");
        })
      }

      console.log("request compelete shop id ", findShop.username);
      return res.status(200).json({
        openGame: { id: openGame.id, gameNumber: openGame.gameNumber },
        game: { gameNumber: currentGame.gameNumber },
        result: drawnNumber.map((item) => ({ value: item })),
        lastGame: currentGame.gameNumber,
        recent: last10Result
      });
    } catch (error) {
      console.log(error);
      logger.error(`Error getting current game result: ${error}`);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  getCurrentGameResultfff: async (req, res) => {
    let { gameNumber, shopId } = req.body;
    // console.log('game', gameNumber);
    try {
      // Validate input
      if (!gameNumber || !shopId) {
        return res.status(400).json({ message: "Invalid input data." });
      }

      // Acquire lock
      // const resource = `locks:gameResult:${gameNumber}:${shopId}`;
      const resource = `locks:gameResult:${gameNumber}`;
      const ttl = 5000; // Lock time-to-live in milliseconds
      const timeout = 10000; // Maximum time to wait for acquiring the lock

      // Acquire lock
      const release = await acquireLockWithTimeoutRedis(resource, ttl, timeout);
      if (!release) {
        logger.error(`Failed to acquire lock KENO. for shop: ${shopId} gameNumber: ${gameNumber}`)
        return res.status(500).json({ message: "Failed to acquire first time lock." });
      }

      // Start transaction
      await transaction(Game.knex(), async (trx) => {
        try {
          // Check shop existence
          const findShop = await Shop.query().findOne({ username: shopId });
          if (!findShop) {
            // releaseLock(release);
            return res.status(404).json({ message: "Shop not found." });
          }
          shopId = findShop.id;

          // Retrieve current game
          const currentGame = await Game.query()
            .findOne({ id: gameNumber, gameType: 'keno', shopId })
            .forUpdate();
          // .findOne({ status: 'playing', gameType: 'keno', shopId })

          if (!currentGame) {
            logger.error(`current game not found keno for shop: ${findShop?.username}`);
            // releaseLock(release);
            return res.status(404).json({ message: "Game not found." });
          }

          let response;
          if (!currentGame.pickedNumbers) {
            // Generate random numbers securely
            const numbers = await generateRandomNumbersKeno(gameNumber, findShop.rtp, shopId);

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

            const newGameNumber = currentGame.gameNumber + 1;
            await checkRepeatNumber(trx, 'keno', shopId, newGameNumber, KENOLOCK);

            // Update game
            await currentGame.$query(trx).patch({
              pickedNumbers: JSON.stringify({ selection: numbers }),
              status: "done",
              winner: winner
            });

            // Create new game
            const newGame = await Game.query(trx).insert({
              gameType: "keno",
              gameNumber: newGameNumber,
              shopId
            }).returning("*");

            // let finalgameobject = await finalResult(currentGame, numbers)
            const last10Result = await getLast10Games(shopId);
            // last10Result.unshift(finalgameobject);

            // Calculate winning numbers

            response = {
              openGame: { id: newGame.id, gameNumber: newGame.gameNumber },
              game: { gameNumber: currentGame.gameNumber },
              result: numbers.map((item) => ({ value: item })),
              lastGame: currentGame.gameNumber,
              recent: last10Result
            };
            calculateWiningNumbers(gameNumber, numbers, winner, shopId);
          } else {
            let drawnNumber = JSON.parse(currentGame?.pickedNumbers)?.selection;

            const lastGame = await getLastGamePlayed('keno', shopId);
            let openGame;
            if (lastGame && lastGame?.status === "playing") {
              openGame = lastGame;
            } else {
              const gn = lastGame?.gameNumber || findShop?.kenoStartNumber || 8100;
              if (currentGame)
                await checkRepeatNumber(trx, 'keno', shopId, (gn + 1), KENOLOCK);
              openGame = await Game.query()
                .insert({
                  gameType: "keno",
                  gameNumber: gn + 1,
                  shopId: shopId
                }).returning("*");
            }

            // let finalgameobject = await finalResult(currentGame, numbers)
            const last10Result = await getLast10Games(shopId);
            // last10Result.unshift(finalgameobject);

            response = {
              openGame: { id: openGame.id, gameNumber: openGame.gameNumber },
              game: { gameNumber: currentGame.gameNumber },
              result: drawnNumber.map((item) => ({ value: item })),
              lastGame: currentGame.gameNumber,
              recent: last10Result
            };
          }

          // Release lock and respond with data
          // releaseLock(release);
          return res.status(200).json(response);
        } catch (error) {
          await trx.rollback();
          // releaseLock(release);
          logger.error(`Error getting current game result KENO: ${error}`);
          return res.status(500).json({ message: "Internal server error." });
        } finally {
          // Always attempt to release the lock
          releaseLock(release);
        }
      });
    } catch (error) {
      logger.error(`Error getting current game result: ${error}`);
      return res.status(500).json({ message: error?.message || "Internal server error." });
    }
  },

  // Controller
  getLastPlayedGameSpin: async (req, res) => {
    let { shopId } = req.body;
    const { startOfDay, endOfDay } = getStartAndEndOfDay(0);

    // const release = await acquireLockWithTimeout(gameMutex, 4000);
    // if (!release) {
    //   logger.error(`Failed to acquire lock KENO OPEN. for shop: ${shopId} gameNumber: ${gameNumber}`)
    //   return res.status(500).json({ message: "Failed to acquire first time OPEN lock." });
    // }
    try {
      if (!shopId) {
        return res.status(404).json({ message: "No active games currently." });
      }

      const findshop = await Shop.query().where("username", shopId).first();
      if (!findshop) {
        return res.status(404).json({ message: "No active games currently." });
      }
      shopId = findshop.id;
      // Update the current game with the drawn number
      const currentGame = await getLastGamePlayed('spin', shopId);

      let openGame;
      if (currentGame && currentGame?.status === "playing") {
        openGame = currentGame;
      } else {
        await transaction(Game.knex(), async (trx) => {
          const gm = currentGame?.gameNumber || findshop?.spinStartNumber || 25000;
          await checkRepeatNumber(trx, 'spin', shopId, (gm + 1), SPINLOCK);
          openGame = await Game.query()
            .insert({
              gameType: "spin",
              gameNumber: gm + 1,
              shopId: shopId
            })
            .returning("*");
        })
      }
      // release();
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
      // if (release) {
      //   release();
      // }
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

      const release = await acquireLockWithTimeout(gameMutex, 8000);
      if (!release) {
        logger.error(`Failed to acquire lock SPIN. for shop: ${shopId} gameNumber: ${gameNumber}`)
        return res.status(500).json({ message: "Failed to acquire lock." });
      }
      try {
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
            .findOne({ id: gameNumber, gameType: 'spin', shopId })
            .forUpdate();
          // .orderBy("id", "desc")
          // console.log(currentGame);

          if (!currentGame) {
            logger.error(`current game not found spin for shop: ${findshop?.username}`);
            release();
            return res.status(404).json({ message: "No active games currently." });
          }

          let response;
          if (!currentGame.pickedNumbers) {
            // Assume you have a function to draw the number and update the database
            let drawnNumber = await generateSpinRandomNumbers(gameNumber, findshop.spinRtp, shopId)
            // console.log('ddraw', drawnNumber);

            const winners = determineAllWinners(drawnNumber);

            const newGameNumber = currentGame.gameNumber + 1;
            await checkRepeatNumber(trx, 'spin', shopId, newGameNumber, SPINLOCK);

            // Update the pickedNumbers field with the drawn number
            await currentGame.$query().patch({
              pickedNumbers: JSON.stringify({ selection: drawnNumber }),
              status: "done",
              winner: JSON.stringify(winners),
            });
            // Create new game
            const newGame = await Game.query(trx).insert({
              gameType: "spin",
              gameNumber: newGameNumber,
              shopId
            }).returning("*");

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
            calculateSlipWiningNumbers(gameNumber, drawnNumber, winners);
          } else {
            const drawnNumber = JSON.parse(currentGame?.pickedNumbers)?.selection;
            const lastGame = await getLastGamePlayed('spin', shopId);

            let openGame;
            if (lastGame && lastGame?.status === "playing") {
              openGame = lastGame;
            } else {
              const gm = lastGame?.gameNumber || findshop?.spinStartNumber || 25000;
              await checkRepeatNumber(trx, 'spin', shopId, (gm + 1), SPINLOCK);
              openGame = await Game.query()
                .insert({
                  gameType: "spin",
                  gameNumber: gm + 1,
                  shopId: shopId
                })
                .returning("*");
              // release();
              // logger.error(`SPIN Old Game with picked number on game id: ${gameNumber}, shop id: ${shopId}`)
              // return res.status(404).json({ message: "Game not found." });
            }
            response = {
              openGame: openGame
                ? { id: openGame.id, gameNumber: openGame.gameNumber }
                : null,
              result: {
                gameResult: drawnNumber,
                gameNumber: currentGame.gameNumber,
                id: currentGame.id,
              },
              recent: await getLast100Games(shopId),
            };
          }
          release()
          return res.status(200).json(response);
        })
      } catch (error) {
        if (release) {
          release();
        }
        console.log(error);
        logger.error(`Error getting current game result SPIN: ${error}`);
        return res.status(500).json({ message: "Internal server error." });
      } finally {
        // Always attempt to release the lock
        if (release) {
          await release();
        }
      }
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

        calculateWiningNumbers(currentGame.id, numbers, winner, shop.id);
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

// Utility function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getStartAndEndOfDay(timezoneOffset = 0) {
  const reportDate = new Date().toISOString().substr(0, 10);
  const startOfDay = new Date(`${reportDate}T00:00:00.000Z`);
  startOfDay.setMinutes(startOfDay.getMinutes() - timezoneOffset);
  const endOfDay = new Date(`${reportDate}T23:59:59.999Z`);
  endOfDay.setMinutes(endOfDay.getMinutes() - timezoneOffset);

  return {
    startOfDay: startOfDay,
    endOfDay: endOfDay
  };
}

const checkRepeatNumber = async (trx, gameType, shopId, newGameNumber, dblock) => {
  await trx.raw(`CREATE TABLE IF NOT EXISTS ${dblock} (game_number VARCHAR(255) PRIMARY KEY); `);
  const lockAcquired = await trx.raw(`
    INSERT INTO ${dblock} (game_number) VALUES ('${getTodayDate() + '_' + gameType + '_' + shopId.toString() + '_' + (newGameNumber).toString()}');
  `).catch(error => {
    console.log(error);
    return []; // Return an empty array to indicate failure
  });

  if (lockAcquired.length === 0) {
    logger.error(`${dblock} Failed to acquire lock for game: ${newGameNumber} in SHop: ${shopId}`);
    throw new Error("Conflict detected. Please try again."); // Throw an error to stop execution
  } else {
    return true;
  }
}

const getLastGamePlayed = async (gameType, shopId) => {
  const { startOfDay, endOfDay } = getStartAndEndOfDay(0);
  return await Game.query()
    .andWhere("gameType", gameType)
    .andWhere("created_at", ">=", startOfDay)
    .andWhere("created_at", "<=", endOfDay)
    .andWhere("shopId", shopId)
    .orderBy("id", "desc")
    .limit(1)
    .first();
}

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

module.exports = { GameController };

// ticket, stake, payout, unclamed, revoked, ggr, net balance
