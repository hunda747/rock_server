const { getTodayShopReport, findActiveTickets } = require('../controllers/DailyReportController');
const Ticket = require('../models/slip');
const crypto = require('crypto')

const redNums = [
  "1",
  "3",
  "5",
  "7",
  "9",
  "12",
  "14",
  "16",
  "18",
  "19",
  "21",
  "23",
  "25",
  "27",
  "30",
  "32",
  "34",
  "36"
];
const blkNums = [
  "2",
  "4",
  "6",
  "8",
  "10",
  "11",
  "13",
  "15",
  "17",
  "20",
  "22",
  "24",
  "26",
  "28",
  "29",
  "31",
  "33",
  "35"
]

const oddNums = [
  "1",
  "3",
  "5",
  "7",
  "9",
  "11",
  "13",
  "15",
  "17",
  "19",
  "21",
  "23",
  "25",
  "27",
  "29",
  "31",
  "33",
  "35"
];
const evenNums = [
  "2",
  "4",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "18",
  "20",
  "22",
  "24",
  "26",
  "28",
  "30",
  "32",
  "34",
  "36"
]

const generateSpinRandomNumbers = async (gameNumber, rtp, shopId) => {
  const tickets = await Ticket.query()
    .where("gameId", gameNumber)
    .whereNot("status", "canceled");

  if (!tickets.length) {
    const drawnnumber = getRandomNumber();

    return drawnnumber;
  }

  const picks = [];

  const reportDate = new Date();
  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(reportDate);
  endOfDay.setHours(23, 59, 59, 999);
  const currentData = await getTodayShopReport(startOfDay, endOfDay, shopId);
  console.log('ggr:', currentData);

  const activespin = await findActiveTickets(gameNumber, shopId)
  console.log('actspin', activespin);
  // if (!tickets) {
  //   return false;
  // }

  // Iterate through each ticket
  for (const ticket of tickets) {
    const ticketPicks = JSON.parse(ticket.numberPick);

    for (const pick of ticketPicks) {
      // console.log(pick);
      if (pick.market !== 'Color' && pick.market !== "OddEven") {
        let newpick = {};
        newpick.coinsPlaced = pick.stake * pick.odd;
        newpick.selectedNumbers = pick.val;
        picks.push(newpick);
      } else if (pick.market == 'Color') {
        let newpick = {};
        newpick.coinsPlaced = pick.stake * pick.odd;
        newpick.selectedNumbers = pick.val[0] === "BLK" ? blkNums : redNums;
        picks.push(newpick);
      } else if (pick.market == 'OddEven') {
        console.log('even', pick.val[0]);
        let newpick = {};
        newpick.coinsPlaced = pick.stake * pick.odd;
        newpick.selectedNumbers = pick.val[0] === "ODD" ? oddNums : evenNums;
        picks.push(newpick);
      }
    }
  }

  const currentRatio = parseInt(currentData.stake) ? ((parseInt(currentData.ggr) / parseInt(currentData.stake)) * 100).toFixed(2) : 0;
  const expectPayout = (rtp / 100) * (parseInt(currentData.stake) + parseInt(activespin));
  const difPayout = parseInt(currentData.ggr) - expectPayout + parseInt(activespin);
  console.log(difPayout);
  const actialwin = parseInt(difPayout);
  console.log('want', actialwin);
  const coinsSum = {};
  for (let i = 0; i <= 36; i++) {
    coinsSum[i] = 0;
  }

  picks.forEach((player) => {
    player.selectedNumbers.forEach((number) => {
      coinsSum[number] = (coinsSum[number] || 0) + player.coinsPlaced;
    });
  });

  console.log('ick', coinsSum);
  const winchoos = getClosestEntryRandomly(coinsSum, actialwin > 0 ? actialwin : 0);
  console.log('true winner', winchoos);


  // const scalingFactor = rtp / 100;
  // console.log("picks", picks);
  // const weight = calculateWeights(picks, scalingFactor);
  // console.log(weight);
  // const drawnnumber = drawNumber(weight, currentData, rtp);
  // console.log((winchoos));
  // console.log((winchoos.value));
  const drawnnumber = (winchoos.index);
  // console.log("ወኢግህት", drawnnumber);

  // const drawnnumber = Math.floor(Math.random() * 37);

  // return picks;
  return drawnnumber;
};

