const { getTodayShopReport } = require("../controllers/DailyReportController");
const Ticket = require("../models/slip");
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
      newpick.coinsPlaced = (pick.stake * pick.odd) / pick.selection.length;
      newpick.selectedNumbers = pick.selection;
      picks.push(newpick);
    }
  }

  const reportDate = new Date();
  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(reportDate);
  endOfDay.setHours(23, 59, 59, 999);
  const currentData = await getTodayShopReport(startOfDay, endOfDay, shopId, 'keno');
  // console.log('ggr:', currentData);

  const currentRatio = parseInt(currentData.stake) ? ((parseInt(currentData.ggr) / parseInt(currentData.stake)) * 100).toFixed(2) : 0
  console.log('currenration', currentRatio);
  // console.log('rtp', rtp);
  // console.log("picks", picks);
  // const actualScall = calculateDynamicScalingFactor(currentRatio, rtp)
  const actualScall = calculateDynamicScalingFactorTarget(currentRatio, rtp, currentData.stake)
  // const actualScall = calculateDynamicScalingSimple(currentRatio, rtp, currentData.stake)
  console.log('actual scall ', actualScall);
  // console.log("code", picks);

  const scalingFactor = rtp / 100;
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

function drawNumbersWindow(min, max, count) {
  // Validate input parameters
  if (count > max - min + 1 || count <= 0) {
    throw new Error("Invalid parameter(s).");
  }

  const drawnNumbers = [];
  while (drawnNumbers.length < count) {
    const randomNumber = _generatePseudoRandomInt(min, max);

    // Check if the randomly generated number is already present in our list
    if (!drawnNumbers.includes(randomNumber)) {
      drawnNumbers.push(randomNumber);
    }
  }

  return drawnNumbers;
}

function _generatePseudoRandomInt(min, max) {
  const buf = crypto.randomBytes(4);
  const intValue = buf.readUInt32BE();

  return intValue % (max - min + 1) + min;
}


