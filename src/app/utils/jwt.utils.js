const jwt = require('jsonwebtoken');
const config = require('../../config');

const createToken = (payload, secret = config.jwt_secret, expiresIn = config.jwt_expires_in) => {
  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

const verifyToken = (token, secret = config.jwt_secret) => {
  return jwt.verify(token, secret);
};

module.exports = {
  createToken,
  verifyToken,
};
