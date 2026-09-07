const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

// Load environment file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(5000),

  // MongoDB
  MONGODB_URI: Joi.string().required().description('MongoDB connection URI'),

  // Single-Branch Mode: Default Organization & Branch IDs (auto-resolved from DB if not set)
  DEFAULT_ORGANIZATION_ID: Joi.string().allow('').optional().description('Default organization ID for single-branch mode'),
  DEFAULT_BRANCH_ID: Joi.string().allow('').optional().description('Default branch ID for single-branch mode'),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(16).required().description('JWT access token secret'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required().description('JWT refresh token secret'),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Customer Session
  CUSTOMER_SESSION_EXPIRES_IN_HOURS: Joi.number().default(6),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),
  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow('').optional(),

  // Public base URL of THIS backend, used to build absolute URLs for images
  // served locally from /uploads (fallback when Cloudinary is not used).
  BACKEND_BASE_URL: Joi.string().allow('').optional(),

  // Chapa
  CHAPA_SECRET_KEY: Joi.string().allow('').optional(),
  CHAPA_BASE_URL: Joi.string().uri().default('https://api.chapa.co/v1'),
  CHAPA_CALLBACK_URL: Joi.string().uri().default('http://localhost:5000/api/v1/payments/chapa/webhook'),
  CHAPA_RETURN_URL: Joi.string().uri().allow('').optional(),
  CHAPA_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  // CORS & Clients
  CLIENT_URL: Joi.string().default('http://localhost:3000'),
  SOCKET_CORS_ORIGIN: Joi.string().default('http://localhost:3000,http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(1000),
})
  .unknown()
  .required();

const { value: envVars, error } = envSchema.validate(process.env, {
  abortEarly: false,
});

if (error) {
  throw new Error(`Environment validation error: ${error.details.map((x) => x.message).join(', ')}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',
  port: envVars.PORT,
  mongo: {
    uri: envVars.MONGODB_URI,
  },
  // Single-Branch Mode: Default IDs (auto-resolved from DB if not provided)
  defaultOrganizationId: envVars.DEFAULT_ORGANIZATION_ID || null,
  defaultBranchId: envVars.DEFAULT_BRANCH_ID || null,
  jwt: {
    accessSecret: envVars.JWT_ACCESS_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessExpiresIn: envVars.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  customerSession: {
    expiresInHours: envVars.CUSTOMER_SESSION_EXPIRES_IN_HOURS,
  },
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET,
  },
  // Optional explicit base URL for locally-served images; falls back to the
  // incoming request's protocol+host when not set.
  backendBaseUrl: envVars.BACKEND_BASE_URL || '',
  chapa: {
    secretKey: envVars.CHAPA_SECRET_KEY,
    baseUrl: envVars.CHAPA_BASE_URL,
    callbackUrl: envVars.CHAPA_CALLBACK_URL,
    // Default the redirect to the customer confirmation screen on the SPA.
    // Admin should set CHAPA_RETURN_URL to their deployed frontend domain.
    returnUrl:
      envVars.CHAPA_RETURN_URL ||
      `${envVars.CLIENT_URL}/customer/confirmed/`,
    webhookSecret: envVars.CHAPA_WEBHOOK_SECRET,
  },
  clientUrl: envVars.CLIENT_URL,
  socketCorsOrigin: envVars.SOCKET_CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
};
