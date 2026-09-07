const { canTransition, ALLOWED_TRANSITIONS } = require('../../src/modules/orders/order-state-machine');

describe('Order State Machine Unit Tests', () => {
  test('should allow valid transitions from WAITING_FOR_PAYMENT to CONFIRMED or CANCELLED', () => {
    expect(canTransition('WAITING_FOR_PAYMENT', 'CONFIRMED')).toBe(true);
    expect(canTransition('WAITING_FOR_PAYMENT', 'CANCELLED')).toBe(true);
  });

  test('should reject invalid transitions from WAITING_FOR_PAYMENT directly to READY or DELIVERED', () => {
    expect(canTransition('WAITING_FOR_PAYMENT', 'READY')).toBe(false);
    expect(canTransition('WAITING_FOR_PAYMENT', 'PREPARING')).toBe(false);
    expect(canTransition('WAITING_FOR_PAYMENT', 'DELIVERED')).toBe(false);
    expect(canTransition('WAITING_FOR_PAYMENT', 'COMPLETED')).toBe(false);
  });

  test('should allow CONFIRMED to transition to PREPARING or CANCELLED', () => {
    expect(canTransition('CONFIRMED', 'PREPARING')).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
    expect(canTransition('CONFIRMED', 'DELIVERED')).toBe(false);
  });

  test('should allow PREPARING to transition to READY or CANCELLED', () => {
    expect(canTransition('PREPARING', 'READY')).toBe(true);
    expect(canTransition('PREPARING', 'CANCELLED')).toBe(true);
    expect(canTransition('PREPARING', 'COMPLETED')).toBe(false);
  });

  test('should allow READY to transition to TAKEN_BY_WAITER or CANCELLED', () => {
    expect(canTransition('READY', 'TAKEN_BY_WAITER')).toBe(true);
    expect(canTransition('READY', 'CANCELLED')).toBe(true);
  });

  test('should allow TAKEN_BY_WAITER to transition to DELIVERED or CANCELLED', () => {
    expect(canTransition('TAKEN_BY_WAITER', 'DELIVERED')).toBe(true);
    expect(canTransition('TAKEN_BY_WAITER', 'CANCELLED')).toBe(true);
  });

  test('should allow DELIVERED to transition to COMPLETED', () => {
    expect(canTransition('DELIVERED', 'COMPLETED')).toBe(true);
  });

  test('should not allow transitions from terminal states COMPLETED or CANCELLED', () => {
    expect(canTransition('COMPLETED', 'CONFIRMED')).toBe(false);
    expect(canTransition('CANCELLED', 'CONFIRMED')).toBe(false);
  });
});
