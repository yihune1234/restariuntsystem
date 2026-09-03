import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTableStore } from '../../store/useTableStore';
import axiosInstance from '../../axios/axiosInstace';

// Inline mock required by Vitest 4 (the setup-file vi.mock is not always
// resolved for nested test file paths).
vi.mock('../../axios/axiosInstace', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
    STORAGE_KEYS: {
        accessToken: 'ts_access_token',
        refreshToken: 'ts_refresh_token',
        customerSessionToken: 'ts_customer_session_token',
        user: 'ts_user',
    },
}));

describe('useTableStore', () => {
    beforeEach(() => {
        useTableStore.setState({
            tables: [],
            isLoading: false,
            error: null
        });
        vi.clearAllMocks();
    });

    it('should fetch tables by branch', async () => {
        const tables = [{ _id: 't1', tableNumber: '1', status: 'AVAILABLE' }];
        axiosInstance.get.mockResolvedValue({ data: { data: tables } });

        await useTableStore.getState().getTablesByBranch('b1');

        expect(useTableStore.getState().tables).toEqual(tables);
        expect(axiosInstance.get).toHaveBeenCalledWith('/branches/b1/tables');
    });

    it('should create a table', async () => {
        const newTable = { _id: 't2', tableNumber: '2', capacity: 4 };
        axiosInstance.post.mockResolvedValue({ data: { data: newTable } });

        const result = await useTableStore.getState().createTable('b1', { tableNumber: '2', capacity: 4 });

        expect(result.success).toBe(true);
        expect(useTableStore.getState().tables).toContainEqual(newTable);
    });

    it('should update a table', async () => {
        const initialTable = { _id: 't1', tableNumber: '1' };
        const updatedTable = { _id: 't1', tableNumber: '1-Updated' };
        useTableStore.setState({ tables: [initialTable] });
        axiosInstance.patch.mockResolvedValue({ data: { data: updatedTable } });

        const result = await useTableStore.getState().updateTable('t1', { tableNumber: '1-Updated' });

        expect(result.success).toBe(true);
        expect(useTableStore.getState().tables[0].tableNumber).toBe('1-Updated');
    });

    it('should regenerate a table QR', async () => {
        const table = { _id: 't1', qrToken: 'oldtoken', status: 'AVAILABLE' };
        const rotated = { _id: 't1', qrToken: 'newtoken', status: 'AVAILABLE' };
        useTableStore.setState({ tables: [table] });
        axiosInstance.post.mockResolvedValue({ data: { data: rotated } });

        const result = await useTableStore.getState().regenerateQr('t1');

        expect(result.success).toBe(true);
        expect(useTableStore.getState().tables[0].qrToken).toBe('newtoken');
        expect(axiosInstance.post).toHaveBeenCalledWith('/tables/t1/regenerate-qr');
    });

    it('should delete a table', async () => {
        useTableStore.setState({ tables: [{ _id: 't1' }, { _id: 't2' }] });
        axiosInstance.delete.mockResolvedValue({ data: { message: 'deleted' } });

        const result = await useTableStore.getState().deleteTable('t1');

        expect(result.success).toBe(true);
        expect(useTableStore.getState().tables.find((t) => t._id === 't1')).toBeUndefined();
    });

    it('should handle API errors', async () => {
        const errorMsg = 'Table already exists';
        axiosInstance.post.mockRejectedValue({
            response: { data: { message: errorMsg } },
            backendMessage: errorMsg,
        });

        const result = await useTableStore.getState().createTable('b1', { tableNumber: '1' });

        expect(result.success).toBe(false);
        expect(result.message).toBe(errorMsg);
    });
});
