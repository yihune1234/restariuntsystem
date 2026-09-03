const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const config = require('../../src/config/env');
const Organization = require('../../src/modules/organizations/organization.model');
const Branch = require('../../src/modules/branches/branch.model');
const { User } = require('../../src/modules/users/user.model');
const { Table } = require('../../src/modules/tables/table.model');
const MealPeriod = require('../../src/modules/menu/meal-period/meal-period.model');
const Category = require('../../src/modules/menu/category/category.model');
const FoodItem = require('../../src/modules/menu/food/food.model');
const DailyStock = require('../../src/modules/inventory/daily-stock.model');
const { Order } = require('../../src/modules/orders/order.model');
const OrderStatusHistory = require('../../src/modules/orders/order-status-history.model');
const { getTodayBusinessDate } = require('../../src/utils/date');

describe('Full End-to-End Restaurant Order & Real-Time Flow Integration Tests', () => {
  let org, branch, table, mealPeriod, category, foodItem1, foodItem2;
  let cashierUser, cashierToken;
  let kitchenUser, kitchenToken;
  let waiterUser, waiterToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongo.uri);
    }

    // 1. Setup Organization & Branch
    org = await Organization.create({
      name: 'E2E Flow Restaurant Group',
      ownerName: 'Abebe Flow',
      ownerEmail: 'flow@restaurant.com',
      isActive: true,
    });

    branch = await Branch.create({
      organizationId: org._id,
      name: 'E2E Main Branch',
      code: 'E2E-01',
      address: { city: 'Addis Ababa' },
      phone: '+251911999999',
      settings: {
        taxRate: 0.15,
        serviceChargeRate: 0,
        currency: 'ETB',
      },
      isActive: true,
    });

    // 2. Setup Staff
    const password = 'Password123!';
    cashierUser = await User.create({
      organizationId: org._id,
      branchId: branch._id,
      name: 'E2E Cashier',
      email: 'e2e.cashier@restaurant.com',
      passwordHash: password,
      role: 'CASHIER',
      isActive: true,
    });

    kitchenUser = await User.create({
      organizationId: org._id,
      branchId: branch._id,
      name: 'E2E Chef',
      email: 'e2e.kitchen@restaurant.com',
      passwordHash: password,
      role: 'KITCHEN',
      isActive: true,
    });

    waiterUser = await User.create({
      organizationId: org._id,
      branchId: branch._id,
      name: 'E2E Waiter',
      email: 'e2e.waiter@restaurant.com',
      passwordHash: password,
      role: 'WAITER',
      isActive: true,
    });

    // 3. Setup Table & Menu
    table = await Table.create({
      branchId: branch._id,
      tableNumber: 'Table-E2E-1',
      qrToken: 'e2e_qr_token_table_1_secret',
      capacity: 4,
      isActive: true,
    });

    mealPeriod = await MealPeriod.create({
      branchId: branch._id,
      name: 'ALL_DAY',
      startTime: '00:00',
      endTime: '23:59',
      isActive: true,
    });

    category = await Category.create({
      branchId: branch._id,
      mealPeriodId: mealPeriod._id,
      name: 'POPULAR DISHES',
      isActive: true,
    });

    foodItem1 = await FoodItem.create({
      branchId: branch._id,
      categoryId: category._id,
      name: 'Special Chechebsa',
      price: 200.0,
      isAvailable: true,
      isActive: true,
    });

    foodItem2 = await FoodItem.create({
      branchId: branch._id,
      categoryId: category._id,
      name: 'Ethiopian Coffee',
      price: 50.0,
      isAvailable: true,
      isActive: true,
    });

    // 4. Initialize Stock (10 portions each)
    const today = getTodayBusinessDate();
    await DailyStock.create({
      branchId: branch._id,
      foodItemId: foodItem1._id,
      businessDate: today,
      preparedQuantity: 10,
      soldQuantity: 0,
      remainingQuantity: 10,
      status: 'AVAILABLE',
    });

    await DailyStock.create({
      branchId: branch._id,
      foodItemId: foodItem2._id,
      businessDate: today,
      preparedQuantity: 10,
      soldQuantity: 0,
      remainingQuantity: 10,
      status: 'AVAILABLE',
    });

    // 5. Login Staff to obtain JWTs
    const cashierRes = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e.cashier@restaurant.com',
      password,
    });
    cashierToken = cashierRes.body.data.accessToken;

    const kitchenRes = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e.kitchen@restaurant.com',
      password,
    });
    kitchenToken = kitchenRes.body.data.accessToken;

    const waiterRes = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e.waiter@restaurant.com',
      password,
    });
    waiterToken = waiterRes.body.data.accessToken;
  });

  afterAll(async () => {
    await Organization.deleteMany({ _id: org._id });
    await Branch.deleteMany({ _id: branch._id });
    await User.deleteMany({ branchId: branch._id });
    await Table.deleteMany({ branchId: branch._id });
    await MealPeriod.deleteMany({ branchId: branch._id });
    await Category.deleteMany({ branchId: branch._id });
    await FoodItem.deleteMany({ branchId: branch._id });
    await DailyStock.deleteMany({ branchId: branch._id });
    await Order.deleteMany({ branchId: branch._id });
    await OrderStatusHistory.deleteMany({});
    await mongoose.connection.close();
  });

  test('STEP 1 to 10: Complete Paperless Dining & Workflow Lifecycle', async () => {
    // -------------------------------------------------------------
    // STEP 1: Customer scans Table QR Code & creates Customer Session
    // -------------------------------------------------------------
    const sessionRes = await request(app).post('/api/v1/customer-sessions').send({
      qrToken: 'e2e_qr_token_table_1_secret',
    });

    expect(sessionRes.statusCode).toBe(201);
    expect(sessionRes.body.success).toBe(true);
    const sessionToken = sessionRes.body.data.sessionToken;
    expect(sessionToken).toBeDefined();
    expect(sessionRes.body.data.table.tableNumber).toBe('Table-E2E-1');

    // -------------------------------------------------------------
    // STEP 2: Customer views Public Menu
    // -------------------------------------------------------------
    const menuRes = await request(app).get(`/api/v1/public/branches/${branch._id}/menu`);
    expect(menuRes.statusCode).toBe(200);
    expect(menuRes.body.data.menu.length).toBeGreaterThan(0);

    // -------------------------------------------------------------
    // STEP 3: Customer places Order (2x Chechebsa @ 200 + 1x Coffee @ 50 = subtotal 450)
    // Server computes: subtotal = 450, tax (15%) = 67.50, total = 517.50
    // -------------------------------------------------------------
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('x-session-token', sessionToken)
      .send({
        branchId: branch._id.toString(),
        tableId: table._id.toString(),
        items: [
          { foodItemId: foodItem1._id.toString(), quantity: 2, notes: 'Extra honey' },
          { foodItemId: foodItem2._id.toString(), quantity: 1 },
        ],
      });

    expect(orderRes.statusCode).toBe(201);
    const order = orderRes.body.data;
    expect(order.orderNumber).toBeDefined();
    expect(order.securityCode).toBeDefined();
    expect(order.subtotal).toBe(450.0);
    expect(order.tax).toBe(67.5);
    expect(order.total).toBe(517.5);
    expect(order.orderStatus).toBe('WAITING_FOR_PAYMENT');
    expect(order.paymentStatus).toBe('UNPAID');

    const orderId = order._id;

    // -------------------------------------------------------------
    // STEP 4: Kitchen Queue Check (Unpaid order MUST NOT appear)
    // -------------------------------------------------------------
    const kitchenQueuePre = await request(app)
      .get('/api/v1/kitchen/orders')
      .set('Authorization', `Bearer ${kitchenToken}`);

    expect(kitchenQueuePre.statusCode).toBe(200);
    const foundUnpaid = kitchenQueuePre.body.data.find((o) => o._id.toString() === orderId.toString());
    expect(foundUnpaid).toBeUndefined(); // STRICT INVARIANT: Unpaid order is NOT in kitchen

    // -------------------------------------------------------------
    // STEP 5: Customer pays at Cashier -> Cashier confirms payment
    // -------------------------------------------------------------
    const paymentConfirmRes = await request(app)
      .post(`/api/v1/orders/${orderId}/payment/confirm`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ paymentMethod: 'CASH' });

    expect(paymentConfirmRes.statusCode).toBe(200);
    expect(paymentConfirmRes.body.data.order.paymentStatus).toBe('PAID');
    expect(paymentConfirmRes.body.data.order.orderStatus).toBe('CONFIRMED');

    // Verify stock deducted atomically (10 - 2 = 8 for Chechebsa)
    const today = getTodayBusinessDate();
    const stock1 = await DailyStock.findOne({ foodItemId: foodItem1._id, businessDate: today });
    expect(stock1.remainingQuantity).toBe(8);
    expect(stock1.soldQuantity).toBe(2);

    // -------------------------------------------------------------
    // STEP 6: Kitchen sees CONFIRMED order & starts preparation (PREPARING)
    // -------------------------------------------------------------
    const kitchenQueuePost = await request(app)
      .get('/api/v1/kitchen/orders')
      .set('Authorization', `Bearer ${kitchenToken}`);

    expect(kitchenQueuePost.statusCode).toBe(200);
    const confirmedOrder = kitchenQueuePost.body.data.find((o) => o._id.toString() === orderId.toString());
    expect(confirmedOrder).toBeDefined();

    const startPrepRes = await request(app)
      .post(`/api/v1/kitchen/orders/${orderId}/start`)
      .set('Authorization', `Bearer ${kitchenToken}`);

    expect(startPrepRes.statusCode).toBe(200);
    expect(startPrepRes.body.data.orderStatus).toBe('PREPARING');

    // -------------------------------------------------------------
    // STEP 7: Kitchen finishes food & marks READY
    // -------------------------------------------------------------
    const markReadyRes = await request(app)
      .post(`/api/v1/kitchen/orders/${orderId}/ready`)
      .set('Authorization', `Bearer ${kitchenToken}`);

    expect(markReadyRes.statusCode).toBe(200);
    expect(markReadyRes.body.data.orderStatus).toBe('READY');

    // -------------------------------------------------------------
    // STEP 8: Waiter views Ready Orders & Claims order (TAKEN_BY_WAITER)
    // -------------------------------------------------------------
    const readyOrdersRes = await request(app)
      .get('/api/v1/waiter/orders/ready')
      .set('Authorization', `Bearer ${waiterToken}`);

    expect(readyOrdersRes.statusCode).toBe(200);
    const readyOrder = readyOrdersRes.body.data.find((o) => o._id.toString() === orderId.toString());
    expect(readyOrder).toBeDefined();

    const takeOrderRes = await request(app)
      .post(`/api/v1/waiter/orders/${orderId}/take`)
      .set('Authorization', `Bearer ${waiterToken}`);

    expect(takeOrderRes.statusCode).toBe(200);
    expect(takeOrderRes.body.data.orderStatus).toBe('TAKEN_BY_WAITER');

    // -------------------------------------------------------------
    // STEP 9: Waiter delivers to table (DELIVERED -> COMPLETED)
    // -------------------------------------------------------------
    const deliverOrderRes = await request(app)
      .post(`/api/v1/waiter/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${waiterToken}`);

    expect(deliverOrderRes.statusCode).toBe(200);
    expect(deliverOrderRes.body.data.orderStatus).toBe('COMPLETED');

    // -------------------------------------------------------------
    // STEP 10: Verify Complete Audit Trail for all transitions
    // -------------------------------------------------------------
    const history = await OrderStatusHistory.find({ orderId }).sort({ createdAt: 1 });
    expect(history.length).toBeGreaterThanOrEqual(4);
    const transitions = history.map((h) => `${h.fromStatus}->${h.toStatus}`);
    expect(transitions).toContain('WAITING_FOR_PAYMENT->CONFIRMED');
    expect(transitions).toContain('CONFIRMED->PREPARING');
    expect(transitions).toContain('PREPARING->READY');
    expect(transitions).toContain('READY->TAKEN_BY_WAITER');
    expect(transitions).toContain('TAKEN_BY_WAITER->DELIVERED');
  });
});
