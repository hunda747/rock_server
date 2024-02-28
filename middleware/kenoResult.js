const { generateShopReport, getTodayShopReport } = require("../controllers/DailyReportController");
const Ticket = require("../models/slip");
const crypto = require("crypto");

const generateRandomNumbersKeno = async (gameNumber, rtp, shopId, res) => {
  const tickets = await Ticket.query()
    .where("gameId", gameNumber)
    .whereNot("status", "canceled");

  const reportDate = new Date();
  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(reportDate);
  endOfDay.setHours(23, 59, 59, 999);

  const currentData = await getTodayShopReport(startOfDay, endOfDay, shopId);
  console.log('ggr:', currentData);

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
      newpick.coinsPlaced = (pick.stake * pick.odd) / pick.selection.length;
      newpick.selectedNumbers = pick.selection;
      picks.push(newpick);
    }
  }
  const currentRatio = parseInt(currentData.stake) ? ((parseInt(currentData.ggr) / parseInt(currentData.stake)) * 100).toFixed(2) : 0
  console.log('currenration', currentRatio);
  console.log('rtp', rtp);
  const scalingFactor = rtp / 100;
  // console.log("picks", picks);
  const actualScall = calculateDynamicScalingFactor(currentRatio, rtp)
  console.log('actual scall ', actualScall);
  // console.log("code", picks);
  const weight = calculateWeights(picks, actualScall);
  // const drawnnumber = generateUniqueWeightedNumbers(weight, 20);
  const drawnnumber = drawTwoUniqueNumbers(weight, 20);
  console.log("ወኢግህት", drawnnumber);

  // const drawnnumber = [];

  // while (drawnnumber.length < 20) {
  //   const randomNum = Math.floor(Math.random() * 80) + 1;

  //   // Ensure the number is not already in the array
  //   if (!drawnnumber.includes(randomNum)) {
  //     drawnnumber.push(randomNum);
  //   }
  // }

  return drawnnumber;
};

function calculateDynamicScalingFactor(currentRatio, targetRatio) {
  const tolerance = 3; // 5%
  const middleTolerance = 6; // 7.5%
  const largeTolerance = 7.5; // 10%

  if (currentRatio === targetRatio) {
    return targetRatio / 100;
  } else if (currentRatio > targetRatio && currentRatio <= targetRatio + tolerance) {
    return targetRatio / 100;
  } else if (currentRatio > targetRatio + tolerance && currentRatio <= targetRatio + middleTolerance) {
    return 0.01;
  } else if (currentRatio > targetRatio + middleTolerance && currentRatio <= targetRatio + largeTolerance) {
    return 0.001;
  } else if (currentRatio > targetRatio + largeTolerance) {
    return 0.0;  // Adjust as needed
  } else if (currentRatio < 0) {
    return 0.3;
  } else if (currentRatio < targetRatio && currentRatio >= targetRatio - tolerance) {
    return 0.1;
  } else if (currentRatio < targetRatio - tolerance && currentRatio >= targetRatio - middleTolerance) {
    return 0.15;
  } else if (currentRatio < targetRatio - middleTolerance && currentRatio >= targetRatio - largeTolerance) {
    return 0.2;  // Adjust as needed
  } else if (currentRatio < targetRatio - largeTolerance) {
    return 0.25;
  }

  // Default case, return a neutral scaling factor
  return 1.0;
}


function drawTwoUniqueNumbers(weights, num = 20) {
  const drawnNumbers = new Set();
  console.log("weight", weights);
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

function generateUniqueWeightedNumbers(data, numNumbers, maxPoolSize = 10 * numNumbers, maxConsecutive = 2) {
  // Create a larger pool of values with repeated elements based on weights
  const pool = [];
  for (const item of data) {
    for (let i = 0; i < item.weight; i++) {
      pool.push(item.value);
    }
  }

  // Shuffle the pool to further increase randomness (optional)
  // shuffle(pool); // Replace with your chosen shuffling algorithm

  // Ensure pool size is not larger than maxPoolSize
  if (pool.length > maxPoolSize) {
    pool.length = maxPoolSize;
  }

  const totalWeight = pool.length;
  const generatedNumbers = new Set();

  while (generatedNumbers.size < numNumbers) {
    const randomValue = Math.floor(crypto.randomInt(0, totalWeight));

    let valid = true;
    if (generatedNumbers.size > 0) {
      const lastNumber = Array.from(generatedNumbers)[generatedNumbers.size - 1];
      valid = Math.abs(lastNumber - pool[randomValue]) > maxConsecutive;
    }

    if (valid && !generatedNumbers.has(pool[randomValue])) {
      generatedNumbers.add(pool[randomValue]);
    }
  }

  return Array.from(generatedNumbers);
}


function calculateWeights(players, scalingFactor) {
  // Create an array to store all possible numbers
  const allNumbers = Array.from({ length: 80 }, (_, i) => i + 1);

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
    player.selectedNumbers.forEach((number, index) => {
      // console.log(index);
      if (!((player.selectedNumbers.length > 1 && index === 0) || (player.selectedNumbers.length > 3 && index === player.selectedNumbers.length - 1))) {
        coinsSum[number] = (coinsSum[number] || 0) + player.coinsPlaced;
      }
    });
  });
  console.log(coinsSum);

  // Calculate total coins placed
  const totalCoinsPlaced = Object.values(coinsSum).reduce(
    (sum, value) => sum + value,
    0
  );
  const maxCoins = Math.max(...Object.values(coinsSum));
  const baseWeight = totalCoinsPlaced / allNumbers.length;
  const scaledBaseWeight = baseWeight * scalingFactor;
  console.log(baseWeight);

  // Return weights for all numbers
  return allNumbers.map((number) => ({
    value: number,
    // weight: (coinsSum[number] ? baseWeight / (coinsSum[number]) : baseWeight)
    weight: Math.pow(
      coinsSum[number] ? scaledBaseWeight / coinsSum[number] : scaledBaseWeight,
      scalingFactor
    ),
    // weight: coinsSum[number]
    //   ? Math.exp(-scalingFactor * coinsSum[number] / maxCoins) * maxCoins
    //   : maxCoins,
  }));
}

module.exports = { generateRandomNumbersKeno };
