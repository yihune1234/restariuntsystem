import React from "react";
import RoleLayout from "../shared/RoleLayout";
import { managerNav } from "../shared/roleConfig";

/**
 * Manager dashboard layout - role-protected.
 */
const ManagerLayout = () => <RoleLayout role="manager" />;

export default ManagerLayout;