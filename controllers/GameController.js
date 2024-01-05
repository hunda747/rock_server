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
          if (num % 2 === 0) {
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

module.exports = GameController;
