// controllers/gameController.js

const Game = require("../models/game");
const Ticket = require("../models/slip");
const Cashier = require("../models/cashier");
const knex = require("knex");
const oddsTable = require("../odd/kiron");
const { generateSpinRandomNumbers } = require("../middleware/spinResult");

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
        .andWhere("gameType", "keno")
        .orderBy("time", "desc")
        .first();

      if (!lastPlayedGame) {
        return res.status(404).json({ message: "No games played yet." });
      }

      // Update the current game with the drawn number
      const currentGame = await Game.query()
        .where("status", "playing")
        .andWhere("gameType", "keno")
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
        result: JSON.parse(lastPlayedGame.pickedNumbers)?.selection.map(
          (item) => ({ value: item })
        ),
        lastGame: lastPlayedGame
          ? { id: lastPlayedGame.id, gameNumber: lastPlayedGame.gameNumber }
          : null,
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
      const currentGame = await Game.query().where("id", gameNumber).andWhere('gameType', 'keno').first();

      if (!currentGame) {
        return res.status(404).json({ message: "No active games currently." });
      }
      // console.log("result:", currentGame);
      let drawnNumber;
      if (!currentGame.pickedNumbers) {
        // Assume you have a function to draw the number and update the database
        const numbers = await generateRandomNumbers(gameNumber);
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
        .orderBy("time", "desc")
        .offset(1)
        .first();

      let openGame;
      // Update the current game with the drawn number
      const newGame = await Game.query()
        .where("status", "playing")
        .andWhere("gameType", "keno")
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
      console.log('dd', drawnNumber);
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
        console.log("draw", drawn);
        resultObject = {
          err: "false",
          ...drawn?.reduce((acc, number, index) => {
            acc[index + 1] = number;
            return acc;
          }, {}) || drawnNumber,
          21: currentGame.gameNumber,
          22: currentGame.gameNumber, // Assuming gameId is what you want for "21" and "22"
          0: currentGame.gameType,
        };
      } else {
        console.log("draw", drawnNumber);
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

  // Controller
  getLastPlayedGameSpin: async (req, res) => {
    try {
      // Retrieve the last played game
      const lastPlayedGame = await Game.query()
        .where("status", "done")
        .andWhere("gameType", "spin")
        .orderBy("time", "desc")
        .first();

      if (!lastPlayedGame) {
        return res.status(404).json({ message: "No games played yet." });
      }

      // Update the current game with the drawn number
      const currentGame = await Game.query()
        .where("status", "playing")
        .andWhere("gameType", "spin")
        .orderBy("time", "desc")
        .first();

      let openGame;

      if (currentGame) {
        openGame = currentGame;
      } else {
        openGame = await Game.query()
          .insert({
            gameType: "spin",
            gameNumber: lastPlayedGame.gameNumber + 1,
            // Add other fields as needed based on your table structure
            // Example: pickedNumbers, winner, time, status, etc.
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
        recent: await getLast100Games(),
        // recent: lastPlayedGame.gameNumber,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error retrieving last played game:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  // Controller
  getCurrentGameResultSpin: async (req, res) => {
    const { gameNumber } = req.query;
    try {
      // Update the current game with the drawn number
      const currentGame = await Game.query()
        .where("id", gameNumber)
        .andWhere("gameType", "spin")
        .first();

      if (!currentGame) {
        return res.status(404).json({ message: "No active games currently." });
      }
      // console.log("result:", currentGame);
      let drawnNumber;
      if (!currentGame.pickedNumbers) {
        // Assume you have a function to draw the number and update the database
        drawnNumber = await generateSpinRandomNumbers(gameNumber)
        console.log('ddraw', drawnNumber);

        const winners = determineAllWinners(drawnNumber);
        console.log(winners);
        // Update the pickedNumbers field with the drawn number
        await currentGame.$query().patch({
          pickedNumbers: JSON.stringify({ selection: drawnNumber }),
          status: "done",
          winner: JSON.stringify(winners),
        });

        calculateSlipWiningNumbers(gameNumber, drawnNumber, winners);
      } else {
        // console.log('resultPA:', );
        drawnNumber = JSON.parse(currentGame?.pickedNumbers)?.selection;
      }
      // calculateWiningNumbers(drawnNumber, gameNumber);

      let openGame;
      // Update the current game with the drawn number
      const newGame = await Game.query()
        .where("status", "playing")
        .andWhere("gameType", "spin")
        .orderBy("time", "desc")
        .first();

      if (newGame) {
        openGame = newGame;
      } else {
        openGame = await Game.query()
          .insert({
            gameType: "spin",
            gameNumber: currentGame.gameNumber + 1,
            // Add other fields as needed based on your table structure
            // Example: pickedNumbers, winner, time, status, etc.
          })
          .returning("*");
      }

      // Construct the response in the specified format
      const response = {
        openGame: { id: openGame.id, gameNumber: openGame.gameNumber },
        result: {
          gameResult: drawnNumber,
          gameNumber: currentGame.gameNumber,
          id: currentGame.id,
        },
        recent: await getLast100Games(),
      };
      // Respond with the updated game data
      return res.status(200).json(response);
    } catch (error) {
      console.error("Error getting current game result:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },

  searchGame: async (req, res) => {
    try {
      const { gameType, date, eventId } = req.query;
      let result = [];
      if (!gameType) {
        return res.status(404).json({ error: "Missing game type" });
      }
      if (eventId) {
        result = await Game.query().where("gameNumber", eventId);
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

        result = await query;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
};

const generateRandomNumbers = async (gameNumber) => {
  // const tickets = await Ticket.query()
  //   .where("gameId", gameNumber)
  //   .whereNot("status", "canceled");

  // const picks = [];

  // // if (!tickets) {
  // //   return false;
  // // }

  // // Iterate through each ticket
  // for (const ticket of tickets) {
  //   const ticketPicks = JSON.parse(ticket.numberPick);

  //   for (const pick of ticketPicks) {
  //     let newpick = {};
  //     newpick.coinsPlaced = pick.stake;
  //     newpick.selectedNumbers = pick.selection;
  //     picks.push(newpick);
  //   }
  // }

  // console.log("picks", picks);
  // const weight = calculateWeights(picks);
  // const drawnnumber = drawTwoUniqueNumbers(weight, 20);
  // console.log("ወኢግህት", drawnnumber);

  const drawnnumber = [];

  while (drawnnumber.length < 20) {
    const randomNum = Math.floor(Math.random() * 80) + 1;

    // Ensure the number is not already in the array
    if (!drawnnumber.includes(randomNum)) {
      drawnnumber.push(randomNum);
    }
  }

  return drawnnumber;
};

function drawTwoUniqueNumbers(weights, num = 20) {
  const drawnNumbers = new Set();
  console.log('weight', weights)
  while (drawnNumbers.size < num) {
    const candidateNumber = weightedRandom(weights);

    // console.log("weight", candidateNumber);
    if (!drawnNumbers.has(candidateNumber)) {
      drawnNumbers.add(candidateNumber);
    }
  }
  return Array.from(drawnNumbers); // Ensure sorted order
}

function weightedRandom(weights) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight.weight, 0);
  const randomValue = Math.random() * totalWeight;

  let cumulativeWeight = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulativeWeight += weights[i].weight;
    if (randomValue <= cumulativeWeight) {
      return weights[i].value; // Return the selected number
    }
  }
}

function calculateWeights(players) {
  const scalingFactor = 0.2;
  // Create an array to store all possible numbers
  const allNumbers = Array.from({ length: 80 }, (_, i) => i + 1); // [1, 2, 3, 4, 5, 6]

  if (!players.length) {
    return allNumbers.map((number) => ({
      value: number,
      weight: 1, // Lower weight for selected numbers
    }));
  }
  // Initialize empty object to store total coins placed
  const coinsSum = {};

  // Iterate through players and count their bets
  players.forEach((player) => {
    player.selectedNumbers.forEach((number) => {
      coinsSum[number] =
        (coinsSum[number] || 0) +
        player.coinsPlaced / player.selectedNumbers.length;
    });
  });

  // Calculate total coins placed
  const totalCoinsPlaced = Object.values(coinsSum).reduce(
    (sum, value) => sum + value,
    0
  );

  // Calculate base weight (average coins placed per number)
  const baseWeight = totalCoinsPlaced / allNumbers.length;
  console.log(baseWeight);
  // Return weights for all numbers
  return allNumbers.map((number) => ({
    value: number,
    weight: (coinsSum[number] ? baseWeight / (coinsSum[number]) : baseWeight)
    // weight: (coinsSum[number] ? baseWeight / (coinsSum[number] * baseWeight) : baseWeight)
    // weight: (coinsSum[number] ? baseWeight / coinsSum[number] : baseWeight) * scalingFactor
    // weight: Math.pow((coinsSum[number] ? baseWeight / coinsSum[number] : baseWeight), scalingFactor)
    , // Lower weight for selected numbers
  }));
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
    )[0].netWinning;

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

  calculateCashierWinnings(gameNumber, tickets);
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
      const numberOfSelections = pick.val.length;
      console.log("nums:", pick.val);
      // console.log("nums:", pick.val[0]);
      // Retrieve the odds table for the specific selection
      if (pick.market === "OddEven") {
        if (pick?.val[0] === winner?.oddEven) {
          ticketWin += pick.stake * pick.odd;
        }
      } else if (pick.market === "Color") {
        if (pick?.val[0] === winner?.color) {
          ticketWin += pick.stake * pick.odd;
        }
      } else {
        console.log("numbers", winningNumbers);
        // if(pick.val.includes(winningNumbers)){
        if (pick.val.map(Number).includes(winningNumbers)) {
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

const getLast10Games = async () => {
  try {
    const games = await Game.query()
      .select("id", "gameNumber", "status", "pickedNumbers")
      .where("status", "done")
      .andWhere("gameType", "keno")
      .orderBy("time", "desc")
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

const getLast100Games = async () => {
  try {
    const games = await Game.query()
      .select("id", "gameNumber", "status", "pickedNumbers")
      .where("status", "done")
      .andWhere("gameType", "spin")
      .orderBy("time", "desc")
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
  allWinners.color = drawnColors[0];

  // Check oddEven option
  allWinners.oddEven = drawnNumber % 2 === 0 ? "EVN" : "ODD";

  return allWinners;
}

const numberToColorMap = {
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
  13: ["RLK", "blue"],
  14: ["RED", "yellow"],
  15: ["RLK", "orange"],
  16: ["RED", "purple"],
  17: ["RLK", "blue"],
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
  31: ["RLK", "yellow"],
  32: ["RED", "orange"],
  33: ["BLK", "purple"],
  34: ["RED", "blue"],
  35: ["BLK", "white"],
  36: ["RED", "pink"],
};

module.exports = GameController;

// ticket, stake, payout, unclamed, revoked, ggr, net balance
