const Redis = require('ioredis');
const Redlock = require('redlock');

// Replace with your Redis server details
const redis = [
  new Redis({ port: 6379, host: 'localhost' }),
  // Add more instances for redundancy (optional)
];

const redlock = new Redlock(
  redis,
  {
    driftFactor: 0.01, // multiplied by lock ttl to determine drift time
    retryCount: 10,
    retryDelay: 200, // time in ms
    retryJitter: 200 // time in ms
  }
);

module.exports = { redlock };
