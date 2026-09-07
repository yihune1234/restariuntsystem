const swaggerJsDoc = require('swagger-jsdoc');
const config = require('./env');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Faarees Digital Menu API',
      version: '1.0.0',
      description: 'Digital Menu API for Faarees Kaafee fi Restoorraantii restaurant.',
      contact: {
        name: 'Faarees Restaurant Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: 'Local Development Server (v1)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide your JWT Access Token in the Authorization header (e.g. Bearer eyJhbGciOi...)',
        },
        customerSessionAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-session-token',
          description: 'Customer Session Token received after scanning table QR code',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Unauthorized access' },
                  code: { type: 'string', example: 'UNAUTHORIZED' },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient role permissions or branch mismatch',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Forbidden resource access' },
                  code: { type: 'string', example: 'FORBIDDEN' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.js', './src/routes/*.js'],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
