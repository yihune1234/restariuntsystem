import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMenuStore } from '../../store/useMenuStore';
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

describe('useMenuStore', () => {
    beforeEach(() => {
        useMenuStore.setState({
            isLoading: false,
            error: null,
            menu: [],
            category: [],
            mealTypes: [],
            publicMenu: null,
            publicBranch: null,
        });
        vi.clearAllMocks();
    });

    // --- Categories (real backend: /branches/:branchId/categories) ---

    it('should fetch categories by branch', async () => {
        const categories = [{ _id: 'c1', name: 'DRINKS' }];
        axiosInstance.get.mockResolvedValue({ data: { data: categories } });

        await useMenuStore.getState().getCategoriesByBranch('b1');

        expect(useMenuStore.getState().category).toEqual(categories);
        expect(axiosInstance.get).toHaveBeenCalledWith('/branches/b1/categories', { params: {} });
    });

    it('should create a category in a branch', async () => {
        const newCategory = { _id: 'c2', name: 'DESSERTS' };
        axiosInstance.post.mockResolvedValue({ data: { data: newCategory } });

        const res = await useMenuStore.getState().createCategory('b1', { name: 'DESSERTS' });

        expect(res.success).toBe(true);
        expect(useMenuStore.getState().category).toContainEqual(newCategory);
    });

    it('should update a category by id', async () => {
        useMenuStore.setState({ category: [{ _id: 'c1', name: 'DRINKS' }] });
        const updated = { _id: 'c1', name: 'SOFT DRINKS' };
        axiosInstance.patch.mockResolvedValue({ data: { data: updated } });

        const res = await useMenuStore.getState().updateCategory('c1', { name: 'SOFT DRINKS' });

        expect(res.success).toBe(true);
        expect(useMenuStore.getState().category[0].name).toBe('SOFT DRINKS');
    });

    it('should delete a category', async () => {
        useMenuStore.setState({ category: [{ _id: 'c1', name: 'DRINKS' }] });
        axiosInstance.delete.mockResolvedValue({});

        const res = await useMenuStore.getState().deleteCategory('c1');

        expect(res.success).toBe(true);
        expect(useMenuStore.getState().category).toHaveLength(0);
    });

    // --- Meal Periods ---

    it('should fetch meal periods by branch', async () => {
        const mealTypes = [{ _id: 'mp1', name: 'LUNCH', startTime: '11:30', endTime: '16:00' }];
        axiosInstance.get.mockResolvedValue({ data: { data: mealTypes } });

        await useMenuStore.getState().getMealPeriodsByBranch('b1');

        expect(useMenuStore.getState().mealTypes).toEqual(mealTypes);
        expect(axiosInstance.get).toHaveBeenCalledWith('/branches/b1/meal-periods', { params: {} });
    });

    it('should fetch the public menu (no auth)', async () => {
        const data = { branch: { name: 'Bole' }, menu: [{ categories: [{ foodItems: [] }] }] };
        axiosInstance.get.mockResolvedValue({ data: { data } });

        const result = await useMenuStore.getState().fetchPublicMenu('b1');

        expect(useMenuStore.getState().publicBranch).toEqual(data.branch);
        expect(result).toEqual(data);
        expect(axiosInstance.get).toHaveBeenCalledWith('/public/branches/b1/menu', { params: {} });
    });

    it('should create a food item', async () => {
        const newItem = { _id: 'i2', name: 'Tea', price: 3 };
        axiosInstance.post.mockResolvedValue({ data: { data: newItem } });

        const res = await useMenuStore.getState().createFoodItem('b1', { name: 'Tea', price: 3 });

        expect(res.success).toBe(true);
        expect(useMenuStore.getState().menu).toContainEqual(newItem);
    });

    it('should handle errors during API calls', async () => {
        const errorMsg = 'Network Error';
        axiosInstance.get.mockRejectedValue({
            response: { data: { message: errorMsg } },
            backendMessage: errorMsg,
        });

        await useMenuStore.getState().getCategoriesByBranch('b1');

        expect(useMenuStore.getState().error).toBe(errorMsg);
        expect(useMenuStore.getState().isLoading).toBe(false);
    });
});
