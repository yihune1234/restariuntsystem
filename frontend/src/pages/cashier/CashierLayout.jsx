import React from "react";
import RoleLayout from "../shared/RoleLayout";

/**
 * Cashier dashboard layout - role-protected in App routes.
 */
const CashierLayout = () => <RoleLayout role="cashier" />;

export default CashierLayout;