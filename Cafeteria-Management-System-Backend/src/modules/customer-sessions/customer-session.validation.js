const Joi = require('joi');

const createSessionSchema = {
  body: Joi.object({
    qrToken: Joi.string().required().messages({
      'any.required': 'QR token is required',
    }),
    /**
     * Staff-only flag: seat a party even when the table is at capacity.
     * Ignored unless the request carries an authorized staff bearer token
     * (enforced in the controller).
     */
    staffOverride: Joi.boolean().default(false),
  }),
};

module.exports = {
  createSessionSchema,
};
