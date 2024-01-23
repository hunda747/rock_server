// middleware/errorHandlerMiddleware.js
const { UniqueViolationError } = require('objection');

function errorHandlerMiddleware(err, req, res, next) {
  console.log('handlingt');
  console.error(err);
  if (err instanceof UniqueViolationError) {
    if (err.constraint === 'shop_owners_username_unique') {
      return res.status(400).json({ error: 'Username already taken. Please choose a different one.' });
    }
    if (err.constraint === 'username_unique') {
      return res.status(400).json({ error: 'Username already taken. Please choose a different one.' });
    }
    // Add more conditions for other UniqueViolationError constraints if needed
  }

  // Handle other common errors if needed

  res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = errorHandlerMiddleware;
