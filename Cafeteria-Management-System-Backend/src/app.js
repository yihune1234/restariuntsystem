const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const { standardLimiter } = require('./middleware/rate-limit.middleware');
const notFoundHandler = require('./middleware/not-found.middleware');
const errorHandler = require('./middleware/error.middleware');
const v1Router = require('./routes');

const app = express();

// Trust proxy for secure headers behind load balancers/reverse proxies
app.enable('trust proxy');

// 1. Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      const allowed = config.socketCorsOrigin;
      if (allowed.includes('*') || allowed.indexOf(origin) !== -1 || config.clientUrl === origin || !config.isProduction) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS policy'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token', 'x-branch-id'],
    credentials: true,
  })
);

// 3. Response compression
app.use(compression());

// 4. Request body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4b. Serve locally-stored images (fallback when Cloudinary is not configured)
const path = require('path');
const uploadsDir = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', immutable: true }));

// 5. HTTP request logging via Morgan + Winston
const morganFormat = config.isProduction ? 'combined' : 'dev';
app.use(morgan(morganFormat, { stream: logger.stream }));

// 6. Interactive Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Paperless Restaurant API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// 7. Apply standard rate limiting to all /api/ endpoints
app.use('/api', standardLimiter);

// 8. Mount Master Version 1 API Router
app.use('/api/v1', v1Router);

// 9. Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'Paperless Restaurant & Cafeteria Management System API',
    version: '1.0.0',
    status: 'ONLINE',
    documentation: '/api-docs',
    health: '/api/v1/health',
  });
});

// 10. Handle undefined routes (404)
app.use(notFoundHandler);

// 11. Centralized application error handling
app.use(errorHandler);

module.exports = app;
