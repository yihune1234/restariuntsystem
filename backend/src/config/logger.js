const winston = require('winston');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  isProduction
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf((info) => `[${info.timestamp}] [${info.level}]: ${info.message} ${info.stack ? '\n' + info.stack : ''}`)
      )
);

const transports = [
  new winston.transports.Console({
    level: isProduction ? 'info' : 'debug',
  }),
];

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Stream object for Morgan HTTP logging integration
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;
