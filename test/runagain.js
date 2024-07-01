const { acquireLockWithTimeout } = require("../utils/lockaccuire");
const Game = require("../models/game");
const Ticket = require("../models/slip");
const Shop = require("../models/shop");
const { Mutex } = require('async-mutex');
const gameMutex = new Mutex();
const { transaction } = require('objection');
const { calculateWiningNumbers } = require("../utils/resultFunction");
const { generateRandomNumbersKeno } = require("../middleware/kenoResultYaf");
const { generateDailyReport, generateDailyReportForShopTest } = require("../controllers/DailyReportController");
const { log } = require("winston");
const { INITIALCOMMISSIONRATE, MINIMUMCOMMISSION, CYCLELENGTH } = require("../utils/commonFunction");

// Define a function to draw the lottery results
const checkLotteryResults = async (req, res) => {
  const { reportDate, listShop } = req.body;
  // Your logic for drawing the lottery results goes here
  console.log('Drawing lottery results...');
  try {
    const release = await acquireLockWithTimeout(gameMutex, 4000);
    try {
      const timezoneOffset = 0; // Set the time zone offset to 0 for UTC
      const startOfDay = new Date(`${reportDate}T00:00:00.000Z`);
      startOfDay.setMinutes(startOfDay.getMinutes() - timezoneOffset);
      const endOfDay = new Date(`${reportDate}T23:59:59.999Z`);
      endOfDay.setMinutes(endOfDay.getMinutes() - timezoneOffset);

      const uniqueShopIds = await Game.query()
        .select('shopId')
        .where("created_at", ">=", startOfDay)
        .where("created_at", "<=", endOfDay)
        .andWhere({ gameType: 'keno' })
        .distinct('shopId');

      // Extract shopId values from the result set
      const shopIds = uniqueShopIds.map(record => record.shopId);
      console.log("unique", shopIds);
      res.status(200).json({ message: shopIds })
      for (const shopId of listShop) {
        for (let i = 0; i < 1; i++) {
          await transaction(Game.knex(), async (trx) => {
            console.log('shop', shopId, 'count', (i + 1));

            const activeGames = await Game.query().where("created_at", ">=", startOfDay).where("created_at", "<=", endOfDay).andWhere({ gameType: 'keno' }).andWhere({ shopId: shopId });
            console.log('game: ', activeGames.length);
            console.log(startOfDay);
            console.log(endOfDay);
            const updatedRowsCount = await Ticket.query()
              .patch({ status: 'active' })
              .where('shopId', shopId)
              .where("created_at", ">=", startOfDay).where("created_at", "<=", endOfDay)

            async function run() {
              let saveState;
              for (const game of activeGames) {
                try {
                  // console.log('------------------saved state---------------------');
                  // console.log(saveState);
                  const tickets = await Ticket.query()
                    .where("gameId", game.id);
                  console.log('game', game.id, tickets.length);
                  if (!tickets.length) {
                    continue;
                  }
                  // const findShop = await Shop.query().findById(shopId);
                  console.log('------------------------------------------');
                  console.log('tuc', game.gameNumber, game.shopId, tickets.length);
                  const numbers = await generateRandomNumbersKeno(game.id, 15, game.shopId, reportDate);

                  // console.log(numbers);
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

                  const winner =
                    headsCount > tailsCount
                      ? "heads"
                      : tailsCount > headsCount
                        ? "tails"
                        : "evens";

                  await game.$query().patch({
                    pickedNumbers: JSON.stringify({ selection: numbers }),
                    status: "done",
                    winner: winner,
                  });

                  await calculateWiningNumbers(game.id, numbers, winner);
                } catch (error) {
                  console.error(`Error processing game ${game.id}:`, error);
                }
              }
            }

            await run();

            release();
            const report = await generateDailyReportForShopTest(reportDate, shopId);
            console.log(report);
            report.count = i + 1;
            report.date = reportDate;
            report.shopId = shopId;
            saveCsv(report);
          })
        }
      }

      const generatedReport = await generateDailyReport(reportDate, res);
      // console.log(generatedReport);
      console.log("done");

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

const saveCsv = async (response) => {
  const fs = require('fs');

  // Loop through each response object and append it to the CSV file

  fs.access('testalgo.csv', fs.constants.F_OK, (err) => {
    if (err) {
      // If file doesn't exist, add the header row and the current response
      const header = 'Count,Date,Shop,Total Stake,Total GGR,Tickets,Unclaimed Count,Margin\n';
      const csvData = `${header}${response.count},${response.shopId},${response.date},${response.totalStake},${response.totalGGR},${response.tickets},${response.unclaimedCount},${((response.totalGGR / response.totalStake) * 100).toFixed(2)}\n`;

      fs.writeFile('testalgo.csv', csvData, (err) => {
        if (err) {
          console.error('Error writing to CSV file:', err);
        } else {
          console.log('CSV file created and data added successfully');
        }
      });
    }
  });

  const csvData = `${response.count},${response.shopId},${response.date},${response.totalStake},${response.totalGGR},${response.tickets},${response.unclaimedCount},${((response.totalGGR / response.totalStake) * 100).toFixed(2)}\n`;

  fs.appendFile('testalgo.csv', csvData, (err) => {
    if (err) {
      console.error('Error appending to CSV file:', err);
    }
  });

  console.log('CSV file updated successfully');
}

module.exports = { checkLotteryResults }
