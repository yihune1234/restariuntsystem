const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const organizationRoutes = require('../modules/organizations/organization.routes');
const branchRoutesModule = require('../modules/branches/branch.routes');
const { userRouter, branchUserRouter } = require('../modules/users/user.routes');
const {
  tableRouter,
  branchTableRouter,
  publicQrRouter,
  publicBranchesRouter,
} = require('../modules/tables/table.routes');
const customerSessionRoutes = require('../modules/customer-sessions/customer-session.routes');
const {
  mealPeriodRouter,
  branchMealPeriodRouter,
} = require('../modules/menu/meal-period/meal-period.routes');
const {
  categoryRouter,
  branchCategoryRouter,
} = require('../modules/menu/category/category.routes');
const {
  foodRouter,
  branchFoodRouter,
} = require('../modules/menu/food/food.routes');
const uploadRoutes = require('../modules/uploads/upload.routes');
const publicMenuController = require('../modules/menu/public-menu.controller');
const {
  stockRouter,
  branchStockRouter,
} = require('../modules/inventory/stock.routes');
const {
  orderRouter,
  branchOrderRouter,
} = require('../modules/orders/order.routes');
const {
  paymentRouter,
  orderPaymentRouter,
} = require('../modules/payments/payment.routes');
const kitchenRoutes = require('../modules/kitchen/kitchen.routes');
const waiterRoutes = require('../modules/waiter/waiter.routes');
const {
  branchReportRouter,
  orgReportRouter,
} = require('../modules/reports/report.routes');
const {
  shiftRouter,
  branchShiftRouter,
} = require('../modules/shifts/shift.routes');
const { branchAuditRouter } = require('../modules/audit/audit.routes');
const dailyClosingRoutes = require('../modules/daily-closing/daily-closing.routes');
const fraudDetectionRoutes = require('../modules/fraud-detection/fraud-detection.routes');
const wasteRoutes = require('../modules/waste/waste.routes');
const customerFeedbackRoutes = require('../modules/customer-feedback/customer-feedback.routes');
const offlineTransactionRoutes = require('../modules/offline-transactions/offline-transaction.routes');
const refundRoutes = require('../modules/refunds/refund.routes');
const organizationSettingsRoutes = require('../modules/organization-settings/organization-settings.routes');

const router = express.Router();

// 1. System Health
router.use('/', healthRoutes);

// 2. Public Endpoints (No Auth Required)
router.use('/public/qr', publicQrRouter);
router.use('/public/branches', publicBranchesRouter);
router.get('/public/branches/:branchId/menu', publicMenuController.getPublicMenu);

// 3. Customer Sessions
router.use('/customer-sessions', customerSessionRoutes);

// 4. Staff Authentication
router.use('/auth', authRoutes);

// 5. Multi-Tenant Organizations
router.use('/organizations', organizationRoutes);
router.use('/organizations/:organizationId/reports', orgReportRouter);
router.use('/organizations/:organizationId/settings', organizationSettingsRoutes);

// 6. Multi-Branch Top-Level Management
router.use('/branches', branchRoutesModule);

// 7. Branch-Scoped Nested Routers (/branches/:branchId/*)
router.use('/branches/:branchId/users', branchUserRouter);
router.use('/branches/:branchId/tables', branchTableRouter);
router.use('/branches/:branchId/meal-periods', branchMealPeriodRouter);
router.use('/branches/:branchId/categories', branchCategoryRouter);
router.use('/branches/:branchId/food-items', branchFoodRouter);
router.use('/branches/:branchId/stock', branchStockRouter);
router.use('/branches/:branchId/orders', branchOrderRouter);
router.use('/branches/:branchId/reports', branchReportRouter);
router.use('/branches/:branchId/shifts', branchShiftRouter);
router.use('/branches/:branchId/audit-logs', branchAuditRouter);
router.use('/branches/:branchId/daily-closing', dailyClosingRoutes);
router.use('/branches/:branchId/fraud-detection', fraudDetectionRoutes);
router.use('/branches/:branchId/waste', wasteRoutes);

// 8. Direct Resource Routers
router.use('/users', userRouter);
router.use('/tables', tableRouter);
router.use('/meal-periods', mealPeriodRouter);
router.use('/categories', categoryRouter);
router.use('/food-items', uploadRoutes); // Mount upload route (/food-items/:foodId/image) before general router
router.use('/food-items', foodRouter);
router.use('/stock', stockRouter);

// 9. Orders & Order Payments
router.use('/orders/:orderId/payment', orderPaymentRouter);
router.use('/orders', orderRouter);

// 10. General Payments & Webhooks
router.use('/payments', paymentRouter);

// 11. Kitchen & Waiter Portals
router.use('/kitchen', kitchenRoutes);
router.use('/waiter', waiterRoutes);

// 12. Shifts
router.use('/shifts', shiftRouter);

// 13. Customer Feedback
router.use('/feedback', customerFeedbackRoutes);

// 14. Offline/Manual Transactions
// Routes carry their own :branchId (e.g. /offline-transactions/:branchId/pending).
router.use('/offline-transactions', offlineTransactionRoutes);

// 15. Refunds (separate from cancellation — linked to original payment)
router.use('/refunds', refundRoutes);

module.exports = router;