function getClosestEntryRandomly(inputArray, x) {
  let possibleEntriesNegativeDifference;
  let possibleEntriesPositiveDifference;
  let smallestNegativeDiff;
  let smallestPositiveDiff;

  // Check for initial candidates with values less than or equal to x
  possibleEntriesNegativeDifference = [];
  for (let key in inputArray) {
    if (+key <= x && inputArray[key] <= x) {
      const diff = x - inputArray[key];
      if (diff >= 0 && (smallestNegativeDiff === undefined || diff < smallestNegativeDiff)) {
        smallestNegativeDiff = diff;
        possibleEntriesNegativeDifference = [[+key]];
      } else if (diff === smallestNegativeDiff) {
        possibleEntriesNegativeDifference.push([+key]);
      }
    }
  }

  // Check for other potential candidates with values above x
  smallestPositiveDiff = Infinity;
  possibleEntriesPositiveDifference = [];
  for (let key in inputArray) {
    if (+key > x) {
      continue;
    }

    const diff = inputArray[key] - x;
    if (diff >= 0 && (smallestPositiveDiff === undefined || diff < smallestPositiveDiff)) {
      smallestPositiveDiff = diff;
      possibleEntriesPositiveDifference = [[+key]];
    } else if (diff === smallestPositiveDiff) {
      possibleEntriesPositiveDifference.push([+key]);
    }
  }

  // Select the best candidate, preferring negative differences over positive ones
  let possibleEntries;
  if (smallestNegativeDiff !== undefined) {
    possibleEntries = possibleEntriesNegativeDifference;
  } else if (smallestPositiveDiff !== Infinity) {
    possibleEntries = possibleEntriesPositiveDifference;
  } else {
    // Edge case where all entries are higher than x
    if (x < inputArray['0']) {
      return { index: '0', value: inputArray['0'] };
    }

    // No candidate fits the criteria, unable to determine a result
    throw new Error('No matching entry was found.');
  }

  // Randomly select among the possible entries
  const randomIndex = Math.floor(Math.random() * possibleEntries.length);
  return { index: possibleEntries[randomIndex][0], value: inputArray[possibleEntries[randomIndex][0]] };
}

function getRandomNumber() {
  // Create a Uint32Array to store 32 bits of random data
  const randomArray = new Uint32Array(1);

  // Use crypto.getRandomValues to fill the array with random data
  crypto.getRandomValues(randomArray);

  // Extract the random value from the array
  const randomNumber = randomArray[0];

  // Scale the random value to fit the range [0, 36]
  const scaledNumber = randomNumber % 37;

  return scaledNumber;
}

function drawNumber(weights) {
  const totalWeight = weights.reduce((sum, { weight }) => sum + weight, 0);
  // console.log('we: ', weights)
  let randomValue = Math.random() * totalWeight;

  for (const { value, weight } of weights) {
    if (randomValue < weight) {
      return value;
    }
    randomValue -= weight;
  }

  // Fallback to the last number in case of rounding errors
  return weights[weights.length - 1].value;
}

function calculateWeights(players, scalingFactor) {
  const allNumbers = Array.from({ length: 37 }, (_, i) => i);

  if (!players.length) {
    return allNumbers.map((number) => ({
      value: number,
      weight: 1,
    }));
  }

  const coinsSum = {};

  players.forEach((player) => {
    player.selectedNumbers.forEach((number) => {
      coinsSum[number] = (coinsSum[number] || 0) + player.coinsPlaced;
    });
  });
  // console.log('coinplaced: ', coinsSum)

  const totalCoinsPlaced = Object.values(coinsSum).reduce((sum, value) => sum + value, 0);
  const maxCoins = Math.max(...Object.values(coinsSum));
  const baseWeight = totalCoinsPlaced / allNumbers.length;
  const scaledBaseWeight = baseWeight * scalingFactor;

  return allNumbers.map((number) => ({
    value: number,
    // weight: coinsSum[number] ? scaledBaseWeight / coinsSum[number] : scaledBaseWeight,
    // weight: Math.pow(coinsSum[number] ? scaledBaseWeight / coinsSum[number] : scaledBaseWeight, scalingFactor),
    weight: coinsSum[number]
      ? Math.exp(-scalingFactor * coinsSum[number] / maxCoins) * maxCoins
      : maxCoins,
  }));
}

module.exports = { generateSpinRandomNumbers };