const Joi = require('joi');

const orderIdParamSchema = {
  params: Joi.object({
    orderId: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  orderIdParamSchema,
};
