import { describe, it, expect, beforeEach } from 'vitest';
import { useInventoryStore } from '../../store/useInventoryStore';

describe('useInventoryStore', () => {
    beforeEach(() => {
        useInventoryStore.setState({
            items: [],
            stats: null,
            isLoading: false,
            error: null,
        });
    });

    it('should initialize with empty daily-stock items', () => {
        const state = useInventoryStore.getState();
        expect(state.items).toEqual([]);
        expect(state.isLoading).toBe(false);
        // New contract: fetchTodayStock + setDailyStock
        expect(typeof state.fetchTodayStock).toBe('function');
        expect(typeof state.setDailyStock).toBe('function');
        expect(typeof state.bulkSetDailyStock).toBe('function');
        expect(typeof state.updateStock).toBe('function');
    });

    it('should correctly mutate optimistic loading state', () => {
        useInventoryStore.setState({ isLoading: true });
        expect(useInventoryStore.getState().isLoading).toBe(true);
    });
});
