const { getTodayShopReport } = require("../controllers/DailyReportController");
const Ticket = require("../models/slip");
const crypto = require("crypto");
const logger = require('../logger');
const { log } = require("winston");

const kiron = {
  1: [{ 1: 4 }],
  2: [{ 1: 0 }, { 2: 15 }],
  3: [{ 1: 0 }, { 2: 3 }, { 3: 35 }],
  4: [{ 1: 0 }, { 2: 1 }, { 3: 8 }, { 4: 100 }],
  5: [{ 1: 0 }, { 2: 1 }, { 3: 3 }, { 4: 15 }, { 5: 300 }],
  6: [{ 1: 0 }, { 2: 0 }, { 3: 1 }, { 4: 10 }, { 5: 70 }, { 6: 1800 }],
  7: [{ 1: 0 }, { 2: 0 }, { 3: 1 }, { 4: 6 }, { 5: 12 }, { 6: 120 }, { 7: 2150 }],
  8: [{ 1: 0 }, { 2: 0 }, { 3: 0 }, { 4: 6 }, { 5: 8 }, { 6: 68 }, { 7: 600 }, { 8: 3000 }],
  9: [{ 1: 0 }, { 2: 0 }, { 3: 0 }, { 4: 3 }, { 5: 6 }, { 6: 18 }, { 7: 120 }, { 8: 1800 }, { 9: 4200 }],
  10: [{ 1: 0 }, { 2: 0 }, { 3: 0 }, { 4: 2 }, { 5: 4 }, { 6: 12 }, { 7: 40 }, { 8: 400 }, { 9: 2500 }, { 10: 5000 }],
}

const generateRandomNumbersKeno = async (gameNumber, rtp, shopId) => {
  const tickets = await Ticket.query()
    .where("gameId", gameNumber)
    .whereNot("status", "canceled");

  const picks = [];
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
  // Iterate through each ticket
  for (const ticket of tickets) {
    const ticketPicks = JSON.parse(ticket.numberPick);

    for (const pick of ticketPicks) {
      let newpick = {};
      newpick.coinsPlaced = parseInt(pick.stake);
      newpick.selectedNumbers = pick.selection;
      picks.push(newpick);
    }
  }

  // console.log('currenration', currentRatio);
  // console.log('rtp', rtp);
  console.log("picks", picks);
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
  let main = numbersWithPerc(picks, 10);
  console.log(main);
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
    console.log("users length can't be less than 1")
    return
  }
  let counter = 1
  let found = false
  let calculatedNumbers = []
  const totalPool = calculateTotalPoints(users)
  let percentage = expectedPercentage
  let threshold = 5
  while (!found) {
    counter++
    const numbers = generateRandomNumbers()
    let totalPoints = 0
    users.forEach(user => {
      const matchNumbers = countMatchingNumbers(user, numbers)
      if (matchNumbers == 0) {
        return
      }
      // console.log(user,kiron[user.selectedNumbers.length],matchNumbers)
      const odd = kiron[user.selectedNumbers.length][matchNumbers - 1][matchNumbers]
      const totalUserPoints = odd * user.coinsPlaced
      totalPoints += totalUserPoints
    })
    const isRange = isProfitWithinRange(totalPool, totalPoints, percentage, threshold)

    if (isRange) {
      console.log("count is", counter)
      console.log("Total deposit:", totalPool);
      console.log("Total profit", totalPool - totalPoints);
      console.log("expected profit", percentage, "%")
      console.log("actual profit", ((totalPool - totalPoints) / totalPool) * 100, "%")
      console.log(numbers)
      calculatedNumbers = numbers
      return calculatedNumbers
    }
    if (counter >= 100000) {// check if 100k loops have passed and increase thresold
      if ((threshold + 1) <= 100) {
        threshold = threshold + 1
      } else {
        percentage = 0
        threshold = 0
      }
    }
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

function isProfitWithinRange(totalPool, totalPoints, expectedPercentage, threshold) {// percentage,threshold e.g 1,2,5,10,15,,20,30 t
  const currentPercentage = ((totalPool - totalPoints) / totalPool) * 100
  let lower = expectedPercentage - threshold
  let upper = expectedPercentage + threshold
  if (lower < 0) {
    lower = 0
  }
  if (upper > 100) {
    upper = 100
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

module.exports = { generateRandomNumbersKeno };
