const Ticket = require("../models/slip");
const generateRandomNumbersKeno = async (gameNumber) => {
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
      newpick.coinsPlaced = pick.stake * pick.odd;
      newpick.selectedNumbers = pick.selection;
      picks.push(newpick);
    }
  }

  console.log("picks", picks);
  const weight = calculateWeights(picks);
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

function calculateWeights(players) {
  const scalingFactor = 0;
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
    player.selectedNumbers.forEach((number) => {
      coinsSum[number] = (coinsSum[number] || 0) + player.coinsPlaced;
    });
  });
  console.log(coinsSum);

  // Calculate total coins placed
  const totalCoinsPlaced = Object.values(coinsSum).reduce(
    (sum, value) => sum + value,
    0
  );
  const baseWeight = totalCoinsPlaced / allNumbers.length;
  const scaledBaseWeight = baseWeight * scalingFactor;
  console.log(baseWeight);

  // Return weights for all numbers
  return allNumbers.map((number) => ({
    value: number,
    weight: Math.pow(
      coinsSum[number] ? scaledBaseWeight / coinsSum[number] : scaledBaseWeight,
      scalingFactor
    ),
    // weight: (coinsSum[number] ? baseWeight / (coinsSum[number]) : baseWeight)
  }));
}

module.exports = { generateRandomNumbersKeno };
