const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const { TooManyRequestsError } = require('../utils/errors');

const standardLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Too many requests from this IP, please try again after 15 minutes'));
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login/refresh attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Too many authentication attempts, please try again after 15 minutes'));
  },
});

const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res, next) => {
    next(new TooManyRequestsError('Too many payment requests, please try again shortly'));
  },
});

module.exports = {
  standardLimiter,
  authLimiter,
  paymentLimiter,
};
