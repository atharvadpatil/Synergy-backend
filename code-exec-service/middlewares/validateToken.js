const jwt = require('jsonwebtoken');

const validateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access Denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = verified; 
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token.' });
  }
};

module.exports = validateToken;