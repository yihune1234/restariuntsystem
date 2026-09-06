import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import { useThemeStore } from './store/useThemeStore'
import { useOrderStore } from './store/useOrderStore'
import { connectSocket, disconnectSocket } from './config/socket.config'
import RoleRoute from './routes/ProtectedRoute'
import { Loader } from 'lucide-react'

import Login from './pages/Auth/Login'

import CashierLayout from './pages/cashier/CashierLayout'
import KitchenLayout from './pages/kitchen/KitchenLayout'
import ManagerLayout from './pages/manager/ManagerLayout'
import OwnerLayout from './pages/owner/OwnerLayout'

const CustomerHome = lazy(() => import('./pages/customer/Home'))
const CustomerMenu = lazy(() => import('./pages/customer/Menu'))
const CustomerCart = lazy(() => import('./pages/customer/Cart'))
const CustomerCheckout = lazy(() => import('./pages/customer/Checkout'))
const CustomerConfirmed = lazy(() => import('./pages/customer/Confirmed'))
const CustomerTrack = lazy(() => import('./pages/customer/Track'))
const CustomerQrLanding = lazy(() => import('./pages/customer/QrLanding'))

const CashierDashboard = lazy(() => import('./pages/cashier/CashierPages').then(m => ({ default: m.CashierDashboard })))
const CashierCreateOrder = lazy(() => import('./pages/cashier/CashierPages').then(m => ({ default: m.CashierCreateOrder })))
const CashierProfile = lazy(() => import('./pages/cashier/CashierPages').then(m => ({ default: m.CashierProfile })))
const CashierTransactions = lazy(() => import('./pages/cashier/CashierPages').then(m => ({ default: m.CashierTransactions })))
const CashierPayments = lazy(() => import('./pages/cashier/CashierPayments').then(m => ({ default: m.CashierPayments })))

const KitchenDashboard = lazy(() => import('./pages/kitchen/KitchenPages').then(m => ({ default: m.KitchenDashboard })))
const KitchenProfile = lazy(() => import('./pages/kitchen/KitchenPages').then(m => ({ default: m.KitchenProfile })))

const ManagerDashboard = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerDashboard })))
const ManagerOrders = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerOrders })))
const ManagerCreateOrder = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerCreateOrder })))
const ManagerKitchen = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerKitchen })))
const ManagerTables = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerTables })))
const ManagerMenu = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerMenu })))
const ManagerStaff = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerStaff })))
const ManagerReports = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerReports })))
const ManagerProfile = lazy(() => import('./pages/manager/ManagerPages').then(m => ({ default: m.ManagerProfile })))

const OwnerDashboard = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerDashboard })))
const OwnerOrders = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerOrders })))
const OwnerCreateOrder = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerCreateOrder })))
const OwnerMenu = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerMenu })))
const OwnerTables = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerTables })))
const OwnerEmployees = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerEmployees })))
const OwnerReports = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerReports })))
const OwnerProfile = lazy(() => import('./pages/owner/OwnerPages').then(m => ({ default: m.OwnerProfile })))

import { Toaster } from 'sonner'

function roleHome(role) {
  const map = {
    OWNER: "/owner/dashboard",
    MANAGER: "/manager/dashboard",
    CASHIER: "/cashier/dashboard",
    KITCHEN: "/kitchen/dashboard",
  };
  return map[String(role || "").toUpperCase()] || "/customer";
}

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const { setupSocketListeners, cleanupSocketListeners } = useOrderStore();

  React.useEffect(() => { checkAuth(); }, [checkAuth]);

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
      <Suspense
        fallback={
          <div className="w-full h-screen flex justify-center items-center">
            <Loader className="animate-spin size-20 text-cyan-500" />
          </div>
        }
      >
      <Routes>

        <Route path="/customer" element={<CustomerHome />} />
        <Route path="/customer/menu" element={<CustomerMenu />} />
        <Route path="/customer/menu/:branch" element={<CustomerMenu />} />
        <Route path="/customer/menu/:branch/*" element={<CustomerMenu />} />
        <Route path="/customer/cart" element={<CustomerCart />} />
        <Route path="/customer/cart/:branch" element={<CustomerCart />} />
        <Route path="/customer/cart/:branch/*" element={<CustomerCart />} />
        <Route path="/customer/checkout" element={<CustomerCheckout />} />
        <Route path="/customer/checkout/:branch" element={<CustomerCheckout />} />
        <Route path="/customer/checkout/:branch/*" element={<CustomerCheckout />} />
        <Route path="/customer/confirmed/:orderId" element={<CustomerConfirmed />} />
        <Route path="/customer/confirmed/:branch/:orderId" element={<CustomerConfirmed />} />
        <Route path="/customer/confirmed/:branch/:orderId/*" element={<CustomerConfirmed />} />
        <Route path="/customer/track" element={<CustomerTrack />} />
        <Route path="/customer/track/:branch" element={<CustomerTrack />} />
        <Route path="/customer/track/code/:code" element={<CustomerTrack />} />
        <Route path="/customer/track/:branch/:orderId" element={<CustomerTrack />} />
        <Route path="/customer/track/:branch/:orderId/*" element={<CustomerTrack />} />
        <Route path="/customer/qr/:branch?" element={<CustomerQrLanding />} />
        <Route path="/customer/qr/:branch?/*" element={<CustomerQrLanding />} />

        <Route path="/login" element={!authUser ? <Login /> : <Navigate to={roleHome(authUser.role)} replace />} />
        <Route path="/" element={<Navigate to={authUser ? roleHome(authUser.role) : "/customer"} replace />} />

        <Route path="/cashier" element={<RoleRoute roles={["CASHIER"]}><CashierLayout /></RoleRoute>}>
          <Route index element={<Navigate to="/cashier/dashboard" replace />} />
          <Route path="dashboard" element={<CashierDashboard />} />
          <Route path="create" element={<CashierCreateOrder />} />
          <Route path="payments" element={<CashierPayments />} />
          <Route path="transactions" element={<CashierTransactions />} />
          <Route path="profile" element={<CashierProfile />} />
        </Route>

        <Route path="/kitchen" element={<RoleRoute roles={["KITCHEN"]}><KitchenLayout /></RoleRoute>}>
          <Route index element={<Navigate to="/kitchen/dashboard" replace />} />
          <Route path="dashboard" element={<KitchenDashboard />} />
          <Route path="profile" element={<KitchenProfile />} />
        </Route>

        <Route path="/manager" element={<RoleRoute roles={["MANAGER"]}><ManagerLayout /></RoleRoute>}>
          <Route index element={<Navigate to="/manager/dashboard" replace />} />
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="orders" element={<ManagerOrders />} />
          <Route path="create" element={<ManagerCreateOrder />} />
          <Route path="kitchen" element={<ManagerKitchen />} />
          <Route path="tables" element={<ManagerTables />} />
          <Route path="menu" element={<ManagerMenu />} />
          <Route path="staff" element={<ManagerStaff />} />
          <Route path="reports" element={<ManagerReports />} />
          <Route path="profile" element={<ManagerProfile />} />
        </Route>

        <Route path="/owner" element={<RoleRoute roles={["OWNER"]}><OwnerLayout /></RoleRoute>}>
          <Route index element={<Navigate to="/owner/dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboard />} />
          <Route path="orders" element={<OwnerOrders />} />
          <Route path="create" element={<OwnerCreateOrder />} />
          <Route path="tables" element={<OwnerTables />} />
          <Route path="menu" element={<OwnerMenu />} />
          <Route path="employees" element={<OwnerEmployees />} />
          <Route path="reports" element={<OwnerReports />} />
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
