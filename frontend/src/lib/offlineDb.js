import { openDB } from 'idb';

const DB_NAME = 'tasty-station-offline';
const DB_VERSION = 1;

let dbPromise = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pendingTransactions')) {
          const txStore = db.createObjectStore('pendingTransactions', { keyPath: 'clientRefId' });
          txStore.createIndex('by-status', 'syncStatus');
          txStore.createIndex('by-createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

export const offlineDb = {
  async addPendingTransaction(transaction) {
    const db = await getDB();
    return db.put('pendingTransactions', {
      ...transaction,
      syncStatus: 'PENDING',
      createdAt: transaction.createdAt || new Date().toISOString(),
      retryCount: 0,
    });
  },

  async getPendingTransactions() {
    const db = await getDB();
    return db.getAllFromIndex('pendingTransactions', 'by-status', 'PENDING');
  },

  async getAllPending() {
    const db = await getDB();
    return db.getAll('pendingTransactions');
  },

  async updateSyncStatus(clientRefId, status, error = null) {
    const db = await getDB();
    const tx = await db.get('pendingTransactions', clientRefId);
    if (tx) {
      tx.syncStatus = status;
      tx.lastSyncAttempt = new Date().toISOString();
      if (error) tx.lastError = error;
      if (status === 'PENDING') tx.retryCount = (tx.retryCount || 0) + 1;
      await db.put('pendingTransactions', tx);
    }
    return tx;
  },

  async removeTransaction(clientRefId) {
    const db = await getDB();
    return db.delete('pendingTransactions', clientRefId);
  },

  async clearSyncedTransactions() {
    const db = await getDB();
    const all = await db.getAll('pendingTransactions');
    const synced = all.filter(tx => tx.syncStatus === 'SYNCED');
    for (const tx of synced) {
      await db.delete('pendingTransactions', tx.clientRefId);
    }
  },

  async getPendingCount() {
    const pending = await this.getPendingTransactions();
    return pending.length;
  },

  async getSyncMeta(key) {
    const db = await getDB();
    const record = await db.get('syncMeta', key);
    return record?.value;
  },

  async setSyncMeta(key, value) {
    const db = await getDB();
    return db.put('syncMeta', { key, value });
  },
};

export default offlineDb;
