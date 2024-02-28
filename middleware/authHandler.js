const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // const token = req.header('Authorization');
  const token = req.headers['authorization']?.split(' ')[1];

  console.log(token);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Token not provided' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden - Invalid token' });
    }

    req.user = user;
    next();
  });
};

const authenticateRefreshToken = (req, res, next) => {
  // const token = req.header('Authorization');
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Token not provided' });
  }

  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden - Invalid token' });
    }

    req.user = user;
    next();
  });
};

function checkUserRole(requiredRoles) {
  return (req, res, next) => {
    if (!req.user || !requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  authenticateToken, authenticateRefreshToken, checkUserRole
};