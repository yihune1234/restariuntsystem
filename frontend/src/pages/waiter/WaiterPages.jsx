import React from "react";
import SharedWaiterDashboard from "../shared/WaiterDashboard";
import SharedWaiterTables from "../shared/WaiterTables";
import SharedWaiterActiveOrders from "../shared/WaiterActiveOrders";
import SharedWaiterOrderStatus from "../shared/WaiterOrderStatus";
import SharedCreateOrder from "../shared/CreateOrder";
import SharedStaffProfile from "../shared/StaffProfile";

export const WaiterDashboard = () => <SharedWaiterDashboard />;
export const WaiterTables = () => <SharedWaiterTables />;
export const WaiterCreateOrder = () => <SharedCreateOrder />;
export const WaiterActiveOrders = () => <SharedWaiterActiveOrders />;
export const WaiterOrderStatus = () => <SharedWaiterOrderStatus />;
export const WaiterProfile = () => <SharedStaffProfile />;
