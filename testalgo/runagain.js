const { acquireLockWithTimeout } = require("../middleware/lockaccuire");
const Game = require("../models/game");
const Shop = require("../models/shop");
const { Mutex } = require('async-mutex');
const gameMutex = new Mutex();
const { transaction } = require('objection');
const { calculateWiningNumbers } = require("../middleware/ticketWinnings");

// Define a function to draw the lottery results
const checkLotteryResults = async (req, res) => {
  const { reportDate, shopId } = req.body;
  // Your logic for drawing the lottery results goes here
  console.log('Drawing lottery results...');
  try {
    const release = await acquireLockWithTimeout(gameMutex, 4000);
    try {
      await transaction(Game.knex(), async (trx) => {
        const timezoneOffset = 0; // Set the time zone offset to 0 for UTC

        const startOfDay = new Date(`${reportDate}T00:00:00.000Z`);
        startOfDay.setMinutes(startOfDay.getMinutes() - timezoneOffset);

        const endOfDay = new Date(`${reportDate}T23:59:59.999Z`);
        endOfDay.setMinutes(endOfDay.getMinutes() - timezoneOffset);
        const activeGames = await Game.query().where("created_at", ">=", startOfDay).where("created_at", "<=", endOfDay).andWhere({ gameType: 'keno' }).andWhere({ shopId: shopId });
        activeGames.map(async (game) => {
          console.log('game: ', game);

          const numbers = await generateRandomNumbersKeno(game.id, 15, game.shopId);
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
          await game.$query().patch({
            pickedNumbers: JSON.stringify({ selection: numbers }),
            status: "done",
            winner: winner,
          });

          let openGame = await Game.query()
            .insert({
              gameType: "keno",
              gameNumber: game.gameNumber + 1,
              shopId: game.shopId
              // Add other fields as needed based on your table structure
              // Example: pickedNumbers, winner, time, status, etc.
            })

          calculateWiningNumbers(game.id, numbers, winner);
        })
        release();
      })
    } catch (err) {
      console.log(err);
    } finally {
      if (release) {
        release();
      }
    }
  } catch (error) {
    // Handle timeout error
    console.log('Failed to acquire lock within the specified timeout');
    // Handle other errors
    // throw error;
  }
  // Example: Generate random numbers or fetch results from an external source
}

module.exports = { checkLotteryResults }