function calculateDynamicScalingFactor(currentRatio, targetRatio) {
  const tolerance = 3; // 5%
  const middleTolerance = 6; // 7.5%
  const largeTolerance = 7.5; // 10%

  if (currentRatio === targetRatio) {
    return targetRatio / 100;
  } else if (currentRatio > targetRatio && currentRatio <= targetRatio + middleTolerance) {
    return targetRatio / 100;
    // } else if (currentRatio > targetRatio + tolerance && currentRatio <= targetRatio + middleTolerance) {
    //   return 0.01;
  } else if (currentRatio > targetRatio + middleTolerance && currentRatio <= targetRatio + largeTolerance) {
    return 0.01;
  } else if (currentRatio > targetRatio + largeTolerance) {
    return 0;  // Adjust as needed
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

function calculateDynamicScalingSimple(currentRatio, targetRatio, stake) {
  const tolerance = 3; // 5%
  const middleTolerance = 6; // 7.5%
  const largeTolerance = 20; // 10%
  20.19

  if (currentRatio < 0) {
    return 0.4;
  } else if (stake < 1000) {
    return targetRatio / 100;  // 0.2
  } else if (currentRatio >= 0 && currentRatio < targetRatio) {
    return (targetRatio + 5) / 100;
  } else if (currentRatio === targetRatio) {
    return targetRatio / 100;
  } else if (currentRatio > targetRatio && currentRatio <= targetRatio + largeTolerance) {
    return targetRatio / 100;
  } else if (currentRatio > targetRatio + largeTolerance) {
    return (targetRatio - 5) / 100;
  }

  // Default case, return a neutral scaling factor
  return targetRatio / 100;
}
function calculateDynamicScalingFactorTarget(currentRatio, targetRatio, stake) {
  const tolerance = 5; // 5%
  const middleTolerance = 15; // 7.5%
  const largeTolerance = 20; // 10%
  // targetRatio 20 10
  console.log('cc', currentRatio);
  console.log('cc', targetRatio);
  if (currentRatio < 0) {
    return 0.4;
  } else if (stake < 1500) {
    return targetRatio / 100;  // 0.2
  } else if (currentRatio === targetRatio) {
    return targetRatio / 100;  // 0.2
  } else if (currentRatio > targetRatio && currentRatio <= targetRatio + tolerance) {
    return targetRatio / 100; // 10-15  0.2
  } else if (currentRatio > targetRatio + tolerance && currentRatio <= targetRatio + middleTolerance) {
    return (targetRatio - 5) / 100;  // 15-25  0.05
  } else if (currentRatio > targetRatio + middleTolerance && currentRatio <= targetRatio + largeTolerance) {
    return ((targetRatio - 10) / 100) ? (targetRatio - 10) / 100 : 0.03;  //25-30  0.1
  } else if (currentRatio > targetRatio + largeTolerance) {  //34 > 25
    return 0.01;  // Adjust as needed  > 25
  } else if (currentRatio < targetRatio && currentRatio >= targetRatio - tolerance) {
    return (targetRatio + 5) / 100; // 20-15 0.25
  } else if (currentRatio < targetRatio - tolerance && currentRatio >= targetRatio - middleTolerance) {
    return (targetRatio + 10) / 100; // 15-10 0.3
  } else if (currentRatio < targetRatio - middleTolerance && currentRatio >= targetRatio - largeTolerance) {
    return (targetRatio + 15) / 100;  // 10-5 0.3
  } else if (currentRatio < targetRatio - largeTolerance) {
    return (targetRatio + 20) / 100; // 0-5 0.4
  }

  // Default case, return a neutral scaling factor
  return 0.7;
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
  // players.forEach((player) => {
  //   player.selectedNumbers.forEach((number, index) => {
  //     console.log(index);
  //     if (!((player.selectedNumbers.length > 2 && index === 0) || (player.selectedNumbers.length > 3 && index === player.selectedNumbers.length - 1))) {
  //       coinsSum[number] = (coinsSum[number] || 0) + player.coinsPlaced;
  //     }
  //   });
  // });
  players.forEach((player, index) => {
    if (player.selectedNumbers.length === 2) {
      const numbers = player.selectedNumbers;
      if (index % 2 === 0) {
        coinsSum[numbers[0]] = (coinsSum[numbers[0]] || 0) + (player.coinsPlaced * 2);
      } else {
        coinsSum[numbers[1]] = (coinsSum[numbers[1]] || 0) + (player.coinsPlaced * 2);
      }
    } else {
      player.selectedNumbers.forEach((number, index) => {
        // console.log(index);
        if (!((player.selectedNumbers.length > 2 && index === 0) || (player.selectedNumbers.length > 3 && index === player.selectedNumbers.length - 1))) {
          coinsSum[number] = (coinsSum[number] || 0) + player.coinsPlaced;
        }
      });
    }
  });
  // console.log(coinsSum);

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

// new thing


// const { generateShopReport, getTodayShopReport } = require("../controllers/DailyReportController");
// const Ticket = require("../models/slip");
// const crypto = require("crypto");

// const generateRandomNumbersKeno = async (gameNumber, rtp, shopId, res) => {
//   const tickets = await Ticket.query()
//     .where("gameId", gameNumber)
//     .whereNot("status", "canceled");

//   // const reportDate = new Date();
//   // const startOfDay = new Date(reportDate);
//   // startOfDay.setHours(0, 0, 0, 0);
//   // const endOfDay = new Date(reportDate);
//   // endOfDay.setHours(23, 59, 59, 999);

//   // const currentData = await getTodayShopReport(startOfDay, endOfDay, shopId, 'keno');
//   // // console.log('ggr:', currentData);

//   if (!tickets.length) {
//     const drawnnumber = drawNumbersWindow(1, 80, 20);
//     // const drawnnumber = [];

//     // while (drawnnumber.length < 20) {
//     //   const randomNum = Math.floor(Math.random() * 80) + 1;

//     //   // Ensure the number is not already in the array
//     //   if (!drawnnumber.includes(randomNum)) {
//     //     drawnnumber.push(randomNum);
//     //   }
//     // }
//     return drawnnumber;
//   }

//   const picks = [];

//   // Iterate through each ticket
//   for (const ticket of tickets) {
//     const ticketPicks = JSON.parse(ticket.numberPick);

//     for (const pick of ticketPicks) {
//       let newpick = {};
//       newpick.coinsPlaced = (pick.stake * pick.odd) / pick.selection.length;
//       newpick.selectedNumbers = pick.selection;
//       picks.push(newpick);
//     }
//   }

//   // const currentRatio = parseInt(currentData.stake) ? ((parseInt(currentData.ggr) / parseInt(currentData.stake)) * 100).toFixed(2) : 0
//   // console.log('currenration', currentRatio);
//   // console.log('rtp', rtp);
//   console.log("picks", picks);
//   // const actualScall = calculateDynamicScalingFactor(currentRatio, rtp)
//   // console.log('actual scall ', actualScall);
//   // console.log("code", picks);

//   const scalingFactor = rtp / 100;
//   const weight = calculateWeights(picks, scalingFactor);
//   const drawnnumber = drawTwoUniqueNumbers(weight, 20);
//   // const drawnnumber = generateUniqueWeightedNumbers(weight, 20);
//   console.log("ወኢግህት", drawnnumber);

//   // const drawnnumber = [];

//   // while (drawnnumber.length < 20) {
//   //   const randomNum = Math.floor(Math.random() * 80) + 1;

//   //   // Ensure the number is not already in the array
//   //   if (!drawnnumber.includes(randomNum)) {
//   //     drawnnumber.push(randomNum);
//   //   }
//   // }

//   return drawnnumber;
// };

// function drawNumbersWindow(min, max, count) {
//   // Validate input parameters
//   if (count > max - min + 1 || count <= 0) {
//     throw new Error("Invalid parameter(s).");
//   }

//   const drawnNumbers = [];
//   while (drawnNumbers.length < count) {
//     const randomNumber = _generatePseudoRandomInt(min, max);

//     // Check if the randomly generated number is already present in our list
//     if (!drawnNumbers.includes(randomNumber)) {
//       drawnNumbers.push(randomNumber);
//     }
//   }

//   return drawnNumbers;
// }

// function _generatePseudoRandomInt(min, max) {
//   const buf = crypto.randomBytes(4);
//   const intValue = buf.readUInt32BE();

//   return intValue % (max - min + 1) + min;
// }


// function calculateDynamicScalingFactor(currentRatio, targetRatio) {
//   const tolerance = 3; // 5%
//   const middleTolerance = 6; // 7.5%
//   const largeTolerance = 7.5; // 10%

//   if (currentRatio === targetRatio) {
//     return targetRatio / 100;
//   } else if (currentRatio > targetRatio && currentRatio <= targetRatio + middleTolerance) {
//     return targetRatio / 100;
//     // } else if (currentRatio > targetRatio + tolerance && currentRatio <= targetRatio + middleTolerance) {
//     //   return 0.01;
//   } else if (currentRatio > targetRatio + middleTolerance && currentRatio <= targetRatio + largeTolerance) {
//     return 0.01;
//   } else if (currentRatio > targetRatio + largeTolerance) {
//     return 0.00001;  // Adjust as needed
//   } else if (currentRatio < 0) {
//     return 0.3;
//   } else if (currentRatio < targetRatio && currentRatio >= targetRatio - tolerance) {
//     return 0.1;
//   } else if (currentRatio < targetRatio - tolerance && currentRatio >= targetRatio - middleTolerance) {
//     return 0.15;
//   } else if (currentRatio < targetRatio - middleTolerance && currentRatio >= targetRatio - largeTolerance) {
//     return 0.2;  // Adjust as needed
//   } else if (currentRatio < targetRatio - largeTolerance) {
//     return 0.25;
//   }

//   // Default case, return a neutral scaling factor
//   return 1.0;
// }

// function drawTwoUniqueNumbers(weights, num = 20) {
//   const drawnNumbers = new Set();
//   // console.log("weight", weights);
//   while (drawnNumbers.size < num) {
//     const candidateNumber = weightedRandom(weights);

//     // console.log("weight", candidateNumber);
//     if (!drawnNumbers.has(candidateNumber)) {
//       drawnNumbers.add(candidateNumber);
//     }
//   }
//   return Array.from(drawnNumbers); // Ensure sorted order
// }

// function weightedRandom(weights) {
//   const totalWeight = weights.reduce((sum, weight) => sum + weight.weight, 0);
//   const randomValue = Math.random() * totalWeight;

//   let cumulativeWeight = 0;
//   for (let i = 0; i < weights.length; i++) {
//     cumulativeWeight += weights[i].weight;
//     if (randomValue <= cumulativeWeight) {
//       return weights[i].value; // Return the selected number
//     }
//   }
// }

// function generateUniqueWeightedNumbers(data, numNumbers, maxPoolSize = 10 * numNumbers, maxConsecutive = 2) {
//   // Create a larger pool of values with repeated elements based on weights
//   const pool = [];
//   for (const item of data) {
//     for (let i = 0; i < item.weight; i++) {
//       pool.push(item.value);
//     }
//   }

//   // Shuffle the pool to further increase randomness (optional)
//   console.log('weight', data);
//   // shuffle(pool); // Replace with your chosen shuffling algorithm

//   // Ensure pool size is not larger than maxPoolSize
//   if (pool.length > maxPoolSize) {
//     pool.length = maxPoolSize;
//   }

//   const totalWeight = pool.length;
//   const generatedNumbers = new Set();

//   while (generatedNumbers.size < numNumbers) {
//     const randomValue = Math.floor(crypto.randomInt(0, totalWeight));

//     let valid = true;
//     if (generatedNumbers.size > 0) {
//       const lastNumber = Array.from(generatedNumbers)[generatedNumbers.size - 1];
//       valid = Math.abs(lastNumber - pool[randomValue]) > maxConsecutive;
//     }

//     if (valid && !generatedNumbers.has(pool[randomValue])) {
//       generatedNumbers.add(pool[randomValue]);
//     }
//   }

//   return Array.from(generatedNumbers);
// }

// function calculateWeights(players, scalingFactor) {
//   // Create an array to store all possible numbers
//   const allNumbers = Array.from({ length: 80 }, (_, i) => i + 1);

//   if (!players.length) {
//     return allNumbers.map((number) => ({
//       value: number,
//       weight: 1, // Lower weight for selected numbers
//     }));
//   }

//   // Initialize empty object to store total coins placed
//   const coinsSum = {};
//   // console.log(players);
//   // Iterate through players and count their bets
//   players.forEach((player, index) => {
//     if (player.selectedNumbers.length === 2) {
//       // Iterate through the selectedNumbersLengthTwo array
//       // Log in an alternating fashion
//       const numbers = player.selectedNumbers;
//       if (index % 2 === 0) {
//         coinsSum[numbers[0]] = (coinsSum[numbers[0]] || 0) + (player.coinsPlaced * 2);
//       } else {
//         coinsSum[numbers[1]] = (coinsSum[numbers[1]] || 0) + (player.coinsPlaced * 2);
//       }
//     } else {
//       player.selectedNumbers.forEach((number, index) => {
//         // console.log(index);
//         if (!((player.selectedNumbers.length > 2 && index === 0) || (player.selectedNumbers.length > 3 && index === player.selectedNumbers.length - 1))) {
//           coinsSum[number] = (coinsSum[number] || 0) + player.coinsPlaced;
//         }
//       });
//     }
//   });
//   console.log(coinsSum);

//   // Calculate total coins placed
//   const totalCoinsPlaced = Object.values(coinsSum).reduce(
//     (sum, value) => sum + value,
//     0
//   );
//   const maxCoins = Math.max(...Object.values(coinsSum));
//   const baseWeight = totalCoinsPlaced / allNumbers.length;
//   const scaledBaseWeight = baseWeight * scalingFactor;
//   console.log(baseWeight);

//   // Return weights for all numbers
//   return allNumbers.map((number) => ({
//     value: number,
//     // weight: (coinsSum[number] ? baseWeight / (coinsSum[number]) : baseWeight)
//     weight: Math.pow(
//       coinsSum[number] ? scaledBaseWeight / coinsSum[number] : scaledBaseWeight,
//       scalingFactor
//     ),
//     // weight: coinsSum[number]
//     //   ? Math.exp(-scalingFactor * coinsSum[number] / maxCoins) * maxCoins
//     //   : maxCoins,
//   }));
// }

// module.exports = { generateRandomNumbersKeno };
