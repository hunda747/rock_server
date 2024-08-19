const cluster = require('cluster');
const os = require('os');
const express = require('express');
const app = express();

const cron = require('node-cron');
const Game = require('../models/game');
const Shop = require('../models/shop');
const { generateRandomNumbersKeno } = require('../middleware/kenoResultYaf');
const { calculateWiningNumbers } = require('../utils/resultFunction');
const { transaction } = require('objection');
const { checkRepeatNumber, getStartAndEndOfDay } = require('../utils/commonFunction');
const KENOLOCK = 'game_lock_keno'

const Queue = require('bull');
const resultQueue = new Queue(process.env.RESULT_QUEUE, {
  // const resultQueue = new Queue('resultQueueTest', {
  concurrency: 1,
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  settings: {
    // Use a distributed queue
    distributed: true,
    // Use a consistent hashing algorithm
    hash: 'sha256',
    concurrency: 1
  },
});
const argv = process.argv.slice(2);


// Scheduler that runs every 4 minutes
// cron.schedule('*/1 * * * *', () => {
//   scheduleGameResults();
//   console.log('Scheduled task executed to process active game results.');
// });

function calculateNextDrawTime(countdownMinutes = 4, shiftedStartMinutes = 3) {
  const currentTime = new Date();
  const currentMinutes = currentTime.getMinutes();
  const currentSeconds = currentTime.getSeconds();

  // Calculate the time difference from the shifted start time
  const timeDifference = currentMinutes >= shiftedStartMinutes
    ? currentMinutes - shiftedStartMinutes
    : 60 - (shiftedStartMinutes - currentMinutes);

  let nextDrawRemainingMinutes = countdownMinutes - (timeDifference % countdownMinutes);
  let nextDrawRemainingSeconds = (60 - currentSeconds) % 60;

  if (nextDrawRemainingSeconds !== 0) {
    nextDrawRemainingMinutes--;
  }

  const nextDrawRemainingTotalSeconds = nextDrawRemainingMinutes * 60 + nextDrawRemainingSeconds - 1;

  return nextDrawRemainingTotalSeconds;
}

function scheduleGameResults() {
  // if (isSchedulerRunning) {
  //   return; // Prevent multiple instances from running
  // }

  // isSchedulerRunning = true;

  const nextDrawTimeInSeconds = calculateNextDrawTime();
  const nextDrawTimeInMilliseconds = nextDrawTimeInSeconds * 1000;

  // Ensure that we only schedule if the time is positive
  if (nextDrawTimeInMilliseconds > 0) {
    console.log(`Next draw in ${nextDrawTimeInMilliseconds}ms ${parseInt(nextDrawTimeInMilliseconds / 60000)}:${nextDrawTimeInMilliseconds % 60}`);

    setTimeout(() => {
      // Fetch active games and add them to the queue
      console.log("fetch active games");
      fetchAndQueueActiveGames();

      scheduleGameResults();
    }, nextDrawTimeInMilliseconds);
  } else {
    console.log(`Invalid draw time calculated: ${nextDrawTimeInMilliseconds}. Recalculating.`);
    // Recursively call to find the correct time, but add a small delay to avoid a busy loop
    setTimeout(scheduleGameResults, 1000);
  }
}

async function fetchAndQueueActiveGames() {
  const { startOfDay, endOfDay } = getStartAndEndOfDay(0);
  const activeGames = await Game.query().where({ status: 'playing', gameType: 'keno' })
    .andWhere("created_at", ">=", startOfDay)
    .andWhere("created_at", "<=", endOfDay);
  // console.log("active game: ", activeGames.length);

  for (const game of activeGames) {
    console.log(`Master ${process.pid} is adding shop ${game.shopId} to queue`);
    const shop = await Shop.query().findById(game.shopId);
    console.log("added shop to queue ", game.shopId);
    if (shop) {
      resultQueue.add({
        gameId: game.id,
        shopId: game.shopId,
        shop
      });
    }
  }
}

resultQueue.on('completed', (job) => {
  const { gameId, shopId, shop } = job.data;
  console.log(`resultQueue completed with result `, shopId);
});

resultQueue.on('failed', (job, err) => {
  console.log(`resultQueue Job failed with error ${err}`);
});

async function processJobFromQueue() {
  resultQueue.process(async (job) => {
    console.log(`Worker ${process.pid} is processing job ${job.id}`);
    const { gameId, shopId, shop } = job.data;
    console.log("result for job for shop ", shopId);
    // Start a transaction
    return await transaction(Game.knex(), async (trx) => {
      const currentGame = await Game.query(trx).findById(gameId).forUpdate();

      if (currentGame && !currentGame.pickedNumbers) {
        const { numbers, winner } = await drawGameResult(trx, currentGame, shopId, shop);

        const newGameNumber = currentGame.gameNumber + 1;

        await checkRepeatNumber(trx, 'keno', shopId, newGameNumber, KENOLOCK);

        await Game.query(trx).insert({
          gameType: "keno",
          gameNumber: newGameNumber,
          shopId
        });

        return { numbers, winner };
      }
    });
  });
}

async function drawGameResult(trx, currentGame, shopId, findShop) {
  // Generate random numbers securely
  const numbers = await generateRandomNumbersKeno(currentGame.id, findShop.rtp, shopId);

  // Count heads and tails
  let headsCount = 0;
  let tailsCount = 0;
  for (const num of numbers) {
    if (num >= 1 && num <= 40) {
      headsCount++;
    } else if (num >= 41 && num <= 80) {
      tailsCount++;
    }
  }

  const winner = headsCount > tailsCount ? "heads" : "tails";

  // Update game with drawn numbers
  await currentGame.$query(trx).patch({
    pickedNumbers: JSON.stringify({ selection: numbers }),
    status: "done",
    winner: winner
  });

  // Calculate winning numbers
  calculateWiningNumbers(currentGame.id, numbers, winner, shopId);

  // Return the drawn numbers and winner
  return { numbers, winner };
}

async function checkIfGameInQueue(gameNumber, shopId) {
  // Get all jobs in the queue that are either waiting or active
  const jobs = await resultQueue.getJobs(['waiting', 'active']);
  // console.log("jobs", jobs);
  // Check if there is a job in the queue matching the given gameNumber and shopId
  for (let job of jobs) {
    if (job.data.gameId === gameNumber && job.data.shopId === shopId) {
      return true; // Game is in the queue and being processed
    }
  }

  return false; // Game is not in the queue
}

module.exports = { scheduleGameResults, checkIfGameInQueue, processJobFromQueue }