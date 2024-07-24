function calculateCommission(totalBet, totalCommission, desiredCommissionRate, active, milestones) {
  console.log("total bet", totalBet, "total com", totalCommission);
  let nextMilestone = milestones.find(milestone => totalBet < milestone.amount);
  console.log('next milestone', nextMilestone);
  // Calculate the expected bonus pool
  if (!nextMilestone) {
    return 1;
  }
  expectedBonusPool = (totalBet * (nextMilestone.bonus / nextMilestone.amount)).toFixed(2);
  console.log('expected pool', expectedBonusPool);

  let desiredCommission;
  if ((totalBet + active) > nextMilestone.amount) {
    console.log("bonus round!!");
    desiredCommission = (totalBet + active) * desiredCommissionRate;
  } else {
    desiredCommission = (totalBet + active) * desiredCommissionRate + parseFloat(expectedBonusPool);
  }
  console.log('desiredCommission', desiredCommission);
  let commissionDifference = desiredCommission - totalCommission;
  console.log('commission difference', commissionDifference);
  let commission = ((commissionDifference + active) / active).toFixed(2);
  return Math.min(parseFloat(commission), 1);
}

// Example usage:
let milestones = [
  { amount: 3000, bonus: 400 },
  { amount: 5000, bonus: 700 },
  { amount: 10000, bonus: 1500 },
  { amount: 20000, bonus: 3000 }
];

let totalBet = 2900;
let totalCommission = 936;
let desiredCommissionRate = 0.15;
let active = 110;

let commissionAmount = calculateCommission(totalBet, totalCommission, desiredCommissionRate, active, milestones);

console.log(commissionAmount); // Output: Commission for this round, including expected bonus pool
console.log("winning poll", (active - (active * (commissionAmount))));
