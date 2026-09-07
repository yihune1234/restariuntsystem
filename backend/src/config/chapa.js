const axios = require('axios');
const config = require('./env');
const logger = require('./logger');

const chapaClient = axios.create({
  baseURL: config.chapa.baseUrl,
  headers: {
    Authorization: `Bearer ${config.chapa.secretKey}`,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

if (config.chapa.secretKey) {
  logger.info('Chapa payment client initialized');
} else {
  logger.warn('Chapa Secret Key not provided. Chapa online payments will operate in mocked/disabled mode.');
}

module.exports = {
  chapaClient,
  config: config.chapa,
};
