// routes/userRoutes.js
const express = require('express');
const router = express.Router();

const getRandomIntInclusive = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function generateRandomNumbers(min, max, count) {
  const randomNumbers = [];
  while (randomNumbers.length < count) {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!randomNumbers.includes(randomNum)) {
      randomNumbers.push(randomNum);
    }
  }
  return randomNumbers;
}

function applyHouseEdge(matchingNumbers, winningProbability) {
  // Adjust the probability of winning based on the house edge
  const adjustedProbability = Math.random() > winningProbability;
  return adjustedProbability ? [] : matchingNumbers;
}

function playKeno() {
  const selectedNumbers = [2, 5, 15, 36, 24, 48];
  const numberOfPicks = selectedNumbers.length;

  // Ensure all selected numbers are within the valid range
  if (selectedNumbers.some(num => num < 1 || num > 80)) {
    alert("Please enter valid numbers between 1 and 80.");
    return;
  }

  const winningProbability = 0.8; // Adjust this to control the house edge

  const drawnNumbers = generateRandomNumbers(1, 80, 20);

  // console.log("Drawn numbers: " + drawnNumbers.join(', '));

  const matchingNumbers = selectedNumbers.filter(num => drawnNumbers.includes(num));

  // Apply house edge
  const adjustedMatchingNumbers = applyHouseEdge(matchingNumbers, winningProbability);

  console.log("Your selected numbers: " + selectedNumbers.join(', '));
  // console.log("Matching numbers: " + adjustedMatchingNumbers.join(', '));

  console.log("Number of matches: " + adjustedMatchingNumbers.length);
}

function applyHouseEdgePlus(drawnNumbers, winningProbability) {
  // Apply house edge directly to the values of drawn numbers
  const adjustedDrawnNumbers = drawnNumbers.map(num => (Math.random() > winningProbability) ? num : Math.floor(Math.random() * 80) + 1);
  return adjustedDrawnNumbers;
}

function playMulitKeno(players) {
  const numberOfPicks = 5; // Number of picks per player
  const winningProbability = 0.2; // Adjust this to control the house edge


  const drawnNumbers = generateRandomNumbers(1, 80, 20);
  console.log("Drawn numbers:", drawnNumbers);

  const adjustedDrawnNumbers = applyHouseEdgePlus(drawnNumbers, winningProbability);
  console.log("Drawn numbers Adjusted:", adjustedDrawnNumbers);


  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const matchingNumbers = player.numbers.filter(num => adjustedDrawnNumbers.includes(num));

    // Apply house edge
    // const adjustedMatchingNumbers = applyHouseEdge(matchingNumbers, winningProbability);

    console.log(`Player ${i + 1} selected numbers: ${player.numbers.join(', ')}`);
    console.log(`Matching numbers: ${matchingNumbers.join(', ')}`);
    // console.log(`Matching numbers: ${adjustedMatchingNumbers.join(', ')}`);
    console.log(`Number of matches: ${matchingNumbers.length}`);
  }
}
const playersData = [
  { numbers: [2, 5, 10, 23, 45] },
  { numbers: [7, 12, 35, 40, 78] },
  { numbers: [9, 14, 26, 58, 47] },
  { numbers: [25, 36, 24, 58, 17] },
  { numbers: [3, 26, 24, 69, 78] },
  { numbers: [7, 69, 58, 14, 26] },
  { numbers: [14, 36, 58, 47, 14] },
  // Add more players as needed
];

// Define routes for user-related actions
router.get('/', (req, res) => {
  const picks = [];
  playMulitKeno(playersData);
  while (picks.length < 20) {
    const pick = getRandomIntInclusive(1, 80);
    if (!picks.includes(pick)) picks.push(pick);
  }
  res.send(picks);
});

module.exports = router;
