const crypto = require('crypto');

/**
 * Generate a cryptographically secure random 4-digit security code
 * @returns {string} e.g. "5837"
 */
const generateSecurityCode = () => {
  return crypto.randomInt(1000, 10000).toString();
};

module.exports = {
  generateSecurityCode,
};
