const orderService = require('./order.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');
const { ForbiddenError } = require('../../utils/errors');

class OrderController {
  createOrder = asyncHandler(async (req, res) => {
    const { branchId, tableId, items, source, customerName, customerNote } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    let customerSessionId = null;
    let createdBy = null;

    if (req.customerSession) {
      customerSessionId = req.customerSession.id;
    } else if (req.user) {
      createdBy = req.user.id;
    }

    const order = await orderService.createOrder({
      branchId: req.body.branchId || req.customerSession?.branchId,
      tableId: req.body.tableId || req.customerSession?.tableId,
      customerSessionId,
      customerName: customerName ?? null,
      customerNote: customerNote ?? '',
      items,
      source: req.user ? 'CASHIER' : source || 'CUSTOMER_QR',
      createdBy,
      ipAddress,
      userAgent,
    });

    return ApiResponse.created(res, 'Order placed successfully', order);
  });

  getOrderById = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderById(req.params.orderId);

    // If customer is querying, ensure they own the order through their session or match security code
    if (req.customerSession) {
      if (
        order.customerSessionId &&
        order.customerSessionId.toString() !== req.customerSession.id.toString()
      ) {
        throw new ForbiddenError('Access denied: You cannot view another customer order', 'FORBIDDEN_ORDER_ACCESS');
      }
    }

    return ApiResponse.success(res, 200, 'Order retrieved successfully', order);
  });

  getBranchOrders = asyncHandler(async (req, res) => {
    const result = await orderService.getBranchOrders(req.params.branchId, req.query);
    return ApiResponse.success(res, 200, 'Branch orders retrieved successfully', result.orders, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  });

  cancelOrder = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const order = await orderService.cancelOrder({
      orderId: req.params.orderId,
      staffUser: req.user || null,
      reason,
      ipAddress,
      userAgent,
    });

    return ApiResponse.success(res, 200, 'Order cancelled successfully', order);
  });

  getTableSessionOrders = asyncHandler(async (req, res) => {
    const { tableId } = req.params;
    const result = await orderService.getTableSessionOrders(tableId);
    return ApiResponse.success(res, 200, 'Table session orders retrieved', result);
  });

  getTableBill = asyncHandler(async (req, res) => {
    const { tableId } = req.params;
    const result = await orderService.getTableBill(tableId);
    return ApiResponse.success(res, 200, 'Table bill retrieved', result);
  });

  /** STAFF: resolve a customer's 4-digit pickup code to the active order(s). */
  getOrdersBySecurityCode = asyncHandler(async (req, res) => {
    const { branchId, code } = req.params;
    const result = await orderService.getOrdersBySecurityCode(branchId, code);
    return ApiResponse.success(res, 200, 'Order found for pickup code', result.matches, {
      count: result.count,
    });
  });

  /** PUBLIC: minimal order status lookup by pickup code (no auth, rate limited). */
  getOrderBySecurityCodePublic = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderBySecurityCode(req.params.code);
    return ApiResponse.success(res, 200, 'Order found', order);
  });
}

module.exports = new OrderController();
