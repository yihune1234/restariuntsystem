import axiosInstance from '../axios/axiosInstace';
import offlineDb from './offlineDb';
import useOfflineStore from '../store/useOfflineStore';

/**
 * Offline transaction sync.
 *
 * NOTE: LocalStorage / IndexedDB here is used ONLY as temporary technical
 * storage for records captured while the network is down (per the product
 * requirements, not as an authoritative database). When back online we push
 * the pending batch to the backend's authoritative `/offline-transactions/sync`
 * endpoint, which applies each record through the SAME normal business logic
 * (real Order / Payment / Stock records). Records are then removed from the
 * local queue once confirmed applied.
 */
export const syncEngine = {
  async checkAndSync() {
    const { isOnline, setSyncing, setLastSyncTime, addSyncError } = useOfflineStore.getState();
    if (!isOnline) return { success: false, reason: 'offline' };

    const pending = await offlineDb.getPendingTransactions();
    if (pending.length === 0) return { success: true, synced: 0 };

    setSyncing(true);
    try {
      const records = pending.map((tx) => ({
        clientRefId: tx.clientRefId,
        operationType: tx.operationType,
        originalTransactionTime: tx.originalTransactionTime || new Date().toISOString(),
        reason: tx.reason || 'Offline sync',
        source: tx.source || 'MANUAL',
        outageType: tx.outageType || 'OTHER',
        items: tx.items || [],
        subtotal: tx.subtotal || 0,
        total: tx.total || 0,
        tax: tx.tax || 0,
        discount: tx.discount || 0,
        serviceCharge: tx.serviceCharge || 0,
        paymentMethod: tx.paymentMethod,
        tableId: tx.tableId || null,
        stockData: tx.stockData || null,
        orderData: tx.orderData || null,
        paymentData: tx.paymentData || null,
        notes: tx.notes || '',
        customerCount: tx.customerCount || 1,
      }));

      // Authoritative server-side batch sync (reuses the normal order/payment/
      // stock services). Duplicate clientRefIds are ignored server-side.
      const res = await axiosInstance.post('/offline-transactions/sync', { records });

      // The backend batch-sync returns the results array directly.
      const results = Array.isArray(res.data?.data)
        ? res.data.data
        : (res.data?.data?.results || []);
      for (const r of results) {
        if (r.success) {
          await offlineDb.updateSyncStatus(r.clientRefId, 'SYNCED');
          useOfflineStore.getState().decrementPending();
        } else if (r.conflict) {
          await offlineDb.updateSyncStatus(r.clientRefId, 'CONFLICT', r.message);
          useOfflineStore.getState().setConflicts([
            ...useOfflineStore.getState().conflicts,
            { ...r, serverData: r.serverData },
          ]);
        } else {
          await offlineDb.updateSyncStatus(r.clientRefId, 'PENDING', r.message);
          addSyncError(r.message);
        }
      }

      await offlineDb.clearSyncedTransactions();
      setLastSyncTime(new Date().toISOString());
      return { success: true, synced: results.filter((r) => r.success).length };
    } catch (err) {
      addSyncError(err.response?.data?.message || err.message);
      return { success: false, message: err.response?.data?.message || err.message };
    } finally {
      setSyncing(false);
    }
  },

  async syncTransaction(_tx) {
    // Kept for callers that still invoke per-record; delegate to the batch path.
    return this.checkAndSync();
  },

  async resolveConflict(clientRefId, resolution) {
    const tx = await offlineDb.getAllPending().then(txs =>
      txs.find((t) => t.clientRefId === clientRefId)
    );
    if (!tx) return { success: false, message: 'Transaction not found' };

    if (resolution === 'USE_LOCAL') {
      await offlineDb.updateSyncStatus(clientRefId, 'PENDING');
      return this.checkAndSync();
    } else if (resolution === 'USE_SERVER') {
      await offlineDb.updateSyncStatus(clientRefId, 'SYNCED');
      useOfflineStore.getState().removeConflict(clientRefId);
      return { success: true };
    } else if (resolution === 'MERGE') {
      const merged = { ...tx, ...resolution.data, clientRefId };
      await offlineDb.addPendingTransaction(merged);
      return this.checkAndSync();
    }
    return { success: false, message: 'Invalid resolution' };
  },
};

export default syncEngine;
