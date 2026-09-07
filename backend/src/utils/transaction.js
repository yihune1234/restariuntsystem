const mongoose = require('mongoose');
const logger = require('../config/logger');

/**
 * Determine whether the connected MongoDB deployment supports multi-document
 * transactions (replica set / sharded cluster). Standalone mongod does not.
 */
function supportsTransactions() {
  return !!(mongoose.connection && mongoose.connection.replicaSet && mongoose.connection.replicaSet.length);
}

/**
 * Run a set of database operations either inside a MongoDB transaction (when
 * the connected deployment supports multi-document transactions) or as a plain
 * sequential fallback on a standalone mongod.
 *
 * Many local/dev setups run the app against a single-node `mongod`, where
 * `startSession().withTransaction()` throws:
 *   "Transaction numbers are only allowed on a replica set member or mongos".
 * Rather than failing every order, we fall back to running the operations
 * without a session. Production deployments using the replica-set
 * docker-compose will transparently keep full ACID semantics.
 *
 * @param {Function} work  async (session|null) => void — inner operations
 * @param {object} [opts]
 * @param {boolean} [opts.forceTransaction]  run a real transaction regardless
 */
async function runInTransaction(work, { forceTransaction = false } = {}) {
  // Always create a session object so downstream code can scope queries with
  // `.session(session)` without null-guards. We only invoke `withTransaction()`
  // (which requires a replica set) when the deployment supports it.
  const session = await mongoose.startSession();

  if (supportsTransactions() || forceTransaction) {
    try {
      await session.withTransaction(() => work(session));
      return;
    } finally {
      await session.endSession();
    }
  }

  // Standalone mongod fallback: run operations sequentially, same session
  // but no multi-document atomicity.
  try {
    await work(session);
  } finally {
    await session.endSession();
  }
}

module.exports = { runInTransaction, supportsTransactions };