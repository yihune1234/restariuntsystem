const request = require('supertest');
const app = require('../../src/app');

describe('System Health Diagnostics API Integration Tests', () => {
  test('GET /api/v1/health should return 200 with diagnostics status', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status', 'UP');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('timestamp');
  });

  test('GET / non-existing endpoint should return 404 with structured error', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
