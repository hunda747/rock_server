// controllers/gameController.js

const Game = require("../models/game");
const Ticket = require("../models/slip");
const knex = require("knex");
const oddsTable = require("../odd/kiron");

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
      console.log("json", lastPlayedGame.pickedNumbers);
      console.log("json", lastPlayedGame.pickedNumbers.selection);
      // Construct the response in the specified format
      const response = {
        openGame: openGame
          ? { id: openGame.id, gameNumber: openGame.gameNumber }
          : null,
        result: JSON.parse(lastPlayedGame.pickedNumbers)?.selection.map((item) => ({ value: item })),
        lastGame: lastPlayedGame ? { id: lastPlayedGame.id, gameNumber: lastPlayedGame.gameNumber } : null,
        recent: await getLast10Games(),
        // recent: lastPlayedGame.gameNumber,
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
      const currentGame = await Game.query().where("id", gameNumber).first();

      if (!currentGame) {
        return res.status(404).json({ message: "No active games currently." });
      }
      console.log("result:", currentGame);
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
        .orderBy("time", "desc")
        .offset(1)
        .first();

      let openGame;
      // Update the current game with the drawn number
      const newGame = await Game.query()
        .where("status", "playing")
        .orderBy("time", "desc")
        .first();

      if (newGame) {
        openGame = newGame;
      } else {
        openGame = await Game.query()
          .insert({
            gameType: "keno",
            gameNumber: currentGame.gameNumber + 1,
            // Add other fields as needed based on your table structure
            // Example: pickedNumbers, winner, time, status, etc.
          })
          .returning("*");
      }

      // Construct the response in the specified format
      const response = {
        openGame: { id: openGame.id, gameNumber: openGame.gameNumber },
        game: { gameNumber: currentGame.gameNumber },
        result: drawnNumber.map((item) => ({ value: item })),
        lastGame: previousGame ? previousGame.gameNumber : null,
        recent: await getLast10Games(),
      };
      // Respond with the updated game data
      return res.status(200).json(response);
    } catch (error) {
      console.error("Error getting current game result:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  getGameRusult: async (req, res) => {
    const { gameNumber } = req.params;
    try {
      // Update the current game with the drawn number
      const currentGame = await Game.query()
        .where("gameNumber", gameNumber)
        .andWhere("status", "done")
        .first();

      if (!currentGame) {
        return res.status(404).json({ message: "Game not found." });
      }

      const drawnNumber = JSON.parse(currentGame?.pickedNumbers)?.selection;
      if (!drawnNumber || !Array.isArray(drawnNumber)) {
        return res.status(500).json({ message: "Invalid drawn numbers." });
      }

      console.log("draw", drawnNumber);

      const resultObject = {
        err: "false",
        ...drawnNumber.reduce((acc, number, index) => {
          acc[index + 1] = number;
          return acc;
        }, {}),
        21: currentGame.gameNumber,
        22: currentGame.gameNumber, // Assuming gameId is what you want for "21" and "22"
        0: currentGame.gameType,
      };
      res.status(200).send(resultObject);
    } catch (error) {
      console.error("Error getting current game result:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  getSpinOpen: async (req, res) => {

    // https://api.board.bluebez.com/spin/game/open
    return res.status(200).json({
      "openGame": {
        // "id": "13126350-902f-4e22-aa81-74eda4a96be2",
        "gameNumber": 20170,
        // "createdAt": "2024-01-10T11:22:00.194Z",
        "status": "OPEN",
        "gameResult": null
      },
      "recent": [
        {
          // // "id": "99219616-80a4-4de1-87ba-3dfb76cc2430",
          "gameNumber": 20169,
          // "createdAt": "2024-01-10T11:18:00.166Z",
          "status": "CLOSED",
          "gameResult": 7
        },
        {
          // // "id": "f41df26c-6e61-484f-a924-4585212b9472",
          "gameNumber": 20168,
          // "createdAt": "2024-01-10T11:14:00.270Z",
          "status": "CLOSED",
          "gameResult": 11
        },
        {
          // // "id": "d0a141a6-3b91-4679-8913-05a2f5e0cc02",
          "gameNumber": 20167,
          // "createdAt": "2024-01-10T11:10:00.199Z",
          "status": "CLOSED",
          "gameResult": 9
        },
        {
          // // "id": "9ea69ecb-9b26-43af-9e9b-d9844140c968",
          "gameNumber": 20166,
          // "createdAt": "2024-01-10T11:06:00.176Z",
          "status": "CLOSED",
          "gameResult": 24
        },
        {
          // // "id": "ed78b591-6390-400b-b770-3f84010f923e",
          "gameNumber": 20165,
          // "createdAt": "2024-01-10T11:02:00.225Z",
          "status": "CLOSED",
          "gameResult": 29
        },
        {
          // // "id": "0856dbdb-a379-4831-b7d7-95953214596b",
          "gameNumber": 20164,
          // "createdAt": "2024-01-10T10:58:00.329Z",
          "status": "CLOSED",
          "gameResult": 15
        },
        {
          // // "id": "f69a863c-f5e3-4e34-89bd-6374ed093676",
          "gameNumber": 20163,
          // "createdAt": "2024-01-10T10:54:00.227Z",
          "status": "CLOSED",
          "gameResult": 4
        },
        {
          // // "id": "102ea28c-5550-4980-b254-094997d32fbb",
          "gameNumber": 20162,
          // "createdAt": "2024-01-10T10:50:00.194Z",
          "status": "CLOSED",
          "gameResult": 22
        },
        {
          // // "id": "fd7767a7-956d-4945-be54-7f6666d2f3af",
          "gameNumber": 20161,
          // "createdAt": "2024-01-10T10:46:00.186Z",
          "status": "CLOSED",
          "gameResult": 9
        },
        {
          // // "id": "984b330e-727a-41ee-b0a8-7caab1da6e35",
          "gameNumber": 20160,
          // "createdAt": "2024-01-10T10:42:00.174Z",
          "status": "CLOSED",
          "gameResult": 19
        },
        {
          // // "id": "e7eff91c-356c-402e-a9b3-85de1f6bba95",
          "gameNumber": 20159,
          // "createdAt": "2024-01-10T10:38:00.217Z",
          "status": "CLOSED",
          "gameResult": 0
        },
        {
          // // "id": "d45935aa-698b-4276-aff5-df651bd70932",
          "gameNumber": 20158,
          // "createdAt": "2024-01-10T10:34:00.155Z",
          "status": "CLOSED",
          "gameResult": 28
        },
        {
          // // "id": "379e4a3c-e166-46d0-9776-446b18b6f5e2",
          "gameNumber": 20157,
          // "createdAt": "2024-01-10T10:30:00.226Z",
          "status": "CLOSED",
          "gameResult": 32
        },
        {
          // // "id": "89a20744-a552-4021-b8db-1c3f415d8239",
          "gameNumber": 20156,
          // "createdAt": "2024-01-10T10:26:00.191Z",
          "status": "CLOSED",
          "gameResult": 24
        },
        {
          // // "id": "c91a86b4-37ab-44ad-8796-abf70b445852",
          "gameNumber": 20155,
          // "createdAt": "2024-01-10T10:22:00.222Z",
          "status": "CLOSED",
          "gameResult": 5
        },
        {
          // // "id": "f39dd466-8e68-4f73-809d-88938bc767ec",
          "gameNumber": 20154,
          // "createdAt": "2024-01-10T10:18:00.162Z",
          "status": "CLOSED",
          "gameResult": 31
        },
        {
          // // "id": "268c03d7-8f50-4220-a6d2-e873524aab21",
          "gameNumber": 20153,
          // "createdAt": "2024-01-10T10:14:00.187Z",
          "status": "CLOSED",
          "gameResult": 19
        },
        {
          // // "id": "27df7e37-04f7-41cb-9165-6b011a2c33af",
          "gameNumber": 20152,
          // "createdAt": "2024-01-10T10:10:00.184Z",
          "status": "CLOSED",
          "gameResult": 6
        },
        {
          // // "id": "c5222b27-61e9-4cf8-a4bb-8e8cde0f864e",
          "gameNumber": 20151,
          // "createdAt": "2024-01-10T10:06:00.176Z",
          "status": "CLOSED",
          "gameResult": 17
        },
        {
          // // "id": "b45d6f58-7da3-4c35-8f8b-29667dc816e7",
          "gameNumber": 20150,
          // "createdAt": "2024-01-10T10:02:00.174Z",
          "status": "CLOSED",
          "gameResult": 20
        },
        {
          // // "id": "ed37982d-8433-49be-8306-1925b176408f",
          "gameNumber": 20149,
          // "createdAt": "2024-01-10T09:58:00.164Z",
          "status": "CLOSED",
          "gameResult": 32
        },
        {
          // // "id": "58a75fe5-fe39-4814-bb6d-ab30d9c469e2",
          "gameNumber": 20148,
          // "createdAt": "2024-01-10T09:54:00.159Z",
          "status": "CLOSED",
          "gameResult": 26
        },
        {
          // // "id": "5826a13b-58a2-4fd1-af28-90a9583d67f5",
          "gameNumber": 20147,
          // "createdAt": "2024-01-10T09:50:00.202Z",
          "status": "CLOSED",
          "gameResult": 16
        },
        {
          // // "id": "56792544-8481-4d02-b04c-7a06af001bea",
          "gameNumber": 20146,
          // "createdAt": "2024-01-10T09:46:00.187Z",
          "status": "CLOSED",
          "gameResult": 7
        },
        {
          // // "id": "c70d630e-7bab-4ece-86d9-2b3e8fdcb47a",
          "gameNumber": 20145,
          // "createdAt": "2024-01-10T09:42:00.170Z",
          "status": "CLOSED",
          "gameResult": 1
        },
        {
          // // "id": "dcec14ee-7b7b-4724-a26c-f4b3e68fadf3",
          "gameNumber": 20144,
          // "createdAt": "2024-01-10T09:38:00.185Z",
          "status": "CLOSED",
          "gameResult": 35
        },
        {
          // // "id": "cf3721e0-dd96-45a8-84bc-a2aabe3d7ae4",
          "gameNumber": 20143,
          // "createdAt": "2024-01-10T09:34:00.175Z",
          "status": "CLOSED",
          "gameResult": 10
        },
        {
          // // "id": "4dcd2197-61bd-41ed-9435-6da4aa460986",
          "gameNumber": 20142,
          // "createdAt": "2024-01-10T09:30:00.175Z",
          "status": "CLOSED",
          "gameResult": 8
        },
        {
          // // "id": "67e83a69-b6d2-40ab-985c-f10ef7abb5e7",
          "gameNumber": 20141,
          // "createdAt": "2024-01-10T09:26:00.185Z",
          "status": "CLOSED",
          "gameResult": 18
        },
        {
          // // "id": "f5e8de77-866e-4f81-b11d-cbe66607f7d0",
          "gameNumber": 20140,
          // "createdAt": "2024-01-10T09:22:00.184Z",
          "status": "CLOSED",
          "gameResult": 21
        },
        {
          // // "id": "2d1eda51-a160-41eb-a0b4-78c68f97abda",
          "gameNumber": 20139,
          // "createdAt": "2024-01-10T09:18:00.180Z",
          "status": "CLOSED",
          "gameResult": 32
        },
        {
          // // "id": "a69bd902-e69b-4a84-b202-ab06a81e1680",
          "gameNumber": 20138,
          // "createdAt": "2024-01-10T09:14:00.184Z",
          "status": "CLOSED",
          "gameResult": 3
        },
        {
          // // "id": "1b73dbc9-068e-4d5a-ae10-0f608ab1b5d8",
          "gameNumber": 20137,
          // "createdAt": "2024-01-10T09:10:00.212Z",
          "status": "CLOSED",
          "gameResult": 14
        },
        {
          // // "id": "d008e05e-7b0c-4f13-8e84-9e76e394d1c5",
          "gameNumber": 20136,
          // "createdAt": "2024-01-10T09:06:00.189Z",
          "status": "CLOSED",
          "gameResult": 2
        },
        {
          // // "id": "8bfe47d9-3c43-4e37-b8da-75feb772f2a8",
          "gameNumber": 20135,
          // "createdAt": "2024-01-10T09:02:00.182Z",
          "status": "CLOSED",
          "gameResult": 9
        },
        {
          // // "id": "440b4050-379f-4fe5-84fb-84866c58a036",
          "gameNumber": 20134,
          // "createdAt": "2024-01-10T08:58:00.225Z",
          "status": "CLOSED",
          "gameResult": 27
        },
        {
          // // "id": "11d3d26c-b636-4a44-b51b-729441e1d0c6",
          "gameNumber": 20133,
          // "createdAt": "2024-01-10T08:54:00.172Z",
          "status": "CLOSED",
          "gameResult": 30
        },
        {
          // // "id": "de8cb39e-2b30-46e2-b95e-012015571c69",
          "gameNumber": 20132,
          // "createdAt": "2024-01-10T08:50:00.160Z",
          "status": "CLOSED",
          "gameResult": 12
        },
        {
          // // "id": "403f9703-dc5a-44f6-9c12-7a7f6d91846f",
          "gameNumber": 20131,
          // "createdAt": "2024-01-10T08:46:00.224Z",
          "status": "CLOSED",
          "gameResult": 29
        },
        {
          // // "id": "ab0cfdbc-ab14-4097-bf8d-b437996aac6e",
          "gameNumber": 20130,
          // "createdAt": "2024-01-10T08:42:00.175Z",
          "status": "CLOSED",
          "gameResult": 16
        },
        {
          // // "id": "f1cd01ee-b7e4-4d39-a705-290e0f92c8a4",
          "gameNumber": 20129,
          // "createdAt": "2024-01-10T08:38:00.165Z",
          "status": "CLOSED",
          "gameResult": 0
        },
        {
          // // "id": "c45b5b67-08c2-4c59-9455-e435d663e3d0",
          "gameNumber": 20128,
          // "createdAt": "2024-01-10T08:34:00.215Z",
          "status": "CLOSED",
          "gameResult": 15
        },
        {
          // // "id": "9a9e4ca4-2624-482a-b24c-cd36fcd30458",
          "gameNumber": 20127,
          // "createdAt": "2024-01-10T08:30:00.164Z",
          "status": "CLOSED",
          "gameResult": 27
        },
        {
          // // "id": "eaeeb590-e256-4fa2-a870-d850c9e716ee",
          "gameNumber": 20126,
          // "createdAt": "2024-01-10T08:26:00.177Z",
          "status": "CLOSED",
          "gameResult": 12
        },
        {
          // // "id": "df0e43f4-979e-424d-8e97-776d07e95350",
          "gameNumber": 20125,
          // "createdAt": "2024-01-10T08:22:00.204Z",
          "status": "CLOSED",
          "gameResult": 14
        },
        {
          // // "id": "8d41df2a-5dc1-4bc9-83f0-b616da12a867",
          "gameNumber": 20124,
          // "createdAt": "2024-01-10T08:18:00.172Z",
          "status": "CLOSED",
          "gameResult": 25
        },
        {
          // // "id": "a2914cb5-771c-4589-ab6e-975f85f0a369",
          "gameNumber": 20123,
          // "createdAt": "2024-01-10T08:14:00.166Z",
          "status": "CLOSED",
          "gameResult": 34
        },
        {
          // // "id": "1d2e6d49-fdc3-404e-92d5-13c90b707fd4",
          "gameNumber": 20122,
          // "createdAt": "2024-01-10T08:10:00.184Z",
          "status": "CLOSED",
          "gameResult": 0
        },
        {
          // // "id": "2af48c46-2083-4c83-93c5-3d38e64c15eb",
          "gameNumber": 20121,
          // "createdAt": "2024-01-10T08:06:00.157Z",
          "status": "CLOSED",
          "gameResult": 20
        },
        {
          // // "id": "03a4b869-c9c1-4bcb-8cd1-a9edf910d6be",
          "gameNumber": 20120,
          // "createdAt": "2024-01-10T08:02:00.191Z",
          "status": "CLOSED",
          "gameResult": 31
        },
        {
          // // "id": "c4c3cd86-eeda-40be-aa7e-7c8214b96cf7",
          "gameNumber": 20119,
          // "createdAt": "2024-01-10T07:58:00.166Z",
          "status": "CLOSED",
          "gameResult": 12
        },
        {
          // // "id": "bd5019fc-feff-4d1e-80ff-d4e3cd6ff0f4",
          "gameNumber": 20118,
          // "createdAt": "2024-01-10T07:54:00.175Z",
          "status": "CLOSED",
          "gameResult": 22
        },
        {
          // // "id": "c233ae31-1e43-4284-9793-306ebda620d9",
          "gameNumber": 20117,
          // "createdAt": "2024-01-10T07:50:00.220Z",
          "status": "CLOSED",
          "gameResult": 22
        },
        {
          // // "id": "8acb7619-f888-4ec6-b34b-a1f797d62f24",
          "gameNumber": 20116,
          // "createdAt": "2024-01-10T07:46:00.193Z",
          "status": "CLOSED",
          "gameResult": 1
        },
        {
          // // "id": "08df087c-6409-487d-8399-71e24be74f58",
          "gameNumber": 20115,
          // "createdAt": "2024-01-10T07:42:00.270Z",
          "status": "CLOSED",
          "gameResult": 24
        },
        {
          // // "id": "3b27a0d1-9bcd-4b50-8109-949fcf0ce863",
          "gameNumber": 20114,
          // "createdAt": "2024-01-10T07:38:00.164Z",
          "status": "CLOSED",
          "gameResult": 12
        },
        {
          // // "id": "8cbe97c0-53d2-4b86-b0df-df863cb7a3dd",
          "gameNumber": 20113,
          // "createdAt": "2024-01-10T07:34:00.246Z",
          "status": "CLOSED",
          "gameResult": 20
        },
        {
          // // "id": "3f5976ab-c1a4-4623-a4ef-76b14968fe28",
          "gameNumber": 20112,
          // "createdAt": "2024-01-10T07:30:00.187Z",
          "status": "CLOSED",
          "gameResult": 35
        },
        {
          // // "id": "b28c0652-3172-45ab-ace8-d09c531fc374",
          "gameNumber": 20111,
          // "createdAt": "2024-01-10T07:26:00.154Z",
          "status": "CLOSED",
          "gameResult": 26
        },
        {
          // // "id": "7f5025e6-715f-42eb-8582-aa9e25650f32",
          "gameNumber": 20110,
          // "createdAt": "2024-01-10T07:22:00.182Z",
          "status": "CLOSED",
          "gameResult": 2
        },
        {
          // // "id": "5eaaec77-81f6-44e2-8e15-39666fb5d291",
          "gameNumber": 20109,
          // "createdAt": "2024-01-10T07:18:00.201Z",
          "status": "CLOSED",
          "gameResult": 14
        },
        {
          // // "id": "1f86016a-7eef-4934-9bde-f28af1b64419",
          "gameNumber": 20108,
          // "createdAt": "2024-01-10T07:14:00.160Z",
          "status": "CLOSED",
          "gameResult": 18
        },
        {
          // // "id": "10c440da-e594-42d8-a2e1-f090c8a0294c",
          "gameNumber": 20107,
          // "createdAt": "2024-01-10T07:10:00.205Z",
          "status": "CLOSED",
          "gameResult": 7
        },
        {
          // // "id": "993392ef-f062-4680-8e81-a3ce4524ee95",
          "gameNumber": 20106,
          // "createdAt": "2024-01-10T07:06:00.140Z",
          "status": "CLOSED",
          "gameResult": 18
        },
        {
          // // "id": "29cad360-5119-4c08-a9ce-db9f71560cd9",
          "gameNumber": 20105,
          // "createdAt": "2024-01-10T07:02:00.153Z",
          "status": "CLOSED",
          "gameResult": 16
        },
        {
          // // "id": "374a8ffc-3519-429b-bf14-08d4f6217842",
          "gameNumber": 20104,
          // "createdAt": "2024-01-10T06:58:00.150Z",
          "status": "CLOSED",
          "gameResult": 17
        },
        {
          // // "id": "e0d40b1b-be76-458e-baba-43057b6501e2",
          "gameNumber": 20103,
          // "createdAt": "2024-01-10T06:54:00.159Z",
          "status": "CLOSED",
          "gameResult": 3
        },
        {
          // // "id": "1fc4574b-8dee-41ff-a106-1c07f10e4aa1",
          "gameNumber": 20102,
          // "createdAt": "2024-01-10T06:50:00.181Z",
          "status": "CLOSED",
          "gameResult": 18
        },
        {
          // // "id": "f870b729-05e0-4711-ad6f-b9ccc3827ec9",
          "gameNumber": 20101,
          // "createdAt": "2024-01-10T06:46:00.186Z",
          "status": "CLOSED",
          "gameResult": 2
        },
        {
          // // "id": "3606eebb-4635-4d76-b73e-e71cc28747f8",
          "gameNumber": 20100,
          // "createdAt": "2024-01-10T06:42:00.198Z",
          "status": "CLOSED",
          "gameResult": 14
        },
        {
          // // "id": "a85f762a-8bef-465c-a9a5-9f213529b047",
          "gameNumber": 20099,
          // "createdAt": "2024-01-10T06:38:00.153Z",
          "status": "CLOSED",
          "gameResult": 8
        },
        {
          // // "id": "08d45d87-59df-4b08-b0df-e075dedbf909",
          "gameNumber": 20098,
          // "createdAt": "2024-01-10T06:34:00.137Z",
          "status": "CLOSED",
          "gameResult": 15
        },
        {
          // // "id": "01937189-bb5a-45ef-8045-44d00b687bda",
          "gameNumber": 20097,
          // "createdAt": "2024-01-10T06:30:00.170Z",
          "status": "CLOSED",
          "gameResult": 33
        },
        {
          // // "id": "8388685c-c2d6-420d-b375-e4e49db726f5",
          "gameNumber": 20096,
          // "createdAt": "2024-01-10T06:26:00.168Z",
          "status": "CLOSED",
          "gameResult": 34
        },
        {
          // // "id": "a1686af4-6ce3-4409-848d-5d717ad6fe29",
          "gameNumber": 20095,
          // "createdAt": "2024-01-10T06:22:00.143Z",
          "status": "CLOSED",
          "gameResult": 10
        },
        {
          // // "id": "bb3221f0-2ef3-4f44-9b78-74c2d2e59532",
          "gameNumber": 20094,
          // "createdAt": "2024-01-10T06:18:00.164Z",
          "status": "CLOSED",
          "gameResult": 27
        },
        {
          // // "id": "62af6f25-7ede-44a4-ad45-a377c7a46b1c",
          "gameNumber": 20093,
          // "createdAt": "2024-01-10T06:14:00.165Z",
          "status": "CLOSED",
          "gameResult": 36
        },
        {
          // // "id": "6a3e8c0a-e0c7-42a7-9992-e11b0a026b25",
          "gameNumber": 20092,
          // "createdAt": "2024-01-10T06:10:00.155Z",
          "status": "CLOSED",
          "gameResult": 23
        },
        {
          // // "id": "df7f3ce4-cba8-42bc-ad7e-b6539033300e",
          "gameNumber": 20091,
          // "createdAt": "2024-01-10T06:06:00.155Z",
          "status": "CLOSED",
          "gameResult": 3
        },
        {
          // // "id": "c3f190de-cbcd-43fd-8e6d-0f9ec21b33b1",
          "gameNumber": 20090,
          // "createdAt": "2024-01-10T06:02:00.140Z",
          "status": "CLOSED",
          "gameResult": 25
        },
        {
          // // "id": "40b973a3-65be-4890-a53b-e6e7776a4607",
          "gameNumber": 20089,
          // "createdAt": "2024-01-10T05:58:00.147Z",
          "status": "CLOSED",
          "gameResult": 33
        },
        {
          // // "id": "74267157-f719-4e70-a0aa-16ba2cefff31",
          "gameNumber": 20088,
          // "createdAt": "2024-01-10T05:54:00.137Z",
          "status": "CLOSED",
          "gameResult": 35
        },
        {
          // // "id": "5af98153-fe40-4b2b-8d98-5035567bce20",
          "gameNumber": 20087,
          // "createdAt": "2024-01-10T05:50:00.159Z",
          "status": "CLOSED",
          "gameResult": 26
        },
        {
          // // "id": "2ec7601b-d5cd-4248-bdd5-fd870118ab37",
          "gameNumber": 20086,
          // "createdAt": "2024-01-10T05:46:00.153Z",
          "status": "CLOSED",
          "gameResult": 1
        },
        {
          // // "id": "70a82dde-846d-45c0-ac82-fa129aa8360c",
          "gameNumber": 20085,
          // "createdAt": "2024-01-10T05:42:00.129Z",
          "status": "CLOSED",
          "gameResult": 36
        },
        {
          // // "id": "c0025954-1d0d-4814-ad84-f2ac36c75c58",
          "gameNumber": 20084,
          // "createdAt": "2024-01-10T05:38:00.150Z",
          "status": "CLOSED",
          "gameResult": 22
        },
        {
          // // "id": "e53bdfff-0c58-418e-9581-c613d307cf24",
          "gameNumber": 20083,
          // "createdAt": "2024-01-10T05:34:00.150Z",
          "status": "CLOSED",
          "gameResult": 3
        },
        {
          // // "id": "a7dc840d-0ea5-4c32-abd2-4972ff03da48",
          "gameNumber": 20082,
          // "createdAt": "2024-01-10T05:30:00.149Z",
          "status": "CLOSED",
          "gameResult": 33
        },
        {
          // // "id": "a63b7312-a96c-4e85-8e18-a1dbc8ec5d85",
          "gameNumber": 20081,
          // "createdAt": "2024-01-10T05:26:00.149Z",
          "status": "CLOSED",
          "gameResult": 10
        },
        {
          // // "id": "b39361d6-e440-4f20-88c0-16bfc64e089b",
          "gameNumber": 20080,
          // "createdAt": "2024-01-10T05:22:00.161Z",
          "status": "CLOSED",
          "gameResult": 11
        },
        {
          // // "id": "50df5196-8f7c-4feb-bc55-c182077e965e",
          "gameNumber": 20079,
          // "createdAt": "2024-01-10T05:18:00.154Z",
          "status": "CLOSED",
          "gameResult": 4
        },
        {
          // // "id": "84beb169-3373-43f4-a7f2-3cb4b26feff2",
          "gameNumber": 20078,
          // "createdAt": "2024-01-10T05:14:00.178Z",
          "status": "CLOSED",
          "gameResult": 29
        },
        {
          // // "id": "d00dc7ec-4fb1-48e4-85ca-2ddd2d48b14e",
          "gameNumber": 20077,
          // "createdAt": "2024-01-10T05:10:00.161Z",
          "status": "CLOSED",
          "gameResult": 32
        },
        {
          // // "id": "d76ed22b-fba4-4823-893e-44396114b4b4",
          "gameNumber": 20076,
          // "createdAt": "2024-01-10T05:06:00.180Z",
          "status": "CLOSED",
          "gameResult": 15
        },
        {
          // // "id": "9418fcbb-9306-4d35-a6a3-8791bef28dbb",
          "gameNumber": 20075,
          // "createdAt": "2024-01-10T05:02:00.267Z",
          "status": "CLOSED",
          "gameResult": 2
        },
        {
          // // "id": "09577f8e-f3da-4cea-907b-d4c71762780d",
          "gameNumber": 20074,
          // "createdAt": "2024-01-10T04:58:00.239Z",
          "status": "CLOSED",
          "gameResult": 36
        },
        {
          // // "id": "0b1b81b7-072d-4053-ba59-cd448bc6b34d",
          "gameNumber": 20073,
          // "createdAt": "2024-01-10T04:54:00.308Z",
          "status": "CLOSED",
          "gameResult": 15
        },
        {
          // // "id": "d84bc4af-c1f2-4707-b27c-68c3b9b7b90d",
          "gameNumber": 20072,
          // "createdAt": "2024-01-10T04:50:00.250Z",
          "status": "CLOSED",
          "gameResult": 10
        },
        {
          // // "id": "2b1b37b0-cf6d-4028-a5c0-dcf002c8bc8d",
          "gameNumber": 20071,
          // "createdAt": "2024-01-10T04:46:00.247Z",
          "status": "CLOSED",
          "gameResult": 3
        },
        {
          // // "id": "a95f03f6-7d48-40e1-af51-603359fdee6a",
          "gameNumber": 20070,
          // "createdAt": "2024-01-10T04:42:00.256Z",
          "status": "CLOSED",
          "gameResult": 35
        },
        {
          // "id": "9cd0faf8-fd62-4b6b-8219-2f34f87100a5",
          "gameNumber": 20069,
          // "createdAt": "2024-01-10T04:38:00.226Z",
          "status": "CLOSED",
          "gameResult": 21
        },
        {
          // "id": "c504fcf9-0291-41f9-93da-64d87f7fae6d",
          "gameNumber": 20068,
          // "createdAt": "2024-01-10T04:34:00.288Z",
          "status": "CLOSED",
          "gameResult": 22
        },
        {
          // "id": "25335619-627a-4489-9b67-de2cec78598b",
          "gameNumber": 20067,
          // "createdAt": "2024-01-10T04:30:00.276Z",
          "status": "CLOSED",
          "gameResult": 36
        },
        {
          // "id": "6276b116-e2f3-476e-8302-7f5136fb750f",
          "gameNumber": 20066,
          // "createdAt": "2024-01-10T04:26:00.253Z",
          "status": "CLOSED",
          "gameResult": 3
        },
        {
          // "id": "c96085b2-96c6-4db9-9833-b6e13c5208aa",
          "gameNumber": 20065,
          // "createdAt": "2024-01-10T04:22:00.251Z",
          "status": "CLOSED",
          "gameResult": 16
        },
        {
          // "id": "75005d41-493b-4003-874b-6f7cfe5ea4f5",
          "gameNumber": 20064,
          // "createdAt": "2024-01-10T04:18:00.275Z",
          "status": "CLOSED",
          "gameResult": 8
        },
        {
          // "id": "30eb9c91-079d-4d18-90c4-106055eb2732",
          "gameNumber": 20063,
          // "createdAt": "2024-01-10T04:14:00.244Z",
          "status": "CLOSED",
          "gameResult": 15
        },
        {
          // "id": "4a6200e2-c85c-4e5d-906b-4d40e8c411c8",
          "gameNumber": 20062,
          // "createdAt": "2024-01-10T04:10:00.248Z",
          "status": "CLOSED",
          "gameResult": 6
        },
        {
          // "id": "94fabb98-9964-4042-85e2-ce27c0dda1fe",
          "gameNumber": 20061,
          // "createdAt": "2024-01-10T04:06:00.250Z",
          "status": "CLOSED",
          "gameResult": 25
        },
        {
          // "id": "7fdf7b50-a9ba-4aed-b7fc-99df0fca99ea",
          "gameNumber": 20060,
          // "createdAt": "2024-01-10T04:02:00.251Z",
          "status": "CLOSED",
          "gameResult": 34
        },
        {
          // "id": "cf6e5491-7386-4c3d-be62-049aef7a14f0",
          "gameNumber": 20059,
          // "createdAt": "2024-01-10T03:58:00.237Z",
          "status": "CLOSED",
          "gameResult": 20
        },
        {
          // "id": "7b8cf45e-b2b9-443e-942a-6a16e978425c",
          "gameNumber": 20058,
          // "createdAt": "2024-01-10T03:54:00.231Z",
          "status": "CLOSED",
          "gameResult": 27
        },
        {
          // "id": "a6fa7d6b-c291-462a-9a0e-d46180f2324d",
          "gameNumber": 20057,
          // "createdAt": "2024-01-10T03:50:00.266Z",
          "status": "CLOSED",
          "gameResult": 20
        },
        {
          // "id": "7c747eac-f569-453b-8bcf-d452049ced64",
          "gameNumber": 20056,
          // "createdAt": "2024-01-10T03:46:00.172Z",
          "status": "CLOSED",
          "gameResult": 5
        },
        {
          // "id": "7b6af825-4e86-44fd-b1a7-ba2110e405a0",
          "gameNumber": 20055,
          // "createdAt": "2024-01-10T03:42:00.163Z",
          "status": "CLOSED",
          "gameResult": 32
        },
        {
          // "id": "e40bbe38-a01b-4a1c-bc41-2b3c3a14bfb2",
          "gameNumber": 20054,
          // "createdAt": "2024-01-10T03:38:00.149Z",
          "status": "CLOSED",
          "gameResult": 26
        },
        {
          // "id": "aae680d9-3e65-4fed-a32d-e0bb48330102",
          "gameNumber": 20053,
          // "createdAt": "2024-01-10T03:34:00.141Z",
          "status": "CLOSED",
          "gameResult": 31
        },
        {
          // "id": "26368eea-a297-48c6-999e-761174256ce3",
          "gameNumber": 20052,
          // "createdAt": "2024-01-10T03:30:00.178Z",
          "status": "CLOSED",
          "gameResult": 27
        },
        {
          // "id": "99e2649f-5a3f-4c55-ad2e-4fdefb6f2ff2",
          "gameNumber": 20051,
          // "createdAt": "2024-01-10T03:26:00.147Z",
          "status": "CLOSED",
          "gameResult": 15
        },
        {
          // "id": "75498c74-3030-4b79-81c6-6b130ce20008",
          "gameNumber": 20050,
          // "createdAt": "2024-01-10T03:22:00.162Z",
          "status": "CLOSED",
          "gameResult": 0
        },
        {
          // "id": "551202ce-7186-487a-8af5-2ec0a963d4a4",
          "gameNumber": 20049,
          // "createdAt": "2024-01-10T03:18:00.154Z",
          "status": "CLOSED",
          "gameResult": 20
        },
        {
          // "id": "dcd28ef1-4468-4535-9980-fd2673f3849a",
          "gameNumber": 20048,
          // "createdAt": "2024-01-10T03:14:00.156Z",
          "status": "CLOSED",
          "gameResult": 33
        },
        {
          // "id": "c9855f0f-08d6-4bb5-8712-041370f71cec",
          "gameNumber": 20047,
          // "createdAt": "2024-01-10T03:10:00.162Z",
          "status": "CLOSED",
          "gameResult": 31
        },
        {
          // "id": "684f0a11-e4fb-4afc-a628-3ffb19d1ec1b",
          "gameNumber": 20046,
          // "createdAt": "2024-01-10T03:06:00.144Z",
          "status": "CLOSED",
          "gameResult": 30
        },
        {
          // "id": "22771648-da39-4f0e-8ea3-dfafe0d518a0",
          "gameNumber": 20045,
          // "createdAt": "2024-01-10T03:02:00.412Z",
          "status": "CLOSED",
          "gameResult": 14
        },
        {
          // "id": "5fe7638a-ec0b-4b80-8bb2-9c76447d1718",
          "gameNumber": 20044,
          // "createdAt": "2024-01-10T02:58:00.170Z",
          "status": "CLOSED",
          "gameResult": 29
        },
        {
          // "id": "4e60ac52-826e-458d-96b0-9aa7c073d646",
          "gameNumber": 20043,
          // "createdAt": "2024-01-10T02:54:00.159Z",
          "status": "CLOSED",
          "gameResult": 30
        },
        {
          // "id": "ab115a83-c646-45ac-9160-e4c78a2575d0",
          "gameNumber": 20042,
          // "createdAt": "2024-01-10T02:50:00.163Z",
          "status": "CLOSED",
          "gameResult": 12
        },
        {
          // "id": "696ecf1a-ee0f-4cc6-8631-45e93b166032",
          "gameNumber": 20041,
          // "createdAt": "2024-01-10T02:46:00.161Z",
          "status": "CLOSED",
          "gameResult": 1
        },
        {
          // "id": "e19c5e67-0b3b-4479-aa3d-babdc6af4d76",
          "gameNumber": 20040,
          // "createdAt": "2024-01-10T02:42:00.160Z",
          "status": "CLOSED",
          "gameResult": 34
        },
        {
          // "id": "83ce11a3-b7ff-4aab-869c-ef461b6120a7",
          "gameNumber": 20039,
          // "createdAt": "2024-01-10T02:38:00.155Z",
          "status": "CLOSED",
          "gameResult": 5
        },
        {
          // "id": "feec3901-bf75-40bf-9983-f50e573c0938",
          "gameNumber": 20038,
          // "createdAt": "2024-01-10T02:34:00.172Z",
          "status": "CLOSED",
          "gameResult": 23
        },
        {
          // "id": "49f5db25-d1bd-4574-88ff-8d5f01a13a3d",
          "gameNumber": 20037,
          // "createdAt": "2024-01-10T02:30:00.165Z",
          "status": "CLOSED",
          "gameResult": 35
        },
        {
          // "id": "3427830d-ef78-4f26-b358-43d354e43898",
          "gameNumber": 20036,
          // "createdAt": "2024-01-10T02:26:00.170Z",
          "status": "CLOSED",
          "gameResult": 2
        },
        {
          // "id": "3293be6c-9c3c-4f98-b298-bcb310d85992",
          "gameNumber": 20035,
          // "createdAt": "2024-01-10T02:22:00.158Z",
          "status": "CLOSED",
          "gameResult": 0
        },
        {
          // "id": "48cbeb18-dad3-4d33-956f-5a819ef1f4a5",
          "gameNumber": 20034,
          // "createdAt": "2024-01-10T02:18:00.156Z",
          "status": "CLOSED",
          "gameResult": 36
        },
        {
          // "id": "e5ac9767-786e-4e24-9902-7cbfa2bd7946",
          "gameNumber": 20033,
          // "createdAt": "2024-01-10T02:14:00.184Z",
          "status": "CLOSED",
          "gameResult": 20
        },
        {
          // "id": "499a9c02-6856-4788-8a79-46cbec2b1002",
          "gameNumber": 20032,
          // "createdAt": "2024-01-10T02:10:00.188Z",
          "status": "CLOSED",
          "gameResult": 18
        },
        {
          // "id": "7a9be4f6-7d8d-42ec-941e-c76ebaf2c37d",
          "gameNumber": 20031,
          // "createdAt": "2024-01-10T02:06:00.158Z",
          "status": "CLOSED",
          "gameResult": 5
        },
        {
          // "id": "14693def-dffd-4888-8784-a01735076d35",
          "gameNumber": 20030,
          // "createdAt": "2024-01-10T02:02:00.418Z",
          "status": "CLOSED",
          "gameResult": 7
        },
        {
          // "id": "8cacf6e2-ba7c-41b6-9be2-ca5baced8e35",
          "gameNumber": 20029,
          // "createdAt": "2024-01-10T01:58:00.161Z",
          "status": "CLOSED",
          "gameResult": 13
        },
        {
          // "id": "249d8e23-adb1-4269-95d3-8c231c406072",
          "gameNumber": 20028,
          // "createdAt": "2024-01-10T01:54:00.157Z",
          "status": "CLOSED",
          "gameResult": 2
        },
        {
          // "id": "6bab04a3-e35e-4893-8b7f-5dcba8ad46a3",
          "gameNumber": 20027,
          // "createdAt": "2024-01-10T01:50:00.164Z",
          "status": "CLOSED",
          "gameResult": 4
        },
        {
          // "id": "da6bcfeb-6f0f-440d-8a53-5d8745d26b54",
          "gameNumber": 20026,
          // "createdAt": "2024-01-10T01:46:00.150Z",
          "status": "CLOSED",
          "gameResult": 28
        },
        {
          // "id": "8f035f35-e8ef-454b-b42e-af04f89727fe",
          "gameNumber": 20025,
          // "createdAt": "2024-01-10T01:42:00.147Z",
          "status": "CLOSED",
          "gameResult": 19
        },
        {
          // "id": "1d40b105-39ba-4a8f-96db-4456b30b2fff",
          "gameNumber": 20024,
          // "createdAt": "2024-01-10T01:38:00.161Z",
          "status": "CLOSED",
          "gameResult": 36
        },
        {
          // "id": "7f425e0a-0e27-47f6-a2d8-35bd57d84c65",
          "gameNumber": 20023,
          // "createdAt": "2024-01-10T01:34:00.241Z",
          "status": "CLOSED",
          "gameResult": 29
        },
        {
          // "id": "c169c366-f165-473c-a12f-c18b4ba40c98",
          "gameNumber": 20022,
          // "createdAt": "2024-01-10T01:30:00.168Z",
          "status": "CLOSED",
          "gameResult": 25
        },
        {
          // "id": "7c63e067-bafd-4ed3-a5ff-65d12bce0692",
          "gameNumber": 20021,
          // "createdAt": "2024-01-10T01:26:00.161Z",
          "status": "CLOSED",
          "gameResult": 16
        },
        {
          // "id": "2ff310b0-d889-4310-8368-3a03957ede05",
          "gameNumber": 20020,
          // "createdAt": "2024-01-10T01:22:00.143Z",
          "status": "CLOSED",
          "gameResult": 10
        },
        {
          // "id": "07c5b17f-c1af-4361-8296-0df62ba09575",
          "gameNumber": 20019,
          // "createdAt": "2024-01-10T01:18:00.210Z",
          "status": "CLOSED",
          "gameResult": 16
        },
        {
          // "id": "c4be70b9-faf9-4923-a61a-68a71457b03b",
          "gameNumber": 20018,
          // "createdAt": "2024-01-10T01:14:00.159Z",
          "status": "CLOSED",
          "gameResult": 11
        },
        {
          // "id": "4c549f54-d301-41fb-8fce-85207ec5c740",
          "gameNumber": 20017,
          // "createdAt": "2024-01-10T01:10:00.163Z",
          "status": "CLOSED",
          "gameResult": 9
        },
        {
          // "id": "0926ffc3-94f5-455f-bb32-1eb4984ce3de",
          "gameNumber": 20016,
          // "createdAt": "2024-01-10T01:06:00.167Z",
          "status": "CLOSED",
          "gameResult": 31
        },
        {
          // "id": "0d3b102f-debf-4d54-bf88-151db3cbedcb",
          "gameNumber": 20015,
          // "createdAt": "2024-01-10T01:02:00.159Z",
          "status": "CLOSED",
          "gameResult": 3
        },
        {
          // "id": "e16511a8-7832-4204-a186-80425958f0e7",
          "gameNumber": 20014,
          // "createdAt": "2024-01-10T00:58:00.160Z",
          "status": "CLOSED",
          "gameResult": 13
        },
        {
          // "id": "a14e33b5-ad4e-4be9-a6e1-88773be8badb",
          "gameNumber": 20013,
          // "createdAt": "2024-01-10T00:54:00.158Z",
          "status": "CLOSED",
          "gameResult": 0
        },
        {
          // "id": "5f988fc7-457a-4ae6-bd90-b53280f4ad9c",
          "gameNumber": 20012,
          // "createdAt": "2024-01-10T00:50:00.169Z",
          "status": "CLOSED",
          "gameResult": 31
        },
        {
          // "id": "b7c2ef4e-e816-46e1-b75a-c54bd0b6e355",
          "gameNumber": 20011,
          // "createdAt": "2024-01-10T00:46:00.157Z",
          "status": "CLOSED",
          "gameResult": 20
        },
        {
          // "id": "53f6f7da-d45c-47c3-be3a-8171304ceea6",
          "gameNumber": 20010,
          // "createdAt": "2024-01-10T00:42:00.138Z",
          "status": "CLOSED",
          "gameResult": 15
        },
        {
          // "id": "33eaff1d-bd34-4789-96b4-d08ede26d5ec",
          "gameNumber": 20009,
          // "createdAt": "2024-01-10T00:38:00.148Z",
          "status": "CLOSED",
          "gameResult": 4
        },
        {
          // "id": "eefa9d9c-0cd6-4b9c-b8e6-6527f613b85f",
          "gameNumber": 20008,
          // "createdAt": "2024-01-10T00:34:00.157Z",
          "status": "CLOSED",
          "gameResult": 14
        },
        {
          // "id": "4ad57886-75d8-4d6c-9f8e-4e59764d7ca8",
          "gameNumber": 20007,
          // "createdAt": "2024-01-10T00:30:00.153Z",
          "status": "CLOSED",
          "gameResult": 14
        },
        {
          // "id": "b23cfa74-dec2-4caa-8d7b-3a361e911b32",
          "gameNumber": 20006,
          // "createdAt": "2024-01-10T00:26:00.144Z",
          "status": "CLOSED",
          "gameResult": 25
        },
        {
          // "id": "5dc32597-b1fa-4e32-b14b-01b5a14d5160",
          "gameNumber": 20005,
          // "createdAt": "2024-01-10T00:22:00.178Z",
          "status": "CLOSED",
          "gameResult": 16
        },
        {
          // "id": "8684c39f-f15f-45be-a618-6f08e1e8e2f6",
          "gameNumber": 20004,
          // "createdAt": "2024-01-10T00:18:00.153Z",
          "status": "CLOSED",
          "gameResult": 20
        },
        {
          // "id": "a1646018-1960-48b4-91a6-b021d48fe366",
          "gameNumber": 20003,
          // "createdAt": "2024-01-10T00:14:00.152Z",
          "status": "CLOSED",
          "gameResult": 31
        },
        {
          // "id": "1bc1cfe2-3d81-4cb8-894c-8771bcd0ac70",
          "gameNumber": 20002,
          // "createdAt": "2024-01-10T00:10:00.225Z",
          "status": "CLOSED",
          "gameResult": 10
        },
        {
          // "id": "5139ec78-4a05-4e48-a8d8-f60923a4b140",
          "gameNumber": 20001,
          // "createdAt": "2024-01-10T00:06:00.134Z",
          "status": "CLOSED",
          "gameResult": 6
        },
        {
          // "id": "9c1eecc7-f26d-48da-914a-1ccd48fb7302",
          "gameNumber": 20000,
          // "createdAt": "2024-01-10T00:02:00.264Z",
          "status": "CLOSED",
          "gameResult": 16
        },
        {
          // "id": "35e29afa-0954-4b5d-803b-f00a37c93144",
          "gameNumber": 20359,
          // "createdAt": "2024-01-09T23:58:00.146Z",
          "status": "CLOSED",
          "gameResult": 24
        },
        {
          // "id": "cc1bc308-73c8-4518-82af-87a89f2da095",
          "gameNumber": 20358,
          // "createdAt": "2024-01-09T23:54:00.149Z",
          "status": "CLOSED",
          "gameResult": 1
        },
        {
          // "id": "8a289555-faac-4d79-b3b4-8221c9e2ab58",
          "gameNumber": 20357,
          // "createdAt": "2024-01-09T23:50:00.189Z",
          "status": "CLOSED",
          "gameResult": 30
        },
        {
          // "id": "e94cc897-c8a2-4f35-9c9e-c103f5f638f8",
          "gameNumber": 20356,
          // "createdAt": "2024-01-09T23:46:00.193Z",
          "status": "CLOSED",
          "gameResult": 9
        },
        {
          // "id": "a438f2bd-06a3-476a-a7cf-a9483cee50c6",
          "gameNumber": 20355,
          // "createdAt": "2024-01-09T23:42:00.154Z",
          "status": "CLOSED",
          "gameResult": 29
        },
        {
          // "id": "72edb9b9-2988-4f46-9cf1-17610c234de6",
          "gameNumber": 20354,
          // "createdAt": "2024-01-09T23:38:00.157Z",
          "status": "CLOSED",
          "gameResult": 13
        },
        {
          // "id": "42e217eb-d65e-498b-a534-c5ca33d35798",
          "gameNumber": 20353,
          // "createdAt": "2024-01-09T23:34:00.159Z",
          "status": "CLOSED",
          "gameResult": 28
        },
        {
          // "id": "447068ab-1602-40e2-90b0-782d6b2e7945",
          "gameNumber": 20352,
          // "createdAt": "2024-01-09T23:30:00.207Z",
          "status": "CLOSED",
          "gameResult": 21
        },
        {
          // "id": "1f9d1efc-1295-481b-afc4-ea14035e6419",
          "gameNumber": 20351,
          // "createdAt": "2024-01-09T23:26:00.203Z",
          "status": "CLOSED",
          "gameResult": 19
        },
        {
          // "id": "f51c53d0-6a7b-46a3-bc46-219ca7834d03",
          "gameNumber": 20350,
          // "createdAt": "2024-01-09T23:22:00.193Z",
          "status": "CLOSED",
          "gameResult": 6
        },
        {
          // "id": "81dc0828-88be-492c-8942-b34ef9515795",
          "gameNumber": 20349,
          // "createdAt": "2024-01-09T23:18:00.149Z",
          "status": "CLOSED",
          "gameResult": 4
        },
        {
          // "id": "84338bfd-c9d8-486e-b986-54b2a51996e8",
          "gameNumber": 20348,
          // "createdAt": "2024-01-09T23:14:00.155Z",
          "status": "CLOSED",
          "gameResult": 35
        },
        {
          // "id": "138a1890-dd17-4dc4-b2d2-c4949fccfb58",
          "gameNumber": 20347,
          // "createdAt": "2024-01-09T23:10:00.175Z",
          "status": "CLOSED",
          "gameResult": 16
        },
        {
          // "id": "51393f3c-1f0a-4364-9b89-b2ca25bb32b2",
          "gameNumber": 20346,
          // "createdAt": "2024-01-09T23:06:00.145Z",
          "status": "CLOSED",
          "gameResult": 1
        },
        {
          // "id": "ae036e19-53b6-444d-bed5-574af9d3e347",
          "gameNumber": 20345,
          // "createdAt": "2024-01-09T23:02:00.158Z",
          "status": "CLOSED",
          "gameResult": 34
        },
        {
          // "id": "72b21eeb-9800-44d8-8d49-e3584347b261",
          "gameNumber": 20344,
          // "createdAt": "2024-01-09T22:58:00.225Z",
          "status": "CLOSED",
          "gameResult": 12
        },
        {
          // "id": "ec22a4a8-490b-4078-b615-a65cadbe090a",
          "gameNumber": 20343,
          // "createdAt": "2024-01-09T22:54:00.154Z",
          "status": "CLOSED",
          "gameResult": 18
        },
        {
          // "id": "9a3ae339-3a5f-41cb-a59f-b79caa2de048",
          "gameNumber": 20342,
          // "createdAt": "2024-01-09T22:50:00.172Z",
          "status": "CLOSED",
          "gameResult": 21
        },
        {
          // "id": "45b2cd87-fd8a-4cb6-aae3-bbd89e0e8e12",
          "gameNumber": 20341,
          // "createdAt": "2024-01-09T22:46:00.164Z",
          "status": "CLOSED",
          "gameResult": 23
        },
        {
          // "id": "cf0d28b3-25c7-4cf5-9891-b65f05bf3e71",
          "gameNumber": 20340,
          // "createdAt": "2024-01-09T22:42:00.157Z",
          "status": "CLOSED",
          "gameResult": 21
        },
        {
          // "id": "ab6cdffd-7d88-4648-ae7c-11c4bf92b4b9",
          "gameNumber": 20339,
          // "createdAt": "2024-01-09T22:38:00.196Z",
          "status": "CLOSED",
          "gameResult": 17
        },
        {
          // "id": "70f909e6-5893-4ac4-9338-e4df68851f76",
          "gameNumber": 20338,
          // "createdAt": "2024-01-09T22:34:00.182Z",
          "status": "CLOSED",
          "gameResult": 30
        },
        {
          // "id": "440f48d1-331f-4fe2-8d72-2f63184aab52",
          "gameNumber": 20337,
          // "createdAt": "2024-01-09T22:30:00.188Z",
          "status": "CLOSED",
          "gameResult": 12
        },
        {
          // "id": "ea6d2102-5dc8-4cf1-b7be-fd21e4feb94b",
          "gameNumber": 20336,
          // "createdAt": "2024-01-09T22:26:00.157Z",
          "status": "CLOSED",
          "gameResult": 0
        },
        {
          // "id": "016bb35d-4d30-4abe-bfad-f8005ca794e2",
          "gameNumber": 20335,
          // "createdAt": "2024-01-09T22:22:00.147Z",
          "status": "CLOSED",
          "gameResult": 19
        },
        {
          // "id": "d1f1980f-8a3a-4f27-a28a-4c7e8f150321",
          "gameNumber": 20334,
          // "createdAt": "2024-01-09T22:18:00.137Z",
          "status": "CLOSED",
          "gameResult": 6
        },
        {
          // "id": "a37f1c1d-67ce-4dff-855e-98217212a407",
          "gameNumber": 20333,
          // "createdAt": "2024-01-09T22:14:00.155Z",
          "status": "CLOSED",
          "gameResult": 15
        },
        {
          // "id": "e017b33b-7e71-48f8-bf7b-faa45788d0c3",
          "gameNumber": 20332,
          // "createdAt": "2024-01-09T22:10:00.143Z",
          "status": "CLOSED",
          "gameResult": 3
        },
        {
          // "id": "8d8b0b9a-3a82-4a56-9048-eb49d4f9ea6c",
          "gameNumber": 20331,
          // "createdAt": "2024-01-09T22:06:00.162Z",
          "status": "CLOSED",
          "gameResult": 33
        },
        {
          // "id": "4603c3fc-9f68-4f40-836f-7dfe6bf11db4",
          "gameNumber": 20330,
          // "createdAt": "2024-01-09T22:02:00.146Z",
          "status": "CLOSED",
          "gameResult": 5
        }
      ]
    })
  },

  getSpinResult: async (req, res) => {
    // https://api.board.bluebez.com/spin/game/result?gameNumber=20169
    return res.status(200).json(
      {
        "result": {
          // "id": "99219616-80a4-4de1-87ba-3dfb76cc2430",
          "gameNumber": 20170,
          // "createdAt": "2024-01-10T11:18:00.166Z",
          "status": "CLOSED",
          "gameResult": 4
        },
        "recent": [
          {
            // "id": "99219616-80a4-4de1-87ba-3dfb76cc2430",
            "gameNumber": 20170,
            // "createdAt": "2024-01-10T11:18:00.166Z",
            "status": "CLOSED",
            "gameResult": 4
          },
          {
            // "id": "99219616-80a4-4de1-87ba-3dfb76cc2430",
            "gameNumber": 20169,
            // "createdAt": "2024-01-10T11:18:00.166Z",
            "status": "CLOSED",
            "gameResult": 7
          },
          {
            // "id": "f41df26c-6e61-484f-a924-4585212b9472",
            "gameNumber": 20168,
            // "createdAt": "2024-01-10T11:14:00.270Z",
            "status": "CLOSED",
            "gameResult": 11
          },
          {
            // "id": "d0a141a6-3b91-4679-8913-05a2f5e0cc02",
            "gameNumber": 20167,
            // "createdAt": "2024-01-10T11:10:00.199Z",
            "status": "CLOSED",
            "gameResult": 9
          },
          {
            // "id": "9ea69ecb-9b26-43af-9e9b-d9844140c968",
            "gameNumber": 20166,
            // "createdAt": "2024-01-10T11:06:00.176Z",
            "status": "CLOSED",
            "gameResult": 24
          },
          {
            // "id": "ed78b591-6390-400b-b770-3f84010f923e",
            "gameNumber": 20165,
            // "createdAt": "2024-01-10T11:02:00.225Z",
            "status": "CLOSED",
            "gameResult": 29
          },
          {
            // "id": "0856dbdb-a379-4831-b7d7-95953214596b",
            "gameNumber": 20164,
            // "createdAt": "2024-01-10T10:58:00.329Z",
            "status": "CLOSED",
            "gameResult": 15
          },
          {
            // "id": "f69a863c-f5e3-4e34-89bd-6374ed093676",
            "gameNumber": 20163,
            // "createdAt": "2024-01-10T10:54:00.227Z",
            "status": "CLOSED",
            "gameResult": 4
          },
          {
            // "id": "102ea28c-5550-4980-b254-094997d32fbb",
            "gameNumber": 20162,
            // "createdAt": "2024-01-10T10:50:00.194Z",
            "status": "CLOSED",
            "gameResult": 22
          },
          {
            // "id": "fd7767a7-956d-4945-be54-7f6666d2f3af",
            "gameNumber": 20161,
            // "createdAt": "2024-01-10T10:46:00.186Z",
            "status": "CLOSED",
            "gameResult": 9
          },
          {
            // "id": "984b330e-727a-41ee-b0a8-7caab1da6e35",
            "gameNumber": 20160,
            // "createdAt": "2024-01-10T10:42:00.174Z",
            "status": "CLOSED",
            "gameResult": 19
          },
          {
            // "id": "e7eff91c-356c-402e-a9b3-85de1f6bba95",
            "gameNumber": 20159,
            // "createdAt": "2024-01-10T10:38:00.217Z",
            "status": "CLOSED",
            "gameResult": 0
          },
          {
            // "id": "d45935aa-698b-4276-aff5-df651bd70932",
            "gameNumber": 20158,
            // "createdAt": "2024-01-10T10:34:00.155Z",
            "status": "CLOSED",
            "gameResult": 28
          },
          {
            // "id": "379e4a3c-e166-46d0-9776-446b18b6f5e2",
            "gameNumber": 20157,
            // "createdAt": "2024-01-10T10:30:00.226Z",
            "status": "CLOSED",
            "gameResult": 32
          },
          {
            // "id": "89a20744-a552-4021-b8db-1c3f415d8239",
            "gameNumber": 20156,
            // "createdAt": "2024-01-10T10:26:00.191Z",
            "status": "CLOSED",
            "gameResult": 24
          },
          {
            // "id": "c91a86b4-37ab-44ad-8796-abf70b445852",
            "gameNumber": 20155,
            // "createdAt": "2024-01-10T10:22:00.222Z",
            "status": "CLOSED",
            "gameResult": 5
          },
          {
            // "id": "f39dd466-8e68-4f73-809d-88938bc767ec",
            "gameNumber": 20154,
            // "createdAt": "2024-01-10T10:18:00.162Z",
            "status": "CLOSED",
            "gameResult": 31
          },
          {
            // "id": "268c03d7-8f50-4220-a6d2-e873524aab21",
            "gameNumber": 20153,
            // "createdAt": "2024-01-10T10:14:00.187Z",
            "status": "CLOSED",
            "gameResult": 19
          },
          {
            // "id": "27df7e37-04f7-41cb-9165-6b011a2c33af",
            "gameNumber": 20152,
            // "createdAt": "2024-01-10T10:10:00.184Z",
            "status": "CLOSED",
            "gameResult": 6
          },
          {
            // "id": "c5222b27-61e9-4cf8-a4bb-8e8cde0f864e",
            "gameNumber": 20151,
            // "createdAt": "2024-01-10T10:06:00.176Z",
            "status": "CLOSED",
            "gameResult": 17
          },
          {
            // "id": "b45d6f58-7da3-4c35-8f8b-29667dc816e7",
            "gameNumber": 20150,
            // "createdAt": "2024-01-10T10:02:00.174Z",
            "status": "CLOSED",
            "gameResult": 20
          },
          {
            // "id": "ed37982d-8433-49be-8306-1925b176408f",
            "gameNumber": 20149,
            // "createdAt": "2024-01-10T09:58:00.164Z",
            "status": "CLOSED",
            "gameResult": 32
          },
          {
            // "id": "58a75fe5-fe39-4814-bb6d-ab30d9c469e2",
            "gameNumber": 20148,
            // "createdAt": "2024-01-10T09:54:00.159Z",
            "status": "CLOSED",
            "gameResult": 26
          },
          {
            // "id": "5826a13b-58a2-4fd1-af28-90a9583d67f5",
            "gameNumber": 20147,
            // "createdAt": "2024-01-10T09:50:00.202Z",
            "status": "CLOSED",
            "gameResult": 16
          },
          {
            // "id": "56792544-8481-4d02-b04c-7a06af001bea",
            "gameNumber": 20146,
            // "createdAt": "2024-01-10T09:46:00.187Z",
            "status": "CLOSED",
            "gameResult": 7
          },
          {
            // "id": "c70d630e-7bab-4ece-86d9-2b3e8fdcb47a",
            "gameNumber": 20145,
            // "createdAt": "2024-01-10T09:42:00.170Z",
            "status": "CLOSED",
            "gameResult": 1
          },
          {
            // "id": "dcec14ee-7b7b-4724-a26c-f4b3e68fadf3",
            "gameNumber": 20144,
            // "createdAt": "2024-01-10T09:38:00.185Z",
            "status": "CLOSED",
            "gameResult": 35
          },
          {
            // "id": "cf3721e0-dd96-45a8-84bc-a2aabe3d7ae4",
            "gameNumber": 20143,
            // "createdAt": "2024-01-10T09:34:00.175Z",
            "status": "CLOSED",
            "gameResult": 10
          },
          {
            // "id": "4dcd2197-61bd-41ed-9435-6da4aa460986",
            "gameNumber": 20142,
            // "createdAt": "2024-01-10T09:30:00.175Z",
            "status": "CLOSED",
            "gameResult": 8
          },
          {
            // "id": "67e83a69-b6d2-40ab-985c-f10ef7abb5e7",
            "gameNumber": 20141,
            // "createdAt": "2024-01-10T09:26:00.185Z",
            "status": "CLOSED",
            "gameResult": 18
          },
          {
            // "id": "f5e8de77-866e-4f81-b11d-cbe66607f7d0",
            "gameNumber": 20140,
            // "createdAt": "2024-01-10T09:22:00.184Z",
            "status": "CLOSED",
            "gameResult": 21
          },
          {
            // "id": "2d1eda51-a160-41eb-a0b4-78c68f97abda",
            "gameNumber": 20139,
            // "createdAt": "2024-01-10T09:18:00.180Z",
            "status": "CLOSED",
            "gameResult": 32
          },
          {
            // "id": "a69bd902-e69b-4a84-b202-ab06a81e1680",
            "gameNumber": 20138,
            // "createdAt": "2024-01-10T09:14:00.184Z",
            "status": "CLOSED",
            "gameResult": 3
          },
          {
            // "id": "1b73dbc9-068e-4d5a-ae10-0f608ab1b5d8",
            "gameNumber": 20137,
            // "createdAt": "2024-01-10T09:10:00.212Z",
            "status": "CLOSED",
            "gameResult": 14
          },
          {
            // "id": "d008e05e-7b0c-4f13-8e84-9e76e394d1c5",
            "gameNumber": 20136,
            // "createdAt": "2024-01-10T09:06:00.189Z",
            "status": "CLOSED",
            "gameResult": 2
          },
          {
            // "id": "8bfe47d9-3c43-4e37-b8da-75feb772f2a8",
            "gameNumber": 20135,
            // "createdAt": "2024-01-10T09:02:00.182Z",
            "status": "CLOSED",
            "gameResult": 9
          },
          {
            // "id": "440b4050-379f-4fe5-84fb-84866c58a036",
            "gameNumber": 20134,
            // "createdAt": "2024-01-10T08:58:00.225Z",
            "status": "CLOSED",
            "gameResult": 27
          },
          {
            // "id": "11d3d26c-b636-4a44-b51b-729441e1d0c6",
            "gameNumber": 20133,
            // "createdAt": "2024-01-10T08:54:00.172Z",
            "status": "CLOSED",
            "gameResult": 30
          },
          {
            // "id": "de8cb39e-2b30-46e2-b95e-012015571c69",
            "gameNumber": 20132,
            // "createdAt": "2024-01-10T08:50:00.160Z",
            "status": "CLOSED",
            "gameResult": 12
          },
          {
            // "id": "403f9703-dc5a-44f6-9c12-7a7f6d91846f",
            "gameNumber": 20131,
            // "createdAt": "2024-01-10T08:46:00.224Z",
            "status": "CLOSED",
            "gameResult": 29
          },
          {
            // "id": "ab0cfdbc-ab14-4097-bf8d-b437996aac6e",
            "gameNumber": 20130,
            // "createdAt": "2024-01-10T08:42:00.175Z",
            "status": "CLOSED",
            "gameResult": 16
          },
          {
            // "id": "f1cd01ee-b7e4-4d39-a705-290e0f92c8a4",
            "gameNumber": 20129,
            // "createdAt": "2024-01-10T08:38:00.165Z",
            "status": "CLOSED",
            "gameResult": 0
          },
          {
            // "id": "c45b5b67-08c2-4c59-9455-e435d663e3d0",
            "gameNumber": 20128,
            // "createdAt": "2024-01-10T08:34:00.215Z",
            "status": "CLOSED",
            "gameResult": 15
          },
          {
            // "id": "9a9e4ca4-2624-482a-b24c-cd36fcd30458",
            "gameNumber": 20127,
            // "createdAt": "2024-01-10T08:30:00.164Z",
            "status": "CLOSED",
            "gameResult": 27
          },
          {
            // "id": "eaeeb590-e256-4fa2-a870-d850c9e716ee",
            "gameNumber": 20126,
            // "createdAt": "2024-01-10T08:26:00.177Z",
            "status": "CLOSED",
            "gameResult": 12
          },
          {
            // "id": "df0e43f4-979e-424d-8e97-776d07e95350",
            "gameNumber": 20125,
            // "createdAt": "2024-01-10T08:22:00.204Z",
            "status": "CLOSED",
            "gameResult": 14
          },
          {
            // "id": "8d41df2a-5dc1-4bc9-83f0-b616da12a867",
            "gameNumber": 20124,
            // "createdAt": "2024-01-10T08:18:00.172Z",
            "status": "CLOSED",
            "gameResult": 25
          },
          {
            // "id": "a2914cb5-771c-4589-ab6e-975f85f0a369",
            "gameNumber": 20123,
            // "createdAt": "2024-01-10T08:14:00.166Z",
            "status": "CLOSED",
            "gameResult": 34
          },
          {
            // "id": "1d2e6d49-fdc3-404e-92d5-13c90b707fd4",
            "gameNumber": 20122,
            // "createdAt": "2024-01-10T08:10:00.184Z",
            "status": "CLOSED",
            "gameResult": 0
          },
          {
            // "id": "2af48c46-2083-4c83-93c5-3d38e64c15eb",
            "gameNumber": 20121,
            // "createdAt": "2024-01-10T08:06:00.157Z",
            "status": "CLOSED",
            "gameResult": 20
          },
          {
            // "id": "03a4b869-c9c1-4bcb-8cd1-a9edf910d6be",
            "gameNumber": 20120,
            // "createdAt": "2024-01-10T08:02:00.191Z",
            "status": "CLOSED",
            "gameResult": 31
          },
          {
            // "id": "c4c3cd86-eeda-40be-aa7e-7c8214b96cf7",
            "gameNumber": 20119,
            // "createdAt": "2024-01-10T07:58:00.166Z",
            "status": "CLOSED",
            "gameResult": 12
          },
          {
            // "id": "bd5019fc-feff-4d1e-80ff-d4e3cd6ff0f4",
            "gameNumber": 20118,
            // "createdAt": "2024-01-10T07:54:00.175Z",
            "status": "CLOSED",
            "gameResult": 22
          },
          {
            // "id": "c233ae31-1e43-4284-9793-306ebda620d9",
            "gameNumber": 20117,
            // "createdAt": "2024-01-10T07:50:00.220Z",
            "status": "CLOSED",
            "gameResult": 22
          },
          {
            // "id": "8acb7619-f888-4ec6-b34b-a1f797d62f24",
            "gameNumber": 20116,
            // "createdAt": "2024-01-10T07:46:00.193Z",
            "status": "CLOSED",
            "gameResult": 1
          },
          {
            // "id": "08df087c-6409-487d-8399-71e24be74f58",
            "gameNumber": 20115,
            // "createdAt": "2024-01-10T07:42:00.270Z",
            "status": "CLOSED",
            "gameResult": 24
          },
          {
            // "id": "3b27a0d1-9bcd-4b50-8109-949fcf0ce863",
            "gameNumber": 20114,
            // "createdAt": "2024-01-10T07:38:00.164Z",
            "status": "CLOSED",
            "gameResult": 12
          },
          {
            // "id": "8cbe97c0-53d2-4b86-b0df-df863cb7a3dd",
            "gameNumber": 20113,
            // "createdAt": "2024-01-10T07:34:00.246Z",
            "status": "CLOSED",
            "gameResult": 20
          },
          {
            // "id": "3f5976ab-c1a4-4623-a4ef-76b14968fe28",
            "gameNumber": 20112,
            // "createdAt": "2024-01-10T07:30:00.187Z",
            "status": "CLOSED",
            "gameResult": 35
          },
          {
            // "id": "b28c0652-3172-45ab-ace8-d09c531fc374",
            "gameNumber": 20111,
            // "createdAt": "2024-01-10T07:26:00.154Z",
            "status": "CLOSED",
            "gameResult": 26
          },
          {
            // "id": "7f5025e6-715f-42eb-8582-aa9e25650f32",
            "gameNumber": 20110,
            // "createdAt": "2024-01-10T07:22:00.182Z",
            "status": "CLOSED",
            "gameResult": 2
          },
          {
            // "id": "5eaaec77-81f6-44e2-8e15-39666fb5d291",
            "gameNumber": 20109,
            // "createdAt": "2024-01-10T07:18:00.201Z",
            "status": "CLOSED",
            "gameResult": 14
          },
          {
            // "id": "1f86016a-7eef-4934-9bde-f28af1b64419",
            "gameNumber": 20108,
            // "createdAt": "2024-01-10T07:14:00.160Z",
            "status": "CLOSED",
            "gameResult": 18
          },
          {
            // "id": "10c440da-e594-42d8-a2e1-f090c8a0294c",
            "gameNumber": 20107,
            // "createdAt": "2024-01-10T07:10:00.205Z",
            "status": "CLOSED",
            "gameResult": 7
          },
          {
            // "id": "993392ef-f062-4680-8e81-a3ce4524ee95",
            "gameNumber": 20106,
            // "createdAt": "2024-01-10T07:06:00.140Z",
            "status": "CLOSED",
            "gameResult": 18
          },
          {
            // "id": "29cad360-5119-4c08-a9ce-db9f71560cd9",
            "gameNumber": 20105,
            // "createdAt": "2024-01-10T07:02:00.153Z",
            "status": "CLOSED",
            "gameResult": 16
          },
          {
            // "id": "374a8ffc-3519-429b-bf14-08d4f6217842",
            "gameNumber": 20104,
            // "createdAt": "2024-01-10T06:58:00.150Z",
            "status": "CLOSED",
            "gameResult": 17
          },
          {
            // "id": "e0d40b1b-be76-458e-baba-43057b6501e2",
            "gameNumber": 20103,
            // "createdAt": "2024-01-10T06:54:00.159Z",
            "status": "CLOSED",
            "gameResult": 3
          },
          {
            // "id": "1fc4574b-8dee-41ff-a106-1c07f10e4aa1",
            "gameNumber": 20102,
            // "createdAt": "2024-01-10T06:50:00.181Z",
            "status": "CLOSED",
            "gameResult": 18
          },
          {
            // "id": "f870b729-05e0-4711-ad6f-b9ccc3827ec9",
            "gameNumber": 20101,
            // "createdAt": "2024-01-10T06:46:00.186Z",
            "status": "CLOSED",
            "gameResult": 2
          },
          {
            // "id": "3606eebb-4635-4d76-b73e-e71cc28747f8",
            "gameNumber": 20100,
            // "createdAt": "2024-01-10T06:42:00.198Z",
            "status": "CLOSED",
            "gameResult": 14
          },
          {
            // "id": "a85f762a-8bef-465c-a9a5-9f213529b047",
            "gameNumber": 20099,
            // "createdAt": "2024-01-10T06:38:00.153Z",
            "status": "CLOSED",
            "gameResult": 8
          },
          {
            // "id": "08d45d87-59df-4b08-b0df-e075dedbf909",
            "gameNumber": 20098,
            // "createdAt": "2024-01-10T06:34:00.137Z",
            "status": "CLOSED",
            "gameResult": 15
          },
          {
            // "id": "01937189-bb5a-45ef-8045-44d00b687bda",
            "gameNumber": 20097,
            // "createdAt": "2024-01-10T06:30:00.170Z",
            "status": "CLOSED",
            "gameResult": 33
          },
          {
            // "id": "8388685c-c2d6-420d-b375-e4e49db726f5",
            "gameNumber": 20096,
            // "createdAt": "2024-01-10T06:26:00.168Z",
            "status": "CLOSED",
            "gameResult": 34
          },
          {
            // "id": "a1686af4-6ce3-4409-848d-5d717ad6fe29",
            "gameNumber": 20095,
            // "createdAt": "2024-01-10T06:22:00.143Z",
            "status": "CLOSED",
            "gameResult": 10
          },
          {
            // "id": "bb3221f0-2ef3-4f44-9b78-74c2d2e59532",
            "gameNumber": 20094,
            // "createdAt": "2024-01-10T06:18:00.164Z",
            "status": "CLOSED",
            "gameResult": 27
          },
          {
            // "id": "62af6f25-7ede-44a4-ad45-a377c7a46b1c",
            "gameNumber": 20093,
            // "createdAt": "2024-01-10T06:14:00.165Z",
            "status": "CLOSED",
            "gameResult": 36
          },
          {
            // "id": "6a3e8c0a-e0c7-42a7-9992-e11b0a026b25",
            "gameNumber": 20092,
            // "createdAt": "2024-01-10T06:10:00.155Z",
            "status": "CLOSED",
            "gameResult": 23
          },
          {
            // "id": "df7f3ce4-cba8-42bc-ad7e-b6539033300e",
            "gameNumber": 20091,
            // "createdAt": "2024-01-10T06:06:00.155Z",
            "status": "CLOSED",
            "gameResult": 3
          },
          {
            // "id": "c3f190de-cbcd-43fd-8e6d-0f9ec21b33b1",
            "gameNumber": 20090,
            // "createdAt": "2024-01-10T06:02:00.140Z",
            "status": "CLOSED",
            "gameResult": 25
          },
          {
            // "id": "40b973a3-65be-4890-a53b-e6e7776a4607",
            "gameNumber": 20089,
            // "createdAt": "2024-01-10T05:58:00.147Z",
            "status": "CLOSED",
            "gameResult": 33
          },
          {
            // "id": "74267157-f719-4e70-a0aa-16ba2cefff31",
            "gameNumber": 20088,
            // "createdAt": "2024-01-10T05:54:00.137Z",
            "status": "CLOSED",
            "gameResult": 35
          },
          {
            // "id": "5af98153-fe40-4b2b-8d98-5035567bce20",
            "gameNumber": 20087,
            // "createdAt": "2024-01-10T05:50:00.159Z",
            "status": "CLOSED",
            "gameResult": 26
          },
          {
            // "id": "2ec7601b-d5cd-4248-bdd5-fd870118ab37",
            "gameNumber": 20086,
            // "createdAt": "2024-01-10T05:46:00.153Z",
            "status": "CLOSED",
            "gameResult": 1
          },
          {
            // "id": "70a82dde-846d-45c0-ac82-fa129aa8360c",
            "gameNumber": 20085,
            // "createdAt": "2024-01-10T05:42:00.129Z",
            "status": "CLOSED",
            "gameResult": 36
          },
          {
            // "id": "c0025954-1d0d-4814-ad84-f2ac36c75c58",
            "gameNumber": 20084,
            // "createdAt": "2024-01-10T05:38:00.150Z",
            "status": "CLOSED",
            "gameResult": 22
          },
          {
            // "id": "e53bdfff-0c58-418e-9581-c613d307cf24",
            "gameNumber": 20083,
            // "createdAt": "2024-01-10T05:34:00.150Z",
            "status": "CLOSED",
            "gameResult": 3
          },
          {
            // "id": "a7dc840d-0ea5-4c32-abd2-4972ff03da48",
            "gameNumber": 20082,
            // "createdAt": "2024-01-10T05:30:00.149Z",
            "status": "CLOSED",
            "gameResult": 33
          },
          {
            // "id": "a63b7312-a96c-4e85-8e18-a1dbc8ec5d85",
            "gameNumber": 20081,
            // "createdAt": "2024-01-10T05:26:00.149Z",
            "status": "CLOSED",
            "gameResult": 10
          },
          {
            // "id": "b39361d6-e440-4f20-88c0-16bfc64e089b",
            "gameNumber": 20080,
            // "createdAt": "2024-01-10T05:22:00.161Z",
            "status": "CLOSED",
            "gameResult": 11
          },
          {
            // "id": "50df5196-8f7c-4feb-bc55-c182077e965e",
            "gameNumber": 20079,
            // "createdAt": "2024-01-10T05:18:00.154Z",
            "status": "CLOSED",
            "gameResult": 4
          },
          {
            // "id": "84beb169-3373-43f4-a7f2-3cb4b26feff2",
            "gameNumber": 20078,
            // "createdAt": "2024-01-10T05:14:00.178Z",
            "status": "CLOSED",
            "gameResult": 29
          },
          {
            // "id": "d00dc7ec-4fb1-48e4-85ca-2ddd2d48b14e",
            "gameNumber": 20077,
            // "createdAt": "2024-01-10T05:10:00.161Z",
            "status": "CLOSED",
            "gameResult": 32
          },
          {
            // "id": "d76ed22b-fba4-4823-893e-44396114b4b4",
            "gameNumber": 20076,
            // "createdAt": "2024-01-10T05:06:00.180Z",
            "status": "CLOSED",
            "gameResult": 15
          },
          {
            // "id": "9418fcbb-9306-4d35-a6a3-8791bef28dbb",
            "gameNumber": 20075,
            // "createdAt": "2024-01-10T05:02:00.267Z",
            "status": "CLOSED",
            "gameResult": 2
          },
          {
            // "id": "09577f8e-f3da-4cea-907b-d4c71762780d",
            "gameNumber": 20074,
            // "createdAt": "2024-01-10T04:58:00.239Z",
            "status": "CLOSED",
            "gameResult": 36
          },
          {
            // "id": "0b1b81b7-072d-4053-ba59-cd448bc6b34d",
            "gameNumber": 20073,
            // "createdAt": "2024-01-10T04:54:00.308Z",
            "status": "CLOSED",
            "gameResult": 15
          },
          {
            // "id": "d84bc4af-c1f2-4707-b27c-68c3b9b7b90d",
            "gameNumber": 20072,
            // "createdAt": "2024-01-10T04:50:00.250Z",
            "status": "CLOSED",
            "gameResult": 10
          },
          {
            // "id": "2b1b37b0-cf6d-4028-a5c0-dcf002c8bc8d",
            "gameNumber": 20071,
            // "createdAt": "2024-01-10T04:46:00.247Z",
            "status": "CLOSED",
            "gameResult": 3
          },
          {
            // "id": "a95f03f6-7d48-40e1-af51-603359fdee6a",
            "gameNumber": 20070,
            // "createdAt": "2024-01-10T04:42:00.256Z",
            "status": "CLOSED",
            "gameResult": 35
          },
          {
            // "id": "9cd0faf8-fd62-4b6b-8219-2f34f87100a5",
            "gameNumber": 20069,
            // "createdAt": "2024-01-10T04:38:00.226Z",
            "status": "CLOSED",
            "gameResult": 21
          },
          {
            // "id": "c504fcf9-0291-41f9-93da-64d87f7fae6d",
            "gameNumber": 20068,
            // "createdAt": "2024-01-10T04:34:00.288Z",
            "status": "CLOSED",
            "gameResult": 22
          },
          {
            // "id": "25335619-627a-4489-9b67-de2cec78598b",
            "gameNumber": 20067,
            // "createdAt": "2024-01-10T04:30:00.276Z",
            "status": "CLOSED",
            "gameResult": 36
          },
          {
            // "id": "6276b116-e2f3-476e-8302-7f5136fb750f",
            "gameNumber": 20066,
            // "createdAt": "2024-01-10T04:26:00.253Z",
            "status": "CLOSED",
            "gameResult": 3
          },
          {
            // "id": "c96085b2-96c6-4db9-9833-b6e13c5208aa",
            "gameNumber": 20065,
            // "createdAt": "2024-01-10T04:22:00.251Z",
            "status": "CLOSED",
            "gameResult": 16
          },
          {
            // "id": "75005d41-493b-4003-874b-6f7cfe5ea4f5",
            "gameNumber": 20064,
            // "createdAt": "2024-01-10T04:18:00.275Z",
            "status": "CLOSED",
            "gameResult": 8
          },
          {
            // "id": "30eb9c91-079d-4d18-90c4-106055eb2732",
            "gameNumber": 20063,
            // "createdAt": "2024-01-10T04:14:00.244Z",
            "status": "CLOSED",
            "gameResult": 15
          },
          {
            // "id": "4a6200e2-c85c-4e5d-906b-4d40e8c411c8",
            "gameNumber": 20062,
            // "createdAt": "2024-01-10T04:10:00.248Z",
            "status": "CLOSED",
            "gameResult": 6
          },
          {
            // "id": "94fabb98-9964-4042-85e2-ce27c0dda1fe",
            "gameNumber": 20061,
            // "createdAt": "2024-01-10T04:06:00.250Z",
            "status": "CLOSED",
            "gameResult": 25
          },
          {
            // "id": "7fdf7b50-a9ba-4aed-b7fc-99df0fca99ea",
            "gameNumber": 20060,
            // "createdAt": "2024-01-10T04:02:00.251Z",
            "status": "CLOSED",
            "gameResult": 34
          },
          {
            // "id": "cf6e5491-7386-4c3d-be62-049aef7a14f0",
            "gameNumber": 20059,
            // "createdAt": "2024-01-10T03:58:00.237Z",
            "status": "CLOSED",
            "gameResult": 20
          },
          {
            // "id": "7b8cf45e-b2b9-443e-942a-6a16e978425c",
            "gameNumber": 20058,
            // "createdAt": "2024-01-10T03:54:00.231Z",
            "status": "CLOSED",
            "gameResult": 27
          },
          {
            // "id": "a6fa7d6b-c291-462a-9a0e-d46180f2324d",
            "gameNumber": 20057,
            // "createdAt": "2024-01-10T03:50:00.266Z",
            "status": "CLOSED",
            "gameResult": 20
          },
          {
            // "id": "7c747eac-f569-453b-8bcf-d452049ced64",
            "gameNumber": 20056,
            // "createdAt": "2024-01-10T03:46:00.172Z",
            "status": "CLOSED",
            "gameResult": 5
          },
          {
            // "id": "7b6af825-4e86-44fd-b1a7-ba2110e405a0",
            "gameNumber": 20055,
            // "createdAt": "2024-01-10T03:42:00.163Z",
            "status": "CLOSED",
            "gameResult": 32
          },
          {
            // "id": "e40bbe38-a01b-4a1c-bc41-2b3c3a14bfb2",
            "gameNumber": 20054,
            // "createdAt": "2024-01-10T03:38:00.149Z",
            "status": "CLOSED",
            "gameResult": 26
          },
          {
            // "id": "aae680d9-3e65-4fed-a32d-e0bb48330102",
            "gameNumber": 20053,
            // "createdAt": "2024-01-10T03:34:00.141Z",
            "status": "CLOSED",
            "gameResult": 31
          },
          {
            // "id": "26368eea-a297-48c6-999e-761174256ce3",
            "gameNumber": 20052,
            // "createdAt": "2024-01-10T03:30:00.178Z",
            "status": "CLOSED",
            "gameResult": 27
          },
          {
            // "id": "99e2649f-5a3f-4c55-ad2e-4fdefb6f2ff2",
            "gameNumber": 20051,
            // "createdAt": "2024-01-10T03:26:00.147Z",
            "status": "CLOSED",
            "gameResult": 15
          },
          {
            // "id": "75498c74-3030-4b79-81c6-6b130ce20008",
            "gameNumber": 20050,
            // "createdAt": "2024-01-10T03:22:00.162Z",
            "status": "CLOSED",
            "gameResult": 0
          },
          {
            // "id": "551202ce-7186-487a-8af5-2ec0a963d4a4",
            "gameNumber": 20049,
            // "createdAt": "2024-01-10T03:18:00.154Z",
            "status": "CLOSED",
            "gameResult": 20
          },
          {
            // "id": "dcd28ef1-4468-4535-9980-fd2673f3849a",
            "gameNumber": 20048,
            // "createdAt": "2024-01-10T03:14:00.156Z",
            "status": "CLOSED",
            "gameResult": 33
          },
          {
            // "id": "c9855f0f-08d6-4bb5-8712-041370f71cec",
            "gameNumber": 20047,
            // "createdAt": "2024-01-10T03:10:00.162Z",
            "status": "CLOSED",
            "gameResult": 31
          },
          {
            // "id": "684f0a11-e4fb-4afc-a628-3ffb19d1ec1b",
            "gameNumber": 20046,
            // "createdAt": "2024-01-10T03:06:00.144Z",
            "status": "CLOSED",
            "gameResult": 30
          },
          {
            // "id": "22771648-da39-4f0e-8ea3-dfafe0d518a0",
            "gameNumber": 20045,
            // "createdAt": "2024-01-10T03:02:00.412Z",
            "status": "CLOSED",
            "gameResult": 14
          },
          {
            // "id": "5fe7638a-ec0b-4b80-8bb2-9c76447d1718",
            "gameNumber": 20044,
            // "createdAt": "2024-01-10T02:58:00.170Z",
            "status": "CLOSED",
            "gameResult": 29
          },
          {
            // "id": "4e60ac52-826e-458d-96b0-9aa7c073d646",
            "gameNumber": 20043,
            // "createdAt": "2024-01-10T02:54:00.159Z",
            "status": "CLOSED",
            "gameResult": 30
          },
          {
            // "id": "ab115a83-c646-45ac-9160-e4c78a2575d0",
            "gameNumber": 20042,
            // "createdAt": "2024-01-10T02:50:00.163Z",
            "status": "CLOSED",
            "gameResult": 12
          },
          {
            // "id": "696ecf1a-ee0f-4cc6-8631-45e93b166032",
            "gameNumber": 20041,
            // "createdAt": "2024-01-10T02:46:00.161Z",
            "status": "CLOSED",
            "gameResult": 1
          },
          {
            // "id": "e19c5e67-0b3b-4479-aa3d-babdc6af4d76",
            "gameNumber": 20040,
            // "createdAt": "2024-01-10T02:42:00.160Z",
            "status": "CLOSED",
            "gameResult": 34
          },
          {
            // "id": "83ce11a3-b7ff-4aab-869c-ef461b6120a7",
            "gameNumber": 20039,
            // "createdAt": "2024-01-10T02:38:00.155Z",
            "status": "CLOSED",
            "gameResult": 5
          },
          {
            // "id": "feec3901-bf75-40bf-9983-f50e573c0938",
            "gameNumber": 20038,
            // "createdAt": "2024-01-10T02:34:00.172Z",
            "status": "CLOSED",
            "gameResult": 23
          },
          {
            // "id": "49f5db25-d1bd-4574-88ff-8d5f01a13a3d",
            "gameNumber": 20037,
            // "createdAt": "2024-01-10T02:30:00.165Z",
            "status": "CLOSED",
            "gameResult": 35
          },
          {
            // "id": "3427830d-ef78-4f26-b358-43d354e43898",
            "gameNumber": 20036,
            // "createdAt": "2024-01-10T02:26:00.170Z",
            "status": "CLOSED",
            "gameResult": 2
          },
          {
            // "id": "3293be6c-9c3c-4f98-b298-bcb310d85992",
            "gameNumber": 20035,
            // "createdAt": "2024-01-10T02:22:00.158Z",
            "status": "CLOSED",
            "gameResult": 0
          },
          {
            // "id": "48cbeb18-dad3-4d33-956f-5a819ef1f4a5",
            "gameNumber": 20034,
            // "createdAt": "2024-01-10T02:18:00.156Z",
            "status": "CLOSED",
            "gameResult": 36
          },
          {
            // "id": "e5ac9767-786e-4e24-9902-7cbfa2bd7946",
            "gameNumber": 20033,
            // "createdAt": "2024-01-10T02:14:00.184Z",
            "status": "CLOSED",
            "gameResult": 20
          },
          {
            // "id": "499a9c02-6856-4788-8a79-46cbec2b1002",
            "gameNumber": 20032,
            // "createdAt": "2024-01-10T02:10:00.188Z",
            "status": "CLOSED",
            "gameResult": 18
          },
          {
            // "id": "7a9be4f6-7d8d-42ec-941e-c76ebaf2c37d",
            "gameNumber": 20031,
            // "createdAt": "2024-01-10T02:06:00.158Z",
            "status": "CLOSED",
            "gameResult": 5
          },
          {
            // "id": "14693def-dffd-4888-8784-a01735076d35",
            "gameNumber": 20030,
            // "createdAt": "2024-01-10T02:02:00.418Z",
            "status": "CLOSED",
            "gameResult": 7
          },
          {
            // "id": "8cacf6e2-ba7c-41b6-9be2-ca5baced8e35",
            "gameNumber": 20029,
            // "createdAt": "2024-01-10T01:58:00.161Z",
            "status": "CLOSED",
            "gameResult": 13
          },
          {
            // "id": "249d8e23-adb1-4269-95d3-8c231c406072",
            "gameNumber": 20028,
            // "createdAt": "2024-01-10T01:54:00.157Z",
            "status": "CLOSED",
            "gameResult": 2
          },
          {
            // "id": "6bab04a3-e35e-4893-8b7f-5dcba8ad46a3",
            "gameNumber": 20027,
            // "createdAt": "2024-01-10T01:50:00.164Z",
            "status": "CLOSED",
            "gameResult": 4
          },
          {
            // "id": "da6bcfeb-6f0f-440d-8a53-5d8745d26b54",
            "gameNumber": 20026,
            // "createdAt": "2024-01-10T01:46:00.150Z",
            "status": "CLOSED",
            "gameResult": 28
          },
          {
            // "id": "8f035f35-e8ef-454b-b42e-af04f89727fe",
            "gameNumber": 20025,
            // "createdAt": "2024-01-10T01:42:00.147Z",
            "status": "CLOSED",
            "gameResult": 19
          },
          {
            // "id": "1d40b105-39ba-4a8f-96db-4456b30b2fff",
            "gameNumber": 20024,
            // "createdAt": "2024-01-10T01:38:00.161Z",
            "status": "CLOSED",
            "gameResult": 36
          },
          {
            // "id": "7f425e0a-0e27-47f6-a2d8-35bd57d84c65",
            "gameNumber": 20023,
            // "createdAt": "2024-01-10T01:34:00.241Z",
            "status": "CLOSED",
            "gameResult": 29
          },
          {
            // "id": "c169c366-f165-473c-a12f-c18b4ba40c98",
            "gameNumber": 20022,
            // "createdAt": "2024-01-10T01:30:00.168Z",
            "status": "CLOSED",
            "gameResult": 25
          },
          {
            // "id": "7c63e067-bafd-4ed3-a5ff-65d12bce0692",
            "gameNumber": 20021,
            // "createdAt": "2024-01-10T01:26:00.161Z",
            "status": "CLOSED",
            "gameResult": 16
          },
          {
            // "id": "2ff310b0-d889-4310-8368-3a03957ede05",
            "gameNumber": 20020,
            // "createdAt": "2024-01-10T01:22:00.143Z",
            "status": "CLOSED",
            "gameResult": 10
          },
          {
            // "id": "07c5b17f-c1af-4361-8296-0df62ba09575",
            "gameNumber": 20019,
            // "createdAt": "2024-01-10T01:18:00.210Z",
            "status": "CLOSED",
            "gameResult": 16
          },
          {
            // "id": "c4be70b9-faf9-4923-a61a-68a71457b03b",
            "gameNumber": 20018,
            // "createdAt": "2024-01-10T01:14:00.159Z",
            "status": "CLOSED",
            "gameResult": 11
          },
          {
            // "id": "4c549f54-d301-41fb-8fce-85207ec5c740",
            "gameNumber": 20017,
            // "createdAt": "2024-01-10T01:10:00.163Z",
            "status": "CLOSED",
            "gameResult": 9
          },
          {
            // "id": "0926ffc3-94f5-455f-bb32-1eb4984ce3de",
            "gameNumber": 20016,
            // "createdAt": "2024-01-10T01:06:00.167Z",
            "status": "CLOSED",
            "gameResult": 31
          },
          {
            // "id": "0d3b102f-debf-4d54-bf88-151db3cbedcb",
            "gameNumber": 20015,
            // "createdAt": "2024-01-10T01:02:00.159Z",
            "status": "CLOSED",
            "gameResult": 3
          },
          {
            // "id": "e16511a8-7832-4204-a186-80425958f0e7",
            "gameNumber": 20014,
            // "createdAt": "2024-01-10T00:58:00.160Z",
            "status": "CLOSED",
            "gameResult": 13
          },
          {
            // "id": "a14e33b5-ad4e-4be9-a6e1-88773be8badb",
            "gameNumber": 20013,
            // "createdAt": "2024-01-10T00:54:00.158Z",
            "status": "CLOSED",
            "gameResult": 0
          },
          {
            // "id": "5f988fc7-457a-4ae6-bd90-b53280f4ad9c",
            "gameNumber": 20012,
            // "createdAt": "2024-01-10T00:50:00.169Z",
            "status": "CLOSED",
            "gameResult": 31
          },
          {
            // "id": "b7c2ef4e-e816-46e1-b75a-c54bd0b6e355",
            "gameNumber": 20011,
            // "createdAt": "2024-01-10T00:46:00.157Z",
            "status": "CLOSED",
            "gameResult": 20
          },
          {
            // "id": "53f6f7da-d45c-47c3-be3a-8171304ceea6",
            "gameNumber": 20010,
            // "createdAt": "2024-01-10T00:42:00.138Z",
            "status": "CLOSED",
            "gameResult": 15
          },
          {
            // "id": "33eaff1d-bd34-4789-96b4-d08ede26d5ec",
            "gameNumber": 20009,
            // "createdAt": "2024-01-10T00:38:00.148Z",
            "status": "CLOSED",
            "gameResult": 4
          },
          {
            // "id": "eefa9d9c-0cd6-4b9c-b8e6-6527f613b85f",
            "gameNumber": 20008,
            // "createdAt": "2024-01-10T00:34:00.157Z",
            "status": "CLOSED",
            "gameResult": 14
          },
          {
            // "id": "4ad57886-75d8-4d6c-9f8e-4e59764d7ca8",
            "gameNumber": 20007,
            // "createdAt": "2024-01-10T00:30:00.153Z",
            "status": "CLOSED",
            "gameResult": 14
          },
          {
            // "id": "b23cfa74-dec2-4caa-8d7b-3a361e911b32",
            "gameNumber": 20006,
            // "createdAt": "2024-01-10T00:26:00.144Z",
            "status": "CLOSED",
            "gameResult": 25
          },
          {
            // "id": "5dc32597-b1fa-4e32-b14b-01b5a14d5160",
            "gameNumber": 20005,
            // "createdAt": "2024-01-10T00:22:00.178Z",
            "status": "CLOSED",
            "gameResult": 16
          },
          {
            // "id": "8684c39f-f15f-45be-a618-6f08e1e8e2f6",
            "gameNumber": 20004,
            // "createdAt": "2024-01-10T00:18:00.153Z",
            "status": "CLOSED",
            "gameResult": 20
          },
          {
            // "id": "a1646018-1960-48b4-91a6-b021d48fe366",
            "gameNumber": 20003,
            // "createdAt": "2024-01-10T00:14:00.152Z",
            "status": "CLOSED",
            "gameResult": 31
          },
          {
            // "id": "1bc1cfe2-3d81-4cb8-894c-8771bcd0ac70",
            "gameNumber": 20002,
            // "createdAt": "2024-01-10T00:10:00.225Z",
            "status": "CLOSED",
            "gameResult": 10
          },
          {
            // "id": "5139ec78-4a05-4e48-a8d8-f60923a4b140",
            "gameNumber": 20001,
            // "createdAt": "2024-01-10T00:06:00.134Z",
            "status": "CLOSED",
            "gameResult": 6
          },
          {
            // "id": "9c1eecc7-f26d-48da-914a-1ccd48fb7302",
            "gameNumber": 20000,
            // "createdAt": "2024-01-10T00:02:00.264Z",
            "status": "CLOSED",
            "gameResult": 16
          },
          {
            // "id": "35e29afa-0954-4b5d-803b-f00a37c93144",
            "gameNumber": 20359,
            // "createdAt": "2024-01-09T23:58:00.146Z",
            "status": "CLOSED",
            "gameResult": 24
          },
          {
            // "id": "cc1bc308-73c8-4518-82af-87a89f2da095",
            "gameNumber": 20358,
            // "createdAt": "2024-01-09T23:54:00.149Z",
            "status": "CLOSED",
            "gameResult": 1
          },
          {
            // "id": "8a289555-faac-4d79-b3b4-8221c9e2ab58",
            "gameNumber": 20357,
            // "createdAt": "2024-01-09T23:50:00.189Z",
            "status": "CLOSED",
            "gameResult": 30
          },
          {
            // "id": "e94cc897-c8a2-4f35-9c9e-c103f5f638f8",
            "gameNumber": 20356,
            // "createdAt": "2024-01-09T23:46:00.193Z",
            "status": "CLOSED",
            "gameResult": 9
          },
          {
            // "id": "a438f2bd-06a3-476a-a7cf-a9483cee50c6",
            "gameNumber": 20355,
            // "createdAt": "2024-01-09T23:42:00.154Z",
            "status": "CLOSED",
            "gameResult": 29
          },
          {
            // "id": "72edb9b9-2988-4f46-9cf1-17610c234de6",
            "gameNumber": 20354,
            // "createdAt": "2024-01-09T23:38:00.157Z",
            "status": "CLOSED",
            "gameResult": 13
          },
          {
            // "id": "42e217eb-d65e-498b-a534-c5ca33d35798",
            "gameNumber": 20353,
            // "createdAt": "2024-01-09T23:34:00.159Z",
            "status": "CLOSED",
            "gameResult": 28
          },
          {
            // "id": "447068ab-1602-40e2-90b0-782d6b2e7945",
            "gameNumber": 20352,
            // "createdAt": "2024-01-09T23:30:00.207Z",
            "status": "CLOSED",
            "gameResult": 21
          },
          {
            // "id": "1f9d1efc-1295-481b-afc4-ea14035e6419",
            "gameNumber": 20351,
            // "createdAt": "2024-01-09T23:26:00.203Z",
            "status": "CLOSED",
            "gameResult": 19
          },
          {
            // "id": "f51c53d0-6a7b-46a3-bc46-219ca7834d03",
            "gameNumber": 20350,
            // "createdAt": "2024-01-09T23:22:00.193Z",
            "status": "CLOSED",
            "gameResult": 6
          },
          {
            // "id": "81dc0828-88be-492c-8942-b34ef9515795",
            "gameNumber": 20349,
            // "createdAt": "2024-01-09T23:18:00.149Z",
            "status": "CLOSED",
            "gameResult": 4
          },
          {
            // "id": "84338bfd-c9d8-486e-b986-54b2a51996e8",
            "gameNumber": 20348,
            // "createdAt": "2024-01-09T23:14:00.155Z",
            "status": "CLOSED",
            "gameResult": 35
          },
          {
            // "id": "138a1890-dd17-4dc4-b2d2-c4949fccfb58",
            "gameNumber": 20347,
            // "createdAt": "2024-01-09T23:10:00.175Z",
            "status": "CLOSED",
            "gameResult": 16
          },
          {
            // "id": "51393f3c-1f0a-4364-9b89-b2ca25bb32b2",
            "gameNumber": 20346,
            // "createdAt": "2024-01-09T23:06:00.145Z",
            "status": "CLOSED",
            "gameResult": 1
          },
          {
            // "id": "ae036e19-53b6-444d-bed5-574af9d3e347",
            "gameNumber": 20345,
            // "createdAt": "2024-01-09T23:02:00.158Z",
            "status": "CLOSED",
            "gameResult": 34
          },
          {
            // "id": "72b21eeb-9800-44d8-8d49-e3584347b261",
            "gameNumber": 20344,
            // "createdAt": "2024-01-09T22:58:00.225Z",
            "status": "CLOSED",
            "gameResult": 12
          },
          {
            // "id": "ec22a4a8-490b-4078-b615-a65cadbe090a",
            "gameNumber": 20343,
            // "createdAt": "2024-01-09T22:54:00.154Z",
            "status": "CLOSED",
            "gameResult": 18
          },
          {
            // "id": "9a3ae339-3a5f-41cb-a59f-b79caa2de048",
            "gameNumber": 20342,
            // "createdAt": "2024-01-09T22:50:00.172Z",
            "status": "CLOSED",
            "gameResult": 21
          },
          {
            // "id": "45b2cd87-fd8a-4cb6-aae3-bbd89e0e8e12",
            "gameNumber": 20341,
            // "createdAt": "2024-01-09T22:46:00.164Z",
            "status": "CLOSED",
            "gameResult": 23
          },
          {
            // "id": "cf0d28b3-25c7-4cf5-9891-b65f05bf3e71",
            "gameNumber": 20340,
            // "createdAt": "2024-01-09T22:42:00.157Z",
            "status": "CLOSED",
            "gameResult": 21
          },
          {
            // "id": "ab6cdffd-7d88-4648-ae7c-11c4bf92b4b9",
            "gameNumber": 20339,
            // "createdAt": "2024-01-09T22:38:00.196Z",
            "status": "CLOSED",
            "gameResult": 17
          },
          {
            // "id": "70f909e6-5893-4ac4-9338-e4df68851f76",
            "gameNumber": 20338,
            // "createdAt": "2024-01-09T22:34:00.182Z",
            "status": "CLOSED",
            "gameResult": 30
          },
          {
            // "id": "440f48d1-331f-4fe2-8d72-2f63184aab52",
            "gameNumber": 20337,
            // "createdAt": "2024-01-09T22:30:00.188Z",
            "status": "CLOSED",
            "gameResult": 12
          },
          {
            // "id": "ea6d2102-5dc8-4cf1-b7be-fd21e4feb94b",
            "gameNumber": 20336,
            // "createdAt": "2024-01-09T22:26:00.157Z",
            "status": "CLOSED",
            "gameResult": 0
          },
          {
            // "id": "016bb35d-4d30-4abe-bfad-f8005ca794e2",
            "gameNumber": 20335,
            // "createdAt": "2024-01-09T22:22:00.147Z",
            "status": "CLOSED",
            "gameResult": 19
          },
          {
            // "id": "d1f1980f-8a3a-4f27-a28a-4c7e8f150321",
            "gameNumber": 20334,
            // "createdAt": "2024-01-09T22:18:00.137Z",
            "status": "CLOSED",
            "gameResult": 6
          },
          {
            // "id": "a37f1c1d-67ce-4dff-855e-98217212a407",
            "gameNumber": 20333,
            // "createdAt": "2024-01-09T22:14:00.155Z",
            "status": "CLOSED",
            "gameResult": 15
          },
          {
            // "id": "e017b33b-7e71-48f8-bf7b-faa45788d0c3",
            "gameNumber": 20332,
            // "createdAt": "2024-01-09T22:10:00.143Z",
            "status": "CLOSED",
            "gameResult": 3
          },
          {
            // "id": "8d8b0b9a-3a82-4a56-9048-eb49d4f9ea6c",
            "gameNumber": 20331,
            // "createdAt": "2024-01-09T22:06:00.162Z",
            "status": "CLOSED",
            "gameResult": 33
          },
          {
            // "id": "4603c3fc-9f68-4f40-836f-7dfe6bf11db4",
            "gameNumber": 20330,
            // "createdAt": "2024-01-09T22:02:00.146Z",
            "status": "CLOSED",
            "gameResult": 5
          }
        ],
        "openGame": {
          // "id": "13126350-902f-4e22-aa81-74eda4a96be2",
          "gameNumber": 20171,
          // "createdAt": "2024-01-10T11:22:00.194Z",
          "status": "OPEN",
          "gameResult": null
        }
      })
  }
};

const calculateWiningNumbers = async (gameNumber, winningNumbers, winner) => {
  // const { gameNumber } = req.params;
  // let winningNumbers = [25, 62, 47, 8, 27, 36, 35, 10, 20, 30];
  // console.log(nums);
  const tickets = await Ticket.query().where("gameId", gameNumber);

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
      const numberOfSelections = pick.selection.length;
      console.log("nums:", pick.selection);
      console.log("nums:", pick.selection[0]);
      // Retrieve the odds table for the specific selection
      if (typeof pick?.selection[0] === "string") {
        if (winner === "evens" && pick?.selection[0] === winner) {
          ticketWin += pick.stake * 4;
        } else if (pick?.selection[0] === winner) {
          ticketWin += pick.stake * 2;
        }
      } else {
        const oddsEntry = oddsTable[numberOfSelections];

        const actualWinnings = countCorrectGuesses(
          pick.selection,
          winningNumbers
        );
        console.log("wins:", actualWinnings);
        if (oddsEntry && actualWinnings) {
          const modd = oddsEntry[actualWinnings - 1];
          console.log("mod", modd);
          // Calculate the stake for the current pick based on the odds table
          console.log("amount", pick.stake * Object.values(modd)[0]);
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

const getLast10Games = async () => {
  try {
    const games = await Game.query()
      .select('id', 'gameNumber', 'status', 'pickedNumbers')
      .where('status', 'done')
      .orderBy('time', 'desc')
      .limit(10);

    const formattedGames = games.map((game) => {
      const { id, gameNumber, status, pickedNumbers } = game;
      const results = JSON.parse(pickedNumbers)?.selection.map((item) => ({ value: item }));
      return { id, gameNumber, status, results };
    });
    // console.log(formattedGames);

    return formattedGames
  } catch (error) {
    console.error(error);
    return [];
  }
};

module.exports = GameController;
