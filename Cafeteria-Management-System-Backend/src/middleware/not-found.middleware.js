const { NotFoundError } = require('../utils/errors');

const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Cannot find endpoint ${req.method} ${req.originalUrl}`));
};

module.exports = notFoundHandler;
