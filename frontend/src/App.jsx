import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import { useThemeStore } from './store/useThemeStore'
import { Loader } from 'lucide-react'

import Login from './pages/Auth/Login'

const PublicMenu = lazy(() => import('./pages/customer/PublicMenu'))
const MenuManagement = lazy(() => import('./pages/management/MenuManagement'))

import { Toaster } from 'sonner'

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();

  React.useEffect(() => { checkAuth(); }, [checkAuth]);

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
          <Route path="/menu" element={<PublicMenu />} />
          <Route path="/login" element={!authUser ? <Login /> : <Navigate to="/manage" replace />} />
          <Route path="/manage" element={authUser ? <MenuManagement /> : <Navigate to="/login" replace />} />
          <Route path="/" element={<Navigate to="/menu" replace />} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Routes>
      </Suspense>
      <Toaster position="top-right" richColors expand={false} />
    </>
  )
}

export default App
