const { getTodayShopReport, getCurrentDate } = require("../controllers/DailyReportController");
const Ticket = require("../models/slip");
const crypto = require("crypto");
const logger = require('../logger');
const { log } = require("winston");
const oddsTable = require("../odd/kiron");
const fs = require('fs');
const path = require('path');

const generateRandomNumbersKeno = async (gameNumber, rtp, shopId, date) => {
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

  const currentData = await getTodayShopReport(date || getCurrentDate(), shopId, 'keno');
  // const currentRatio = parseInt(currentData.stake) ? ((parseInt(currentData.ggr) / parseInt(currentData.stake)) * 100).toFixed(2) : 0
  console.log("currentData", currentData);
  const totalPool = calculateTotalPoints(picks);
  console.log("RTP", rtp);

  const scalingFactor = rtp / 100;

  let refactoredCommision = calculateCommission(currentData.stake, currentData.ggr, scalingFactor, totalPool, shopId);
  console.log("curr refactoredCommision", refactoredCommision);

  const startTime = performance.now();
  let main = numbersWithPerc(picks, (refactoredCommision * 100) || rtp, totalPool);

  const endTime = performance.now();
  const elapsedTime = endTime - startTime;
  // logger.info(`*************************************************`)
  // logger.info(`Total time elapsed: ${elapsedTime} milliseconds`);
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

const generate = () => {
  const oddsA = 1;
  const oddsB = 1;

  const randomNumber = Math.floor(Math.random() * (oddsA + oddsB));

  if (randomNumber < oddsA) {
    return true
  }
  return false
}

// Example usage:
let milestones = [
  { amount: 1000, bonus: 200 },
  { amount: 2000, bonus: 300 },
  // { amount: 3000, bonus: 400 },
  { amount: 4000, bonus: 500 },
  { amount: 6000, bonus: 600 },
  // { amount: 7000, bonus: 800 },
  { amount: 8000, bonus: 800 },
  { amount: 10000, bonus: 1000 },
  { amount: 12000, bonus: 1000 },
  { amount: 14000, bonus: 1000 },
  { amount: 16000, bonus: 1000 },
  { amount: 18000, bonus: 1000 },
  { amount: 20000, bonus: 1000 },
  { amount: 22000, bonus: 1000 },
  { amount: 24000, bonus: 1000 },
  { amount: 26000, bonus: 1000 },
  { amount: 28000, bonus: 1000 }
];

function calculateScalingFactor(totalBet, currentMilestone, nextMilestone) {
  let rangeStart = currentMilestone ? currentMilestone.amount : 0;
  let rangeEnd = nextMilestone.amount;
  let range = rangeEnd - rangeStart;
  let positionInRange = totalBet - rangeStart;

  // Quadratic scaling function
  let scalingFactor = Math.pow(positionInRange / range, 2);

  return scalingFactor;
}


function calculateCommission(totalBet, totalCommission, desiredCommissionRate, active, shopId) {
  // console.log("total bet", totalBet, "total com", totalCommission);
  let nextMilestone = milestones.find(milestone => totalBet < milestone.amount);
  console.log('next milestone', nextMilestone);
  console.log('active', active);
  // Calculate the expected bonus pool
  if (!nextMilestone) {
    let desireCommission = (totalBet + active) * desiredCommissionRate;
    let commisionDiffrent = desireCommission - totalCommission;

    let commision = (commisionDiffrent / active).toFixed(2);
    return Math.min(commision, 1)
  }
  let currentMilestoneIndex = milestones.indexOf(nextMilestone) - 1;
  let currentMilestone = currentMilestoneIndex >= 0 ? milestones[currentMilestoneIndex] : null;
  let scalingFactor = calculateScalingFactor(totalBet, currentMilestone, nextMilestone);

  expectedBonusPool = (totalBet * (nextMilestone.bonus / nextMilestone.amount)).toFixed(2) * scalingFactor;
  // console.log('expected pool', expectedBonusPool);

  let desiredCommission;
  if ((totalBet + active) >= nextMilestone.amount) {
    console.log("bonus round!!");
    desiredCommission = (totalBet + active) * desiredCommissionRate;
    logger.info(`bonus amount ${nextMilestone.amount} ${desiredCommission}`)
  } else {
    if (active < 80 && generate()) {
      return 90;
    } else {
      desiredCommission = (totalBet + active) * desiredCommissionRate + parseFloat(expectedBonusPool);
    }
  }
  // console.log('desiredCommission', desiredCommission);
  let commissionDifference = desiredCommission - totalCommission;
  // console.log('commission difference', commissionDifference);
  let commission = ((commissionDifference + active) / active).toFixed(2);

  // appendToFFFCSV(active, totalBet, totalCommission, desiredCommissionRate, expectedBonusPool, desiredCommission, commissionDifference, commission, shopId)

  return Math.min(parseFloat(commission), 1);
}

function calculateCommissionFF(totalBet, totalCommission, desiredCommissionRate, active) {
  let desireCommission = (totalBet + active) * desiredCommissionRate;
  let commisionDiffrent = desireCommission - totalCommission;

  let commision = (commisionDiffrent / active).toFixed(2);
  return Math.min(commision, 1)
}

function numbersWithPerc(users, expectedPercentage, totalPool) {
  if (users.length < 1) {
    console.log("users length can't be less than 1");
    return;
  }

  let counter = 0;
  let totalLoop = 0;
  let threshold = 5;
  let percentage = expectedPercentage;
  let memo = {};

  const strictLimit = 100000; // Define the limit for strict conditions

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

    if (isRange && (counter > strictLimit || checkWinTicketThreshold(counter))) {
      // if (isRange &&
      //   percentage === 100 ||
      //   (counter <= strictLimit && ((winningTickets === 1 || winningTickets === 2)) ||
      //     counter > strictLimit)
      // ) {
      console.log('winning', winningTickets);
      console.log('winning', counter);
      console.log('threshold', threshold);
      console.log('percentage', percentage);
      console.log("actual profit", ((totalPool - totalPoints) / totalPool) * 100, "%");
      console.log("---------------------------------------------------");
      calculatedNumbers = numbers;
      // Call the function to append to CSV
      // appendToCSV(winningTickets, counter, threshold, percentage, totalPool, totalPoints, expectedPercentage);

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
    if (counter >= strictLimit) {
      if (threshold < 100 && (counter - strictLimit) % 1000 === 0) {
        threshold++;
        memo = {};
        // } else if (threshold >= 100 && percentage > -100) {
        //   percentage = Math.max(-100, percentage - 1);
      } else if (threshold >= 100) {
        if (expectedPercentage < 0) {
          percentage = 100;
          // percentage = Math.max(expectedPercentage, percentage - 1);
        } else {
          percentage = 100;
          // percentage = Math.max(0, percentage - 1);
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

// Function to append results to CSV file
function appendToCSV(winningTickets, counter, threshold, percentage, totalPool, totalPoints, expectedPercentage) {
  // Define the CSV file path
  const filePath = path.join(__dirname, 'results7.csv');

  // Calculate the actual profit percentage
  const actualProfit = ((totalPool - totalPoints) / totalPool) * 100;

  // Prepare the data line
  const dataLine = `${totalPool},${winningTickets},${counter},${threshold},${percentage},${actualProfit},${expectedPercentage}\n`;

  // Check if file exists to add header only once
  if (!fs.existsSync(filePath)) {
    // Define the header line
    const header = 'totalPool,winningTickets,counter,threshold,percentage,actualProfit,expectedPercentage\n';
    // Write header and data line to the CSV file
    fs.writeFileSync(filePath, header + dataLine, { flag: 'a' });
  } else {
    // Append the data line to the CSV file
    fs.writeFileSync(filePath, dataLine, { flag: 'a' });
  }
}

// Function to append results to CSV file
function appendToFFFCSV(active, totalPoints, totalGGR, expectedPercentage, expectedBonusPool, desiredCommission, commissionDifference, commission, shopId) {
  // Define the CSV file path
  const filePath = path.join(__dirname, 'active4chess.csv');

  // Prepare the data line
  const dataLine = `${active},${totalPoints},${totalGGR},${expectedPercentage},${expectedBonusPool},${desiredCommission},${commissionDifference},${commission},${shopId}\n`;

  // Check if file exists to add header only once
  if (!fs.existsSync(filePath)) {
    // Define the header line
    const header = 'active,total,ggr,expectedPercentage,expectedBonusPool,desiredCommission,commissionDifference,commission,shopId\n';
    // Write header and data line to the CSV file
    fs.writeFileSync(filePath, header + dataLine, { flag: 'a' });
  } else {
    // Append the data line to the CSV file
    fs.writeFileSync(filePath, dataLine, { flag: 'a' });
  }
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