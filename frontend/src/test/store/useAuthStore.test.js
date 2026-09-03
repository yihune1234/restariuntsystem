import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the axios instance AND the STORAGE_KEYS named export that the
// auth store imports from the same module.
vi.mock('../../axios/axiosInstace', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
    STORAGE_KEYS: {
        accessToken: 'ts_access_token',
        refreshToken: 'ts_refresh_token',
        customerSessionToken: 'ts_customer_session_token',
        user: 'ts_user',
    },
}));

import { useAuthStore } from '../../store/useAuthStore';
import axiosInstance from '../../axios/axiosInstace';
import { toast } from 'sonner';

describe('useAuthStore', () => {
    beforeEach(() => {
        useAuthStore.setState({
            authUser: null,
            isLoading: false,
            isCheckingAuth: false,
            isLoggingIn: false,
            isSigningUp: false
        });
        vi.clearAllMocks();
    });

    it('should check auth successfully', async () => {
        const userData = { _id: '1', name: 'Admin', role: 'OWNER' };
        // Backend wraps response in { success, data }
        axiosInstance.get.mockResolvedValue({ data: { success: true, data: userData } });

        // Simulate a logged-in state by populating localStorage with a token.
        // The new checkAuth() only fires when a token is present.
        localStorage.setItem('ts_access_token', 'fake-token');

        await useAuthStore.getState().checkAuth();

        expect(useAuthStore.getState().authUser).toEqual(userData);
        expect(useAuthStore.getState().isCheckingAuth).toBe(false);
        expect(axiosInstance.get).toHaveBeenCalledWith('/auth/me');

        localStorage.removeItem('ts_access_token');
    });

    it('should handle check auth failure', async () => {
        axiosInstance.get.mockRejectedValue(new Error('Unauthorized'));
        localStorage.setItem('ts_access_token', 'fake-token');

        await useAuthStore.getState().checkAuth();

        expect(useAuthStore.getState().authUser).toBeNull();
        expect(useAuthStore.getState().isCheckingAuth).toBe(false);

        localStorage.removeItem('ts_access_token');
    });

    it('should login successfully', async () => {
        const credentials = { email: 'owner@habesha.com', password: 'Password123!' };
        const userData = { id: '1', name: 'Owner', role: 'OWNER' };
        // Backend returns { data: { accessToken, refreshToken, user } }
        axiosInstance.post.mockResolvedValue({ data: { data: { user: userData } } });

        await useAuthStore.getState().login(credentials);

        expect(useAuthStore.getState().authUser).toEqual(userData);
        expect(axiosInstance.post).toHaveBeenCalledWith('/auth/login', credentials);
    });

    it('should handle login failure', async () => {
        const errorMsg = 'Invalid email or password';
        axiosInstance.post.mockRejectedValue({
            response: { data: { message: errorMsg } },
            backendMessage: errorMsg,
        });

        const res = await useAuthStore.getState().login({ email: 'wrong@test.com', password: 'bad' });

        expect(res.success).toBe(false);
        expect(useAuthStore.getState().authUser).toBeNull();
        expect(toast.error).toHaveBeenCalledWith(errorMsg);
    });

    it('should refuse public signup and inform the user', async () => {
        const res = await useAuthStore.getState().signup({ name: 'X', email: 'x@x', password: 'x' });
        expect(res.success).toBe(false);
        expect(axiosInstance.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalled();
    });

    it('should logout successfully', async () => {
        useAuthStore.setState({ authUser: { name: 'Owner' } });

        await useAuthStore.getState().logout();

        expect(useAuthStore.getState().authUser).toBeNull();
        // logout posts to /auth/logout but swallows failures
        expect(toast.success).toHaveBeenCalledWith('Logged out');
    });
});
