const Ticket = require('../models/slip');

const generateSpinRandomNumbers = async (gameNumber) => {
  const tickets = await Ticket.query()
    .where("gameId", gameNumber)
    .whereNot("status", "canceled");

  const picks = [];

  // if (!tickets) {
  //   return false;
  // }

  // Iterate through each ticket
  for (const ticket of tickets) {
    const ticketPicks = JSON.parse(ticket.numberPick);

    for (const pick of ticketPicks) {
      // console.log(pick);
      if(pick.market !== 'Color' && pick.market !== "OddEven"){
        let newpick = {};
        newpick.coinsPlaced = pick.stake * pick.odd;
        newpick.selectedNumbers = pick.val;
        picks.push(newpick);
      }
    }
  }

  // console.log("picks", picks);
  const weight = calculateWeights(picks);
  // console.log(weight);
  const drawnnumber = drawNumber(weight);
  // console.log("ወኢግህት", drawnnumber);

  // const drawnnumber = Math.floor(Math.random() * 37);

  // return picks;
  return drawnnumber;
};

function drawNumber(weights) {
  const totalWeight = weights.reduce((sum, { weight }) => sum + weight, 0);
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

function calculateWeights(players) {
  const scalingFactor = 0.05;
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
  // console.log(coinsSum)

  const totalCoinsPlaced = Object.values(coinsSum).reduce((sum, value) => sum + value, 0);

  const baseWeight = totalCoinsPlaced / allNumbers.length;
  const scaledBaseWeight = baseWeight * scalingFactor;

  return allNumbers.map((number) => ({
    value: number,
    // weight: coinsSum[number] ? scaledBaseWeight / coinsSum[number] : scaledBaseWeight,
    weight: Math.pow(coinsSum[number] ? scaledBaseWeight / coinsSum[number] : scaledBaseWeight, scalingFactor),
    // weight: Math.pow((coinsSum[number] ?  (coinsSum[number])/totalCoinsPlaced  : totalCoinsPlaced), scalingFactor)
  }));
}

module.exports = {generateSpinRandomNumbers};