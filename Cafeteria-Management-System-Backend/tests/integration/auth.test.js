const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const config = require('../../src/config/env');
const { User } = require('../../src/modules/users/user.model');
const Organization = require('../../src/modules/organizations/organization.model');
const Branch = require('../../src/modules/branches/branch.model');

describe('Authentication & RBAC Integration Tests', () => {
  let testOrg;
  let testBranch;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongo.uri);
    }

    await User.deleteMany({ email: /test.*@restaurant\.com/ });
    await Branch.deleteMany({ code: 'TEST-BR-01' });
    await Organization.deleteMany({ name: 'Test Hospitality Org' });

    testOrg = await Organization.create({
      name: 'Test Hospitality Org',
      ownerName: 'Test Owner',
      ownerEmail: 'testowner@restaurant.com',
      isActive: true,
    });

    testBranch = await Branch.create({
      organizationId: testOrg._id,
      name: 'Test Branch 01',
      code: 'TEST-BR-01',
      address: { city: 'Addis Ababa' },
      phone: '+251911000000',
      isActive: true,
    });

    await User.create({
      organizationId: testOrg._id,
      branchId: testBranch._id,
      name: 'Test Manager',
      email: 'testmanager@restaurant.com',
      passwordHash: 'Password123!',
      role: 'MANAGER',
      isActive: true,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test.*@restaurant\.com/ });
    await Branch.deleteMany({ code: 'TEST-BR-01' });
    await Organization.deleteMany({ name: 'Test Hospitality Org' });
    await mongoose.connection.close();
  });

  test('POST /api/v1/auth/login with valid credentials should return 200 and tokens', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'testmanager@restaurant.com',
      password: 'Password123!',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.role).toBe('MANAGER');
  });

  test('POST /api/v1/auth/login with invalid password should return 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'testmanager@restaurant.com',
      password: 'WrongPassword!',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  test('GET /api/v1/auth/me without token should return 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
