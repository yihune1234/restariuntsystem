/**
 * Socket.IO Room Name Helpers
 */

const getBranchRoom = (branchId) => `branch:${branchId}`;
const getCashierRoom = (branchId) => `branch:${branchId}:cashiers`;
const getKitchenRoom = (branchId) => `branch:${branchId}:kitchen`;
const getWaiterRoom = (branchId) => `branch:${branchId}:waiters`;
const getManagerRoom = (branchId) => `branch:${branchId}:managers`;
const getOrderRoom = (orderId) => `order:${orderId}`;
const getCustomerSessionRoom = (sessionId) => `customer-session:${sessionId}`;

module.exports = {
  getBranchRoom,
  getCashierRoom,
  getKitchenRoom,
  getWaiterRoom,
  getManagerRoom,
  getOrderRoom,
  getCustomerSessionRoom,
};
