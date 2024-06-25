const { getTodayShopReport } = require("../controllers/DailyReportController");
const Ticket = require("../models/slip");
const crypto = require("crypto");
const logger = require('../logger');
const { log } = require("winston");
const oddsTable = require("../odd/kiron");

const generateRandomNumbersKeno = async (gameNumber, rtp, shopId) => {
  const tickets = await Ticket.query()
    .where("gameId", gameNumber)
    .whereNot("status", "canceled");

  // console.log(tickets)
  if (!tickets.length) {
    const drawnnumber = [];

    while (drawnnumber.length < 20) {
      const randomNum = Math.floor(Math.random() * 80) + 1;

      // Ensure the number is not already in the array
      if (!drawnnumber.includes(randomNum)) {
        drawnnumber.push(randomNum);
      }
    }
    return drawnnumber;
  }

  const picks = [];
  // Iterate through each ticket
  for (const ticket of tickets) {
    const ticketPicks = JSON.parse(ticket.numberPick);

    for (const pick of ticketPicks) {
      let newpick = {};
      newpick.coinsPlaced = parseInt(pick.stake);
      newpick.selectedNumbers = pick.selection;
      newpick.oddType = ticket.oddType;
      picks.push(newpick);
    }
  }

  // console.log('currenration', currentRatio);
  // console.log('rtp', rtp);
  // console.log("picks", picks);
  if (!picks.length) {
    const drawnnumber = [];

    while (drawnnumber.length < 20) {
      const randomNum = Math.floor(Math.random() * 80) + 1;

      // Ensure the number is not already in the array
      if (!drawnnumber.includes(randomNum)) {
        drawnnumber.push(randomNum);
      }
    }
    return drawnnumber;
  }

  const scalingFactor = rtp / 100;

  const startTime = performance.now();
  let main = numbersWithPerc(picks, rtp);

  const endTime = performance.now();
  const elapsedTime = endTime - startTime;
  // logger.info(`*************************************************`)
  logger.info(`Total time elapsed: ${elapsedTime} milliseconds`);
  // console.log(main);
  // const drawnnumber = [];

  // while (drawnnumber.length < 20) {
  //   const randomNum = Math.floor(Math.random() * 80) + 1;

  //   // Ensure the number is not already in the array
  //   if (!drawnnumber.includes(randomNum)) {
  //     drawnnumber.push(randomNum);
  //   }
  // }
  // console.log('send result!');
  return main;
};

function numbersWithPerc(users, expectedPercentage) {
  if (users.length < 1) {
    console.log("users length can't be less than 1");
    return;
  }

  const totalPool = calculateTotalPoints(users);
  let counter = 0;
  let totalLoop = 0;
  let threshold = 5;
  let percentage = expectedPercentage;
  let memo = {};

  let winTicketThreshold = Math.floor(users.length * 0.2);
  while (totalLoop <= 500000) {
    counter++;
    const numbers = generateRandomNumbers();
    const numbersKey = numbers.join(',');

    if (memo[numbersKey]) {
      totalLoop++;
      continue;
    }

    let totalPoints = 0;
    let winningTickets = 0;

    users.forEach(user => {
      if (typeof user?.selectedNumbers[0] === "string") {
        const winner = findwinner(numbers);
        if (winner === "evens" && user?.selectedNumbers[0] === winner) {
          winningTickets++;
          totalPoints += user.coinsPlaced * 4;
        } else if (user?.selectedNumbers[0] === winner) {
          winningTickets++;
          totalPoints += user.coinsPlaced * 2;
        }
      } else {
        const matchNumbers = countMatchingNumbers(user, numbers);
        if (matchNumbers > 0) {
          const oddObj = oddsTable[user.oddType];
          const odd = oddObj[user.selectedNumbers.length][matchNumbers - 1][matchNumbers];
          totalPoints += odd * user.coinsPlaced;
          if (odd && odd > 0) {
            winningTickets++;
          }
        }
      }
    });

    const isRange = isProfitWithinRange(totalPool, totalPoints, percentage, threshold);

    if (isRange && (counter > 100000 || checkWinTicketThreshold(counter))) {
      console.log('winning', winningTickets);
      console.log('winning', counter);
      console.log('threshold', threshold);
      console.log('percentage', percentage);
      console.log("actual profit", ((totalPool - totalPoints) / totalPool) * 100, "%");
      console.log("---------------------------------------------------");
      calculatedNumbers = numbers;
      return calculatedNumbers;
    }

    function checkWinTicketThreshold(counter) {
      if (counter <= 50000) {
        winTicketThreshold = Math.floor(users.length * 0.2);
      } else if (counter <= 60000) {
        winTicketThreshold = Math.floor(users.length * 0.3);
      } else if (counter <= 70000) {
        winTicketThreshold = Math.floor(users.length * 0.4);
      } else if (counter <= 80000) {
        winTicketThreshold = Math.floor(users.length * 0.5);
      } else {
        return false;
      }
      return winningTickets <= winTicketThreshold;
    }

    // Adjusting the threshold increment logic and ensuring percentage doesn't go below minPercentage
    if (counter >= 100000) {
      if (threshold < 100 && (counter - 100000) % 1000 === 0) {
        threshold++;
        memo = {};
        // } else if (threshold >= 100 && percentage > -100) {
        //   percentage = Math.max(-100, percentage - 1);
      } else if (threshold >= 100) {
        if (expectedPercentage < 0) {
          // percentage = 0;
          percentage = Math.max(expectedPercentage, percentage - 1);
        } else {
          // percentage = 100;
          percentage = Math.max(0, percentage - 1);
        }
      }
      // }
    }

    memo[numbersKey] = totalPoints;
    totalLoop++;
  }

  console.error("Loop exited without finding a result");
  return null; // Add a return statement to indicate no result found
}

function generateRandomNumbers() {
  let numbers = [];
  while (numbers.length < 20) {
    var randomNumber = Math.floor(Math.random() * 80) + 1;
    if (numbers.indexOf(randomNumber) === -1) {
      numbers.push(randomNumber);
    }
  }

  return numbers;
}

function calculateTotalPoints(users) {
  var totalPoints = 0;
  users.forEach(function (user) {
    totalPoints += user.coinsPlaced;
  });
  return totalPoints;
}

function isProfitWithinRange(totalPool, totalPoints, expectedPercentage, threshold) {
  const currentPercentage = ((totalPool - totalPoints) / totalPool) * 100;
  let lower = expectedPercentage > 0 ? expectedPercentage - threshold : expectedPercentage;
  let upper = expectedPercentage + threshold;

  // Ensure the lower and upper bounds are within -100% to 100%
  if (lower < -100 || lower < expectedPercentage) {
    // lower = -100;
    lower = expectedPercentage;
  }
  if (upper > 100) {
    upper = 100;
  }
  return currentPercentage >= lower && currentPercentage <= upper;
}

function countMatchingNumbers(user, randomNumbers) {
  var count = 0;
  user.selectedNumbers.forEach(function (number) {
    if (randomNumbers.includes(number)) {
      count++;
    }
  });
  return count;
}

const findwinner = (numbers) => {
  let headsCount = 0;
  let tailsCount = 0;

  for (const num of numbers) {
    if (num <= 40) {
      // Assuming heads for even numbers, tails for odd numbers
      headsCount++;
    } else {
      tailsCount++;
    }
  }
  // const drawnNumber = this.generateRandomNumbers();
  return headsCount > tailsCount ? "heads" : tailsCount > headsCount ? "tails" : "evens";
}

module.exports = { generateRandomNumbersKeno };