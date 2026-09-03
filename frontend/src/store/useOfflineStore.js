import { create } from 'zustand';

const useOfflineStore = create((set, get) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  syncErrors: [],
  conflicts: [],

  init: () => {
    const handleOnline = () => set({ isOnline: true });
    const handleOffline = () => set({ isOnline: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    set({ isOnline: navigator.onLine });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },

  setOnline: (isOnline) => set({ isOnline }),
  
  setSyncing: (isSyncing) => set({ isSyncing }),
  
  setPendingCount: (count) => set({ pendingCount: count }),
  
  decrementPending: () => set((state) => ({ 
    pendingCount: Math.max(0, state.pendingCount - 1) 
  })),
  
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  
  addSyncError: (error) => set((state) => ({ 
    syncErrors: [...state.syncErrors, { message: error, time: new Date().toISOString() }] 
  })),
  
  clearSyncErrors: () => set({ syncErrors: [] }),
  
  setConflicts: (conflicts) => set({ conflicts }),
  
  removeConflict: (clientRefId) => set((state) => ({
    conflicts: state.conflicts.filter(c => c.clientRefId !== clientRefId)
  })),
  
  clearConflicts: () => set({ conflicts: [] }),
}));

export { useOfflineStore };
export default useOfflineStore;
