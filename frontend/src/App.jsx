import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import { useThemeStore } from './store/useThemeStore'
import { useOrderStore } from './store/useOrderStore'
import { useOfflineStore } from './store/useOfflineStore'
import { connectSocket, disconnectSocket } from './config/socket.config'
import RoleRoute from './routes/ProtectedRoute'
import { Loader } from 'lucide-react'

// Auth
import Login from './pages/Auth/Login'

// Role layouts
import WaiterLayout from './pages/waiter/WaiterLayout'
import CashierLayout from './pages/cashier/CashierLayout'
import KitchenLayout from './pages/kitchen/KitchenLayout'
import ManagerLayout from './pages/manager/ManagerLayout'
import OwnerLayout from './pages/owner/OwnerLayout'

// Customer (public, no account)
import CustomerHome from './pages/customer/Home'
import CustomerMenu from './pages/customer/Menu'
import CustomerItem from './pages/customer/ItemDetail'
import CustomerCart from './pages/customer/Cart'
import CustomerCheckout from './pages/customer/Checkout'
import CustomerConfirmed from './pages/customer/Confirmed'
import CustomerTrack from './pages/customer/Track'
import CustomerHistory from './pages/customer/History'
import CustomerQrLanding from './pages/customer/QrLanding'
import CustomerFeedback from './pages/customer/CustomerFeedback'

// Waiter pages
import { WaiterDashboard, WaiterTables, WaiterCreateOrder, WaiterActiveOrders, WaiterOrderStatus, WaiterProfile } from './pages/waiter/WaiterPages'
// Cashier pages
import { CashierDashboard, CashierCreateOrder, CashierProfile, CashierTransactions } from './pages/cashier/CashierPages'
import CashierManualEntry from './pages/cashier/CashierManualEntry'
import RefundManagement from './pages/shared/RefundManagement'
import TableCapacityOverview from './pages/shared/TableCapacityOverview'
import { CashierPayments } from './pages/cashier/CashierPayments'
// Kitchen + Manager + Owner pages
import { KitchenDashboard, KitchenProfile } from './pages/kitchen/KitchenPages'
import { ManagerDashboard, ManagerOrders, ManagerKitchen, ManagerTables, ManagerPayments, ManagerTransactions, ManagerCustomers, ManagerMenu, ManagerStaff, ManagerProfile, ManagerReports, ManagerBranchSettings, ManagerInventoryPage, ManagerDaily, ManagerWaste, ManagerOffline, ManagerWaiterAssignment } from './pages/manager/ManagerPages'
import { OwnerDashboard, OwnerOrders, OwnerMenu, OwnerPayments, OwnerSales, OwnerReports, OwnerManagers, OwnerUsers, OwnerProfile, OwnerPermissions, OwnerSettingsPage, OwnerTables, OwnerOperations, OwnerFeedback, OwnerCrossBranch, OwnerInventoryPage, OwnerWaiterAssignment } from './pages/owner/OwnerPages'

import { Toaster } from 'sonner'

