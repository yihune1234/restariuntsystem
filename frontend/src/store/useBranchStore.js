import { create } from "zustand";
import { toast } from "sonner";
import axiosInstance from "../axios/axiosInstace";
import { getDefaultOrganizationId, getDefaultBranchId } from "../config/defaultOrg";
import { buildCustomerQrUrl } from "../lib/qrUrl";

/**
 * Branch + Organization store.
 *
 * In single-branch mode, organization context is auto-resolved.
 * All methods that previously required an organizationId parameter now
 * automatically use the default organization from the auth user.
 *
 * Backend endpoints used:
 *   GET    /branches                                  - Owner only (lists all in org)
 *   GET    /branches/:branchId                        - any staff in the branch
 *   PATCH  /branches/:branchId                        - Owner/Manager
 *   DELETE /branches/:branchId                        - Owner only
 *   GET    /public/branches                           - public list (no auth) - landing
 *   GET    /organizations/:organizationId/branches    - all branches in an org
 *   POST   /organizations/:organizationId/branches    - create branch under org
 *   GET    /organizations/:organizationId             - org details
 *   PATCH  /organizations/:organizationId             - update org
 *   POST   /tables/:tableId/regenerate-qr            - rotate a table's QR token
 */
export const useBranchStore = create((set, get) => ({
  branches: [],
  organizations: [],
  currentBranch: null,
  isLoading: false,
  error: null,

  /**
   * Public listing of branches (no auth). Returns minimal fields needed for
   * the public marketing landing page: name, address, phone, open hours,
   * currency. No organization / financial / staff data is exposed.
   */
  fetchPublicBranches: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get("/public/branches");
      const list = res.data?.data || [];
      set({ branches: list, isLoading: false });
      return list;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Error fetching branches" });
      return [];
    }
  },

  /**
   * Fetch branches for the current organization.
   * In single-branch mode, if no organizationId is provided, the default is auto-resolved.
   */
  fetchBranches: async (organizationId) => {
    set({ isLoading: true, error: null });
    try {
      const orgId = organizationId || getDefaultOrganizationId();
      if (!orgId) {
        set({ branches: [], isLoading: false, error: null });
        return [];
      }
      const res = await axiosInstance.get(`/organizations/${orgId}/branches`);
      const data = res.data?.data;
      const list = Array.isArray(data) ? data : data?.branches || [];
      set({ branches: list, isLoading: false, error: null });
      return list;
    } catch (err) {
      const msg = err.backendMessage || "Error fetching branches";
      set({ isLoading: false, error: msg });
      return [];
    }
  },

  fetchBranch: async (branchId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get(`/branches/${branchId}`);
      const branch = res.data?.data;
      set({ currentBranch: branch, isLoading: false });
      return branch;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Error fetching branch" });
      return null;
    }
  },

  /**
   * Fetch the current organization. In single-branch mode, this returns
   * the single default organization.
   */
  fetchOrganizations: async () => {
    set({ isLoading: true, error: null });
    try {
      const orgId = getDefaultOrganizationId();
      if (!orgId) {
        set({ organizations: [], isLoading: false });
        return [];
      }
      const res = await axiosInstance.get(`/organizations/${orgId}`);
      const org = res.data?.data;
      const list = org ? [org] : [];
      set({ organizations: list, isLoading: false });
      return list;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Error fetching organization" });
      return [];
    }
  },

  fetchOrganization: async (organizationId) => {
    set({ isLoading: true, error: null });
    try {
      const orgId = organizationId || getDefaultOrganizationId();
      if (!orgId) {
        set({ isLoading: false });
        return null;
      }
      const res = await axiosInstance.get(`/organizations/${orgId}`);
      const org = res.data?.data;
      set({ isLoading: false });
      return org;
    } catch (err) {
      set({ isLoading: false, error: err.backendMessage || "Error fetching organization" });
      return null;
    }
  },

  createBranch: async (organizationId, data) => {
    try {
      const orgId = organizationId || getDefaultOrganizationId();
      if (!orgId) {
        toast.error("No organization context available");
        return { success: false, message: "No organization context" };
      }
      const res = await axiosInstance.post(
        `/organizations/${orgId}/branches`,
        data
      );
      const branch = res.data?.data;
      toast.success("Branch created");
      get().fetchBranches(orgId);
      return { success: true, branch };
    } catch (err) {
      const msg = err.backendMessage || "Failed to create branch";
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  updateBranch: async (branchId, data) => {
    try {
      const res = await axiosInstance.patch(`/branches/${branchId}`, data);
      const branch = res.data?.data;
      toast.success("Branch updated");
      set({ currentBranch: branch });
      return { success: true, branch };
    } catch (err) {
      const msg = err.backendMessage || "Failed to update branch";
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  deleteBranch: async (branchId) => {
    try {
      await axiosInstance.delete(`/branches/${branchId}`);
      toast.success("Branch deactivated");
      get().fetchBranches();
      return { success: true };
    } catch (err) {
      const msg = err.backendMessage || "Failed to delete branch";
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  // Regenerates the QR for a chosen table (used by Branch Settings). The backend
  // exposes both POST /branches/:branchId/generate-qr (general branch QR) and
  // POST /tables/:tableId/regenerate-qr (per-table QR). This helper uses the
  // table-level endpoint so each table gets its own scannable token.
  //
  // The encoded URL MUST be /customer/qr/<branchId>?t=<qrToken>: the route
  // param is the BRANCH id and the token rides along as ?t=. Putting the token
  // in the branch slot (old behaviour) breaks session creation AND the menu
  // fetch for the customer.
  generateQr: async (tableId) => {
    try {
      const res = await axiosInstance.post(`/tables/${tableId}/regenerate-qr`);
      const table = res.data?.data;
      // Build the public-facing URL from the CURRENT origin so the printed QR
      // always points at a host the customer's phone can reach (see lib/qrUrl.js).
      const branchId =
        table?.branchId?._id || table?.branchId || getDefaultBranchId();
      const url = buildCustomerQrUrl(branchId, table.qrToken);
      return { success: true, qr: { url }, table };
    } catch (err) {
      const msg = err.backendMessage || "Failed to generate QR";
      toast.error(msg);
      return { success: false, message: msg };
    }
  },
}));