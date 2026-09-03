import React from "react";
import RoleLayout from "../shared/RoleLayout";

/**
 * Waiter dashboard layout - role-protected in App routes.
 */
const WaiterLayout = () => <RoleLayout role="waiter" />;

export default WaiterLayout;