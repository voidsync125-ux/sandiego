import { useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate, useOutletContext } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import SideNavbar from './components/SideNavbar'
import TopHeader from './components/TopHeader'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import { ShopProvider } from './context/ShopProvider'
import { useShop } from './context/useShop'
import LoadingScreen from './LoadingScreen'
import AboutUs from './pages/AboutUs'
import AccountPortal from './pages/AccountPortal'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'
import Categories from './pages/Categories'
import Checkout from './pages/Checkout'
import ContactUs from './pages/ContactUs'
import Home from './pages/Home'
import LandingPage from './pages/LandingPage'
import OrderTracking from './pages/OrderTracking'
import ProductDetails from './pages/ProductDetails'
import Settings from './pages/Settings'
import UserDashboard from './pages/UserDashboard'
import Wishlist from './pages/Wishlist'

type StoreOutletContext = {
  searchQuery: string
  setSearchQuery: (value: string) => void
  isLight: boolean
  setDarkMode: (dark: boolean) => void
}

function PublicAuthRoute({ children }: { children: ReactNode }) {
  const { role, ready } = useAuth()
  if (!ready) return <div role="status" className="min-h-screen bg-[#090A08] text-center text-[11px] text-white/60">Checking your session…</div>
  if (role === 'admin') return <Navigate to="/admin-dashboard" replace />
  if (role === 'customer') return <Navigate to="/store" replace />
  return children
}

function StoreHome() {
  const { searchQuery, setSearchQuery } = useOutletContext<StoreOutletContext>()
  return <Home searchQuery={searchQuery} onClearSearch={() => setSearchQuery('')} />
}

function SettingsOutlet() {
  const { isLight, setDarkMode } = useOutletContext<StoreOutletContext>()
  return <Settings isLight={isLight} onSetDarkMode={setDarkMode} />
}

function StoreLayout() {
  const { profile, requestUserAccess } = useAuth()
  const preferenceKey = `sandiego-settings-preferences:${profile?.id || 'customer'}`
  const [isLight, setIsLight] = useState(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem(preferenceKey) || '{}') as { darkMode?: boolean }
      return preferences.darkMode === undefined ? true : !preferences.darkMode
    } catch {
      return true
    }
  })
  const [searchQuery, setSearchQuery] = useState('')
  const { cartItems } = useShop()
  const navigate = useNavigate()
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0)

  const setDarkMode = (dark: boolean) => {
    setIsLight(!dark)
    try {
      const preferences = JSON.parse(localStorage.getItem(preferenceKey) || '{}') as Record<string, unknown>
      localStorage.setItem(preferenceKey, JSON.stringify({ ...preferences, darkMode: dark }))
    } catch {
      localStorage.setItem(preferenceKey, JSON.stringify({ darkMode: dark }))
    }
  }

  const openCart = () => {
    if (requestUserAccess()) navigate('/checkout')
  }

  return (
    <div className={isLight ? 'theme-light min-h-screen' : 'theme-dark min-h-screen'}>
      <SideNavbar isLight={isLight} onThemeToggle={() => setDarkMode(isLight)} />
      <div className="min-h-screen md:pl-64">
        <TopHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} cartCount={cartCount} onCartClick={openCart} />
        <main className="min-h-screen pt-[76px]">
          <Outlet context={{ searchQuery, setSearchQuery, isLight, setDarkMode }} />
        </main>
      </div>
    </div>
  )
}

function LandingRoute() {
  const [introVisible, setIntroVisible] = useState(true)
  const [introMounted, setIntroMounted] = useState(true)

  return (
    <>
      <LandingPage />
      {introMounted && (
        <div
          aria-hidden="true"
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && !introVisible) setIntroMounted(false)
          }}
          className={`pointer-events-none fixed inset-0 z-[80] transition-opacity duration-1000 ease-out ${introVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <LoadingScreen onComplete={() => setIntroVisible(false)} />
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <ShopProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PublicAuthRoute><LandingRoute /></PublicAuthRoute>} />
            <Route path="/account" element={<PublicAuthRoute><AccountPortal /></PublicAuthRoute>} />
            <Route path="/admin/login" element={<PublicAuthRoute><AdminLogin /></PublicAuthRoute>} />
            <Route path="/admin/signup" element={<Navigate to="/admin/login?mode=signup" replace />} />
            <Route path="/admin-dashboard" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
            <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
            <Route element={<StoreLayout />}>
              <Route path="/store" element={<StoreHome />} />
              <Route path="/product/:productId" element={<ProductDetails />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/wishlist" element={<RequireAuth role="customer"><Wishlist /></RequireAuth>} />
              <Route path="/checkout" element={<RequireAuth role="customer"><Checkout /></RequireAuth>} />
              <Route path="/order-tracking" element={<RequireAuth role="customer"><OrderTracking /></RequireAuth>} />
              <Route path="/account/dashboard" element={<RequireAuth role="customer"><UserDashboard /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth role="customer"><Navigate to="/settings/profile" replace /></RequireAuth>} />
              <Route path="/settings/:section" element={<RequireAuth role="customer"><SettingsOutlet /></RequireAuth>} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/contact" element={<ContactUs />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ShopProvider>
  )
}

export default App
