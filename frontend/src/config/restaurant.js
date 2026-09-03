/**
 * Single-source configuration for the DEFAULT restaurant / branch.
 *
 * Today the system runs a single restaurant: Faarees Kaafee fi Restoorraantii
 * (ፋሪስ ካፌ እና ሬስቶራንት). The backend stores the branch under a technical name
 * (e.g. "Bole Medhanialem Branch"), but the public experience must present the
 * real brand. To keep future multi-restaurant support, none of these values are
 * hardcoded across pages — every public screen resolves branding through
 * `applyDefaultBrand()` (see below) which merges THIS display brand on top of the
 * real branch data returned by the backend.
 *
 * Future behaviour (when multiple restaurants are added):
 *   <RestaurantSelector/> -> Restaurant A -> useApplyBrand(A)
 *                          -> Restaurant B -> useApplyBrand(B)
 *                          -> Restaurant C -> useApplyBrand(C)
 *
 * Today's behaviour:
 *   Application -> existing default branch -> menu
 */

/** Visible brand for the default restaurant. */
export const DEFAULT_RESTAURANT = {
  nameEn: "Faarees Kaafee fi Restoorraantii",
  nameAm: "ፋሪስ ካፌ እና ሪስቶራንት",
  logoText: "Faarees",
  tagline: "Specialty coffee & traditional dishes, served fresh every day.",
  description:
    "Specialty coffee, freshly brewed drinks and authentic traditional meals in a warm, welcoming café-restaurant.",
  logoUrl: "",
};

/** Hardcoded default branch ID — single-restaurant mode. */
export const DEFAULT_BRANCH_ID = "6a996ed977f5f01311afa276";

/**
 * Pick the branch to treat as the current default restaurant from the list of
 * public branches returned by the backend.
 *
 * Single-restaurant mode: returns DEFAULT_BRANCH_ID directly, bypassing the
 * branch list. The branch list is still fetched (for future multi-restaurant
 * support) but the configured default is always used.
 */
export function resolveDefaultBranchId(branches = []) {
  return DEFAULT_BRANCH_ID;
}

/**
 * Merge the configured display brand on top of real backend branch data.
 * Never mutates the argument; returns a new object safe to render.
 *
 * Backend branch fields are preserved (id, address, phone, settings, currency,
 * open/close times...). Only the "marketing" display fields fall back to the
 * configured brand so the UI shows the true restaurant identity.
 */
export function applyDefaultBrand(branch) {
  if (!branch) return branch;
  const displayName =
    DEFAULT_RESTAURANT.nameEn ||
    branch.name ||
    branch.id?.toString?.() ||
    "Faarees Kaafee fi Restoorraantii";
  return {
    ...branch,
    name: displayName,
    // Keep an alias to the raw backend name (useful for debugging / future use).
    apiName: branch.name,
    nameAm: DEFAULT_RESTAURANT.nameAm,
    tagline: DEFAULT_RESTAURANT.tagline,
    description: DEFAULT_RESTAURANT.description,
    logoText: DEFAULT_RESTAURANT.logoText,
    logoUrl: DEFAULT_RESTAURANT.logoUrl,
  };
}

/** Convenience: display string combining the branded name + Amharic name. */
export function restaurantTitle(branch) {
  const branded = applyDefaultBrand(branch);
  const am = DEFAULT_RESTAURANT.nameAm;
  return am && am !== branded.name ? `${branded.name} · ${am}` : branded.name;
}