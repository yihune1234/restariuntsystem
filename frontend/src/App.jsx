import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import { useThemeStore } from './store/useThemeStore'
import { useOrderStore } from './store/useOrderStore'
import { useOfflineStore } from './store/useOfflineStore'
import { connectSocket, disconnectSocket } from './config/socket.config'
import RoleRoute from './routes/ProtectedRoute'
import { Loader } from 'lucide-react'

// Auth (kept static: tiny, needed for the first paint of /login)
import Login from './pages/Auth/Login'

// Role layouts — thin shells that wrap the lazy pages below, kept static so
// the guarded route tree is immediately resolvable.
import WaiterLayout from './pages/waiter/WaiterLayout'
import CashierLayout from './pages/cashier/CashierLayout'
import KitchenLayout from './pages/kitchen/KitchenLayout'
import ManagerLayout from './pages/manager/ManagerLayout'
import OwnerLayout from './pages/owner/OwnerLayout'

// ---------------------------------------------------------------------------
// Route-level code splitting.
// Every page below is lazy-loaded, so it lands in its own chunk fetched on
// navigation. Cashier/kitchen/waiter screens never download the heavy manager
// & owner dashboards (recharts etc.) up front, and vice versa.

// Customer (public, no account)
const CustomerHome = lazy(() => import('./pages/customer/Home'))
const CustomerMenu = lazy(() => import('./pages/customer/Menu'))
const CustomerItem = lazy(() => import('./pages/customer/ItemDetail'))
const CustomerCart = lazy(() => import('./pages/customer/Cart'))
const CustomerCheckout = lazy(() => import('./pages/customer/Checkout'))
const CustomerConfirmed = lazy(() => import('./pages/customer/Confirmed'))
const CustomerTrack = lazy(() => import('./pages/customer/Track'))
const CustomerHistory = lazy(() => import('./pages/customer/History'))
const CustomerQrLanding = lazy(() => import('./pages/customer/QrLanding'))
const CustomerFeedback = lazy(() => import('./pages/customer/CustomerFeedback'))

// Waiter pages (barrel module — map named exports to `default`)
const WaiterDashboard = lazy(() => import('./pages/waiter/WaiterPages').then(m => ({ default: m.WaiterDashboard })))
const WaiterTables = lazy(() => import('./pages/waiter/WaiterPages').then(m => ({ default: m.WaiterTables })))
const WaiterCreateOrder = lazy(() => import('./pages/waiter/WaiterPages').then(m => ({ default: m.WaiterCreateOrder })))
const WaiterActiveOrders = lazy(() => import('./pages/waiter/WaiterPages').then(m => ({ default: m.WaiterActiveOrders })))
const WaiterOrderStatus = lazy(() => import('./pages/waiter/WaiterPages').then(m => ({ default: m.WaiterOrderStatus })))
const WaiterProfile = lazy(() => import('./pages/waiter/WaiterPages').then(m => ({ default: m.WaiterProfile })))
// Cashier pages
const CashierDashboard = lazy(() => import('./pages/cashier/CashierPages').then(m => ({ default: m.CashierDashboard })))
const CashierCreateOrder = lazy(() => import('./pages/cashier/CashierPages').then(m => ({ default: m.CashierCreateOrder })))
const CashierProfile = lazy(() => import('./pages/cashier/CashierPages').then(m => ({ default: m.CashierProfile })))
const CashierTransactions = lazy(() => import('./pages/cashier/CashierPages').then(m => ({ default: m.CashierTransactions })))
const CashierPayments = lazy(() => import('./pages/cashier/CashierPayments').then(m => ({ default: m.CashierPayments })))
const CashierManualEntry = lazy(() => import('./pages/cashier/CashierManualEntry'))
// Shared pages
const RefundManagement = lazy(() => import('./pages/shared/RefundManagement'))
const TableCapacityOverview = lazy(() => import('./pages/shared/TableCapacityOverview'))
// Kitchen + Manager + Owner pages
const KitchenDashboard = lazy(() => import('./pages/kitchen/KitchenPages').then(m => ({ default: m.KitchenDashboard })))
const KitchenProfile = lazy(() => import('./pages/kitchen/KitchenPages').then(m => ({ default: m.KitchenProfile })))
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerDashboard })))
const ManagerOrders = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerOrders })))
const ManagerKitchen = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerKitchen })))
const ManagerTables = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerTables })))
const ManagerPayments = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerPayments })))
const ManagerTransactions = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerTransactions })))
const ManagerCustomers = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerCustomers })))
const ManagerMenu = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerMenu })))
const ManagerStaff = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerStaff })))
const ManagerProfile = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerProfile })))
const ManagerReports = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerReports })))
const ManagerBranchSettings = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerBranchSettings })))
const ManagerInventoryPage = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerInventoryPage })))
const ManagerDaily = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerDaily })))
const ManagerWaste = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerWaste })))
const ManagerOffline = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerOffline })))
const ManagerWaiterAssignment = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerWaiterAssignment })))
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerDashboard })))
const OwnerOrders = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerOrders })))
const OwnerMenu = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerMenu })))
const OwnerPayments = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerPayments })))
const OwnerSales = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerSales })))
const OwnerReports = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerReports })))
const OwnerManagers = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerManagers })))
const OwnerUsers = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerUsers })))
const OwnerProfile = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerProfile })))
const OwnerPermissions = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerPermissions })))
const OwnerSettingsPage = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerSettingsPage })))
const OwnerTables = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerTables })))
const OwnerOperations = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerOperations })))
const OwnerFeedback = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerFeedback })))
const OwnerCrossBranch = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerCrossBranch })))
const OwnerInventoryPage = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerInventoryPage })))
const OwnerWaiterAssignment = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerWaiterAssignment })))

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
      {/* Lazy route chunks resolve inside this boundary; the fallback mirrors
          the auth-check splash so navigation between roles never flashes. */}
      <Suspense
        fallback={
          <div className="w-full h-screen flex justify-center items-center">
            <Loader className="animate-spin size-20 text-cyan-500" />
          </div>
        }
      >
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
      </Suspense>
      <Toaster position="top-right" richColors expand={false} />
    </>
  )
}

export default App

