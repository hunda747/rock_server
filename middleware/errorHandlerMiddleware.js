// middleware/errorHandlerMiddleware.js
const { UniqueViolationError } = require('objection');

function errorHandlerMiddleware(err, req, res, next) {
  if (err instanceof UniqueViolationError && err.constraint === 'shop_owners_username_unique') {
    return res.status(400).json({ error: 'Username already taken. Please choose a different one.' });
  }

  // Handle other common errors if needed

  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = errorHandlerMiddleware;