function roleHome(role) {
  // Maps an authenticated user's role to their dashboard. Backend returns
  // UPPERCASE role values (OWNER, MANAGER, CASHIER, KITCHEN, WAITER).
  const map = {
    OWNER: "/owner/dashboard",
    MANAGER: "/manager/dashboard",
    CASHIER: "/cashier/dashboard",
    WAITER: "/waiter/dashboard",
    KITCHEN: "/kitchen/dashboard",
  };
  return map[String(role || "").toUpperCase()] || "/customer";
}

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const { setupSocketListeners, cleanupSocketListeners } = useOrderStore();
  const { init: initOffline } = useOfflineStore();

  React.useEffect(() => { checkAuth(); initOffline(); }, [checkAuth, initOffline]);

  React.useEffect(() => {
    if (authUser) { connectSocket(); setupSocketListeners(); }
    else { cleanupSocketListeners(); disconnectSocket(); }
    return () => { cleanupSocketListeners(); disconnectSocket(); };
  }, [authUser, setupSocketListeners, cleanupSocketListeners]);

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(sys); return;
    }
    root.classList.add(theme);
  }, [theme]);

  if (isCheckingAuth) {
    return <div className='w-full h-screen flex justify-center items-center'><Loader className="animate-spin size-20 text-cyan-500" /></div>
  }

  return (
    <>
      <Routes>

        {/* Customer - PUBLIC, no account */}
        <Route path="/customer" element={<CustomerHome />} />
        <Route path="/customer/menu/:branch" element={<CustomerMenu />} />
        <Route path="/customer/item/:branch/:itemId" element={<CustomerItem />} />
        <Route path="/customer/cart/:branch" element={<CustomerCart />} />
        <Route path="/customer/checkout/:branch" element={<CustomerCheckout />} />
        <Route path="/customer/confirmed/:branch/:orderId" element={<CustomerConfirmed />} />
        <Route path="/customer/track/:branch/:orderId" element={<CustomerTrack />} />
        <Route path="/customer/track/_/:orderId" element={<CustomerTrack />} />
        <Route path="/customer/track/code/:code" element={<CustomerTrack />} />
        <Route path="/customer/history/:branch/:orderId" element={<CustomerHistory />} />
        {/* QR landing - the printed QR encodes this with ?access= capability */}
        <Route path="/customer/qr/:branch" element={<CustomerQrLanding />} />
        <Route path="/customer/feedback" element={<CustomerFeedback />} />
        <Route path="/customer/feedback/:branch" element={<CustomerFeedback />} />

        {/* Auth */}
        <Route path="/login" element={!authUser ? <Login /> : <Navigate to={roleHome(authUser.role)} replace />} />
        <Route path="/" element={<Navigate to={authUser ? roleHome(authUser.role) : "/customer"} replace />} />

        {/* Public aliases - mirror /customer/* under /public/* (the actor-based
            route plan target). Both prefixes work; /customer/* is the primary
            path used by the customer pages. */}
        <Route path="/public" element={<Navigate to="/customer" replace />} />
        <Route path="/public/menu/:branch" element={<CustomerMenu />} />
        <Route path="/public/item/:branch/:itemId" element={<CustomerItem />} />
        <Route path="/public/cart/:branch" element={<CustomerCart />} />
        <Route path="/public/checkout/:branch" element={<CustomerCheckout />} />
        <Route path="/public/order" element={<CustomerCart />} />
        <Route path="/public/order-status" element={<CustomerTrack />} />
        <Route path="/public/confirmed/:branch/:trackingToken" element={<CustomerConfirmed />} />
        <Route path="/public/track/:branch/:trackingToken" element={<CustomerTrack />} />
        <Route path="/public/track/_/:trackingToken" element={<CustomerTrack />} />
        <Route path="/public/track/code/:code" element={<CustomerTrack />} />
        <Route path="/public/history/:branch/:trackingToken" element={<CustomerHistory />} />
        <Route path="/public/qr/:branch" element={<CustomerQrLanding />} />
        <Route path="/public/feedback" element={<CustomerFeedback />} />
        <Route path="/public/:branch" element={<CustomerMenu />} />

{/* WAITER */}
 <Route path="/waiter" element={<RoleRoute roles={["WAITER"]}><WaiterLayout /></RoleRoute>}>
   <Route index element={<Navigate to="/waiter/dashboard" replace />} />
   <Route path="dashboard" element={<WaiterDashboard />} />
   <Route path="tables" element={<WaiterTables />} />
   <Route path="create" element={<WaiterCreateOrder />} />
   <Route path="active" element={<WaiterActiveOrders />} />
   <Route path="status" element={<WaiterOrderStatus />} />
   <Route path="profile" element={<WaiterProfile />} />
 </Route>

         {/* CASHIER */}
         <Route path="/cashier" element={<RoleRoute roles={["CASHIER"]}><CashierLayout /></RoleRoute>}>
           <Route index element={<Navigate to="/cashier/dashboard" replace />} />
           <Route path="dashboard" element={<CashierDashboard />} />
           <Route path="create" element={<CashierCreateOrder />} />
           <Route path="payments" element={<CashierPayments />} />
           <Route path="transactions" element={<CashierTransactions />} />
           <Route path="manual-entry" element={<CashierManualEntry />} />
           <Route path="profile" element={<CashierProfile />} />
         </Route>

        {/* KITCHEN */}
        <Route path="/kitchen" element={<RoleRoute roles={["KITCHEN"]}><KitchenLayout /></RoleRoute>}>
          <Route index element={<Navigate to="/kitchen/dashboard" replace />} />
          <Route path="dashboard" element={<KitchenDashboard />} />
          <Route path="profile" element={<KitchenProfile />} />
        </Route>

{/* MANAGER */}
         <Route path="/manager" element={<RoleRoute roles={["MANAGER"]}><ManagerLayout /></RoleRoute>}>
           <Route index element={<Navigate to="/manager/dashboard" replace />} />
           <Route path="dashboard" element={<ManagerDashboard />} />
           <Route path="orders" element={<ManagerOrders />} />
           <Route path="kitchen" element={<ManagerKitchen />} />
           <Route path="tables" element={<ManagerTables />} />
           <Route path="payments" element={<ManagerPayments />} />
           <Route path="transactions" element={<ManagerTransactions />} />
           <Route path="customers" element={<ManagerCustomers />} />
           <Route path="menu" element={<ManagerMenu />} />
           <Route path="inventory" element={<ManagerInventoryPage />} />
           <Route path="staff" element={<ManagerStaff />} />
           <Route path="reports" element={<ManagerReports />} />
           <Route path="daily" element={<ManagerDaily />} />
           <Route path="waste" element={<ManagerWaste />} />
           <Route path="offline" element={<ManagerOffline />} />
           <Route path="waiter-assignment" element={<ManagerWaiterAssignment />} />
           <Route path="refunds" element={<RefundManagement />} />
           <Route path="table-capacity" element={<TableCapacityOverview canManage />} />
           <Route path="branch-settings" element={<ManagerBranchSettings />} />
           <Route path="profile" element={<ManagerProfile />} />
         </Route>

        {/* OWNER */}
        <Route path="/owner" element={<RoleRoute roles={["OWNER"]}><OwnerLayout /></RoleRoute>}>
          <Route index element={<Navigate to="/owner/dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboard />} />
          <Route path="managers" element={<OwnerManagers />} />
          <Route path="users" element={<OwnerUsers />} />
          <Route path="tables" element={<OwnerTables />} />
          <Route path="menu" element={<OwnerMenu />} />
          <Route path="operations" element={<OwnerOperations />} />
          <Route path="feedback" element={<OwnerFeedback />} />
          <Route path="waiter-assignment" element={<OwnerWaiterAssignment />} />
          <Route path="refunds" element={<RefundManagement isOwner />} />
          <Route path="table-capacity" element={<TableCapacityOverview canManage />} />
          <Route path="orders" element={<OwnerOrders />} />
          <Route path="payments" element={<OwnerPayments />} />
          <Route path="sales" element={<OwnerSales />} />
          <Route path="reports" element={<OwnerReports />} />
          <Route path="analytics" element={<OwnerCrossBranch />} />
          <Route path="inventory" element={<OwnerInventoryPage />} />
          <Route path="permissions" element={<OwnerPermissions />} />
          <Route path="settings" element={<OwnerSettingsPage />} />
          <Route path="profile" element={<OwnerProfile />} />
        </Route>

        <Route path="*" element={<Navigate to={authUser ? roleHome(authUser.role) : "/customer"} replace />} />
      </Routes>
      <Toaster position="top-right" richColors expand={false} />
    </>
  )
}

export default App

