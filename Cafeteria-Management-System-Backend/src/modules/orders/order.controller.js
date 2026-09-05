const orderService = require('./order.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');
const { ForbiddenError } = require('../../utils/errors');

class OrderController {
  createOrder = asyncHandler(async (req, res) => {
    const { tableId, items, source, customerName, customerNote } = req.body;

    let createdBy = null;
    if (req.user) {
      createdBy = req.user.id;
    }

    const order = await orderService.createOrder({
      tableId: tableId || req.body.tableId,
      customerName: customerName ?? null,
      customerNote: customerNote ?? '',
      items,
      source: req.user ? 'CASHIER' : source || 'CUSTOMER_QR',
      createdBy,
    });

    return ApiResponse.created(res, 'Order placed successfully', order);
  });

  getOrderById = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderById(req.params.orderId);
    return ApiResponse.success(res, 200, 'Order retrieved successfully', order);
  });

  getOrders = asyncHandler(async (req, res) => {
    const result = await orderService.getOrders(req.query);
    return ApiResponse.success(res, 200, 'Orders retrieved successfully', result.orders, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  });

  cancelOrder = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const order = await orderService.cancelOrder({
      orderId: req.params.orderId,
      reason,
    });
    return ApiResponse.success(res, 200, 'Order cancelled successfully', order);
  });

  completeOrder = asyncHandler(async (req, res) => {
    const order = await orderService.completeOrder(req.params.orderId);
    return ApiResponse.success(res, 200, 'Order completed successfully', order);
  });

  getOrderBySecurityCodePublic = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderBySecurityCode(req.params.code);
    return ApiResponse.success(res, 200, 'Order found', order);
  });
}

module.exports = new OrderController();
