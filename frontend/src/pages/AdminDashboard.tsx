import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  Truck,
  UsersRound,
  X,
  ImagePlus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminHeaders, apiRequest, ApiError } from '../lib/api'
import { useAuth } from '../context/useAuth'
import type { Product, ProductCategory } from '../data/products'

type OrderRow = {
  id: string
  items: { product: Product; quantity: number }[]
  delivery: { fullName: string; phone: string; city: string; address: string }
  total: number
  status: string
  createdAt: string
}

type AdminProfile = { fullName: string; email: string }
type DashboardSection = 'overview' | 'orders' | 'inventory' | 'publish'
const statuses = ['Order Placed', 'Processing', 'Dispatched', 'Out for Delivery'] as const
const categories: ProductCategory[] = ['Clothes', 'Jewelries', 'Organic Soap', 'Cream']
const formatPrice = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
const formatDate = (date: string) => new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
const emptyProductForm = () => ({ name: '', category: 'Clothes' as ProductCategory, price: '', description: '', benefits: '', images: [] as File[] })
const dashboardNavigation: { id: DashboardSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'publish', label: 'Add a product', icon: Plus },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { signOut: clearAuth } = useAuth()
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('All statuses')
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('All categories')
  const [refreshing, setRefreshing] = useState(false)
  const [pageError, setPageError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const imageInput = useRef<HTMLInputElement>(null)
  const imagePreviewUrls = useRef<string[]>([])
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(() => new Set())
  const [deletingProductIds, setDeletingProductIds] = useState<Set<string>>(() => new Set())
  const [form, setForm] = useState(emptyProductForm)

  const pendingOrders = orders.filter((order) => order.status === 'Order Placed' || order.status === 'Processing').length
  const orderValue = orders.reduce((total, order) => total + order.total, 0)
  const customerCount = new Set(orders.map((order) => `${order.delivery.fullName.toLowerCase()}|${order.delivery.phone}`)).size
  const filteredOrders = orders.filter((order) => {
    const query = orderSearch.trim().toLowerCase()
    const matchesSearch = !query || [
      order.id,
      order.delivery.fullName,
      order.delivery.phone,
      order.delivery.city,
      ...order.items.map((item) => item.product.name),
    ].some((value) => value.toLowerCase().includes(query))
    return matchesSearch && (orderStatusFilter === 'All statuses' || order.status === orderStatusFilter)
  })
  const filteredProducts = products.filter((product) => {
    const query = productSearch.trim().toLowerCase()
    return (!query || `${product.name} ${product.category}`.toLowerCase().includes(query))
      && (productCategoryFilter === 'All categories' || product.category === productCategoryFilter)
  })
  const categoryValue = categories.map((category) => ({
    category,
    total: orders.reduce((sum, order) => sum + order.items
      .filter((item) => item.product.category === category)
      .reduce((itemSum, item) => itemSum + item.product.price * item.quantity, 0), 0),
  }))
  const largestCategoryValue = Math.max(1, ...categoryValue.map((entry) => entry.total))

  const navigateSection = (section: DashboardSection) => {
    setActiveSection(section)
    setMobileMenuOpen(false)
    document.getElementById(`admin-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const refreshDashboard = async () => {
    setRefreshing(true)
    try {
      const [result, inventory] = await Promise.all([
        apiRequest<{ orders: OrderRow[] }>('/admin/orders', { headers: adminHeaders() }),
        apiRequest<{ products: Product[] }>('/products'),
      ])
      setOrders(result.orders)
      setProducts(inventory.products)
      setPageError('')
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Dashboard data could not be refreshed.')
    } finally {
      setRefreshing(false)
    }
  }

  const exportOrders = () => {
    const fields = ['Order ID', 'Date', 'Customer', 'Phone', 'City', 'Address', 'Items', 'Total NGN', 'Status']
    const rows = filteredOrders.map((order) => [
      order.id,
      order.createdAt,
      order.delivery.fullName,
      order.delivery.phone,
      order.delivery.city,
      order.delivery.address,
      order.items.map((item) => `${item.product.name} x${item.quantity}`).join('; '),
      order.total,
      order.status,
    ])
    const csv = [fields, ...rows]
      .map((row) => row.map((field) => {
        const value = String(field ?? '')
        const spreadsheetSafeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value
        return `"${spreadsheetSafeValue.replace(/"/g, '""')}"`
      }).join(','))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `sandiego-orders-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const releaseImagePreviews = () => {
    imagePreviewUrls.current.forEach((preview) => URL.revokeObjectURL(preview))
    imagePreviewUrls.current = []
    setImagePreviews([])
  }

  useEffect(() => {
    return () => imagePreviewUrls.current.forEach((preview) => URL.revokeObjectURL(preview))
  }, [])

  useEffect(() => {
    const token = sessionStorage.getItem('sandiego-admin-token')
    if (!token) {
      navigate('/admin/signup', { replace: true })
      return
    }

    const headers = adminHeaders()
    let mounted = true
    const loadDashboard = async () => {
      try {
        const [profile, result, inventory] = await Promise.all([
          apiRequest<{ admin: AdminProfile }>('/auth/admin/me', { headers }),
          apiRequest<{ orders: OrderRow[] }>('/admin/orders', { headers }),
          apiRequest<{ products: Product[] }>('/products'),
        ])
        if (!mounted) return
        setAdmin(profile.admin)
        setOrders(result.orders)
        setProducts(inventory.products)
        setPageError('')
        setAuthorized(true)
      } catch (error) {
        if (!mounted) return
        setPageError(error instanceof Error ? error.message : 'Could not load administrator data.')
        if (error instanceof ApiError && error.status === 401) {
          sessionStorage.removeItem('sandiego-admin-token')
          navigate('/admin/signup', { replace: true })
        }
      }
    }
    void loadDashboard()
    const interval = window.setInterval(() => {
      Promise.all([
        apiRequest<{ orders: OrderRow[] }>('/admin/orders', { headers }),
        apiRequest<{ products: Product[] }>('/products'),
      ]).then(([result, inventory]) => {
        if (mounted) {
          setOrders(result.orders)
          setProducts(inventory.products)
          setPageError('')
        }
      }).catch((error: Error) => { if (mounted) setPageError(error.message) })
    }, 5000)
    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [navigate])

  const selectImages = (files: File[]) => {
    setPageError('')
    if (files.length > 5) {
      setPageError('Choose no more than five product images.')
      if (imageInput.current) imageInput.current.value = ''
      setForm((current) => ({ ...current, images: [] }))
      releaseImagePreviews()
      return
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setPageError('Each product image must be 5 MB or smaller.')
      if (imageInput.current) imageInput.current.value = ''
      setForm((current) => ({ ...current, images: [] }))
      releaseImagePreviews()
      return
    }
    releaseImagePreviews()
    const previews = files.map((image) => URL.createObjectURL(image))
    imagePreviewUrls.current = previews
    setImagePreviews(previews)
    setForm((current) => ({ ...current, images: files }))
  }

  const postProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setPageError('')
    setSuccess('')
    const data = new FormData()
    data.set('name', form.name)
    data.set('category', form.category)
    data.set('price', form.price)
    data.set('description', form.description)
    data.set('benefits', form.benefits)
    form.images.forEach((image) => data.append('images', image))
    try {
      const response = await apiRequest<{ product: Product }>('/products', {
        method: 'POST',
        headers: adminHeaders(),
        body: data,
      })
      setProducts((current) => [response.product, ...current])
      setSuccess(`${response.product.name} is live in the storefront feed.`)
      if (typeof BroadcastChannel !== 'undefined') {
        const productChannel = new BroadcastChannel('sandiego-products')
        productChannel.postMessage({ type: 'product-created', product: response.product })
        productChannel.close()
      }
      setForm(emptyProductForm())
      if (imageInput.current) imageInput.current.value = ''
      releaseImagePreviews()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Product could not be posted.')
      if (error instanceof ApiError && error.status === 401) {
        sessionStorage.removeItem('sandiego-admin-token')
        navigate('/admin/signup', { replace: true })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingOrderIds((current) => new Set(current).add(orderId))
    try {
      const result = await apiRequest<{ order: OrderRow }>(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setOrders((current) => current.map((order) => order.id === orderId ? result.order : order))
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Order status could not be updated.')
    } finally {
      setUpdatingOrderIds((current) => {
        const next = new Set(current)
        next.delete(orderId)
        return next
      })
    }
  }

  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Remove "${product.name}" from the storefront? Existing orders will keep their saved item details.`)) return

    setDeletingProductIds((current) => new Set(current).add(product.id))
    setPageError('')
    setSuccess('')
    try {
      await apiRequest<{ product: Product }>(`/products/${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      })
      setProducts((current) => current.filter((entry) => entry.id !== product.id))
      setSuccess(`${product.name} was removed from the storefront.`)
      if (typeof BroadcastChannel !== 'undefined') {
        const productChannel = new BroadcastChannel('sandiego-products')
        productChannel.postMessage({ type: 'product-deleted', productId: product.id })
        productChannel.close()
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Product could not be removed.')
      if (error instanceof ApiError && error.status === 401) {
        sessionStorage.removeItem('sandiego-admin-token')
        navigate('/admin/signup', { replace: true })
      }
    } finally {
      setDeletingProductIds((current) => {
        const next = new Set(current)
        next.delete(product.id)
        return next
      })
    }
  }

  const signOut = () => {
    clearAuth()
    navigate('/admin/signup', { replace: true })
  }

  if (!authorized) {
    return <div className="flex min-h-screen items-center justify-center bg-[#090A08] px-5 text-center text-[#F4F0E6]"><div><ShieldCheck size={28} className="mx-auto text-[#D4AF37]" /><h1 className="mt-4 font-serif text-2xl">Preparing your control room</h1><p role={pageError ? 'alert' : 'status'} className="mt-2 text-[11px] text-white/55">{pageError || 'Verifying your secure session…'}</p></div></div>
  }

  return (
    <div className="min-h-screen bg-[#090A08] text-[#F4F0E6] selection:bg-[#D4AF37] selection:text-[#17150E]">
      {mobileMenuOpen && <button type="button" aria-label="Close admin navigation" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-white/[0.08] bg-[#0F100D] px-5 py-6 transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <a href="#admin-overview" onClick={(event) => { event.preventDefault(); navigateSection('overview') }} className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center border border-[#D4AF37]/50 bg-[#D4AF37]/10 font-serif text-lg text-[#E5C75E]">S</span>
            <span><span className="block font-serif text-[18px] tracking-wide">SANDIEGO</span><span className="mt-0.5 block text-[8px] uppercase tracking-[0.23em] text-white/45">Collections · Studio</span></span>
          </a>
          <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="flex size-9 items-center justify-center text-white/55 hover:text-[#E5C75E] md:hidden"><X size={18} /></button>
        </div>
        <div className="mt-10 px-3 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/35">Workspace</div>
        <nav className="mt-3 space-y-1">
          {dashboardNavigation.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => navigateSection(id)} aria-current={activeSection === id ? 'page' : undefined} className={`group flex w-full items-center gap-3 border px-3 py-3 text-left text-[11px] transition ${activeSection === id ? 'border-[#D4AF37]/20 bg-[#D4AF37]/[0.09] text-[#E5C75E]' : 'border-transparent text-white/55 hover:border-white/[0.07] hover:bg-white/[0.03] hover:text-white'}`}>
              <Icon size={16} strokeWidth={1.7} /><span className="flex-1">{label}</span>{id === 'orders' && pendingOrders > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-[#D4AF37] text-[9px] font-semibold text-[#17150E]">{pendingOrders}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-9 px-3 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/35">Storefront</div>
        <a href="/store" target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-3 px-3 py-3 text-[11px] text-white/55 transition hover:text-[#E5C75E]"><Store size={16} strokeWidth={1.7} /> View live storefront <ArrowRight size={13} className="ml-auto" /></a>
        <div className="mt-auto border-t border-white/[0.08] pt-5">
          <div className="flex items-center gap-3 px-2">
            <span className="flex size-9 items-center justify-center rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[11px] font-medium text-[#E5C75E]">{admin?.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'SC'}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium">{admin?.fullName || 'Store admin'}</span><span className="mt-0.5 block truncate text-[9px] text-white/40">{admin?.email}</span></span>
          </div>
          <button type="button" onClick={signOut} className="mt-4 flex w-full items-center gap-3 px-3 py-2 text-left text-[10px] text-white/40 transition hover:text-white/80"><LogOut size={14} /> Sign out</button>
        </div>
      </aside>

      <main className="min-h-screen md:pl-[270px]">
        <div className="mx-auto max-w-[1600px] px-4 pb-14 sm:px-7 lg:px-10">
        <header className="sticky top-0 z-30 -mx-4 flex h-[76px] items-center justify-between border-b border-white/[0.08] bg-[#090A08]/90 px-4 backdrop-blur-xl sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open admin menu" onClick={() => setMobileMenuOpen(true)} className="flex size-10 items-center justify-center border border-white/10 text-white/75 transition hover:border-[#D4AF37]/50 hover:text-[#E5C75E] md:hidden"><Menu size={19} /></button>
            <span className="hidden text-[9px] uppercase tracking-[0.17em] text-white/35 sm:block">Sandiego /</span><span className="text-[10px] font-medium text-white/80">{dashboardNavigation.find((item) => item.id === activeSection)?.label || 'Overview'}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 text-[9px] text-white/40 sm:flex"><span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /> Live store</span>
            <button type="button" onClick={() => void refreshDashboard()} disabled={refreshing} className="flex h-9 items-center gap-2 border border-white/10 px-3 text-[9px] uppercase tracking-[0.1em] text-white/65 transition hover:border-[#D4AF37]/45 hover:text-[#E5C75E] disabled:opacity-50"><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">{refreshing ? 'Syncing' : 'Sync data'}</span></button>
            <span className="flex size-9 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[10px] font-medium text-[#E5C75E]">{admin?.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'SC'}</span>
          </div>
        </header>

        <section id="admin-overview" className="scroll-mt-24 pt-8 sm:pt-10">
          <div className="relative overflow-hidden border border-[#D4AF37]/20 bg-[radial-gradient(ellipse_at_82%_15%,rgba(212,175,55,0.17),transparent_38%),linear-gradient(112deg,#151610,#10110D_60%,#17170F)] px-6 py-7 sm:px-9 sm:py-9">
            <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border border-[#D4AF37]/10" /><div className="pointer-events-none absolute -right-2 -top-12 size-48 rounded-full border border-[#D4AF37]/10" />
            <div className="relative flex flex-wrap items-end justify-between gap-5">
              <div><p className="flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37]"><Sparkles size={12} /> Your private studio</p><h1 className="mt-3 font-serif text-[31px] leading-tight sm:text-[40px]">Good to see you, {admin?.fullName.split(' ')[0] || 'there'}.</h1><p className="mt-2 max-w-lg text-[11px] leading-5 text-white/50">A considered view of your shop today. Everything is in one place, ready when you are.</p></div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-white/40">{new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
            </div>
            <div className="relative mt-6 flex flex-wrap gap-2"><button type="button" onClick={() => navigateSection('publish')} className="flex h-10 items-center gap-2 bg-[#D4AF37] px-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#17150E] transition hover:bg-[#E5C75E]"><Plus size={14} /> Add a product</button><button type="button" onClick={() => navigateSection('orders')} className="flex h-10 items-center gap-2 border border-white/15 bg-white/[0.03] px-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/80 transition hover:border-[#D4AF37]/50"><ClipboardList size={14} /> Review orders <ArrowRight size={13} /></button></div>
          </div>
          {pageError && <p role="alert" className="mt-4 border border-red-400/20 bg-red-950/30 px-4 py-3 text-[11px] text-red-200">{pageError}</p>}
          {success && <p role="status" className="mt-4 flex items-center gap-2 border border-emerald-400/20 bg-emerald-950/25 px-4 py-3 text-[10px] text-emerald-200"><Check size={14} />{success}</p>}

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Order value', value: formatPrice(orderValue), note: 'Across all orders', icon: CircleDollarSign, tone: 'text-[#E5C75E]' },
              { label: 'Orders to action', value: String(pendingOrders), note: `${orders.length} total orders`, icon: Clock3, tone: 'text-amber-300' },
              { label: 'Live products', value: String(products.length), note: 'In your collection', icon: ShoppingBag, tone: 'text-sky-300' },
              { label: 'Customers served', value: String(customerCount), note: 'Based on order history', icon: UsersRound, tone: 'text-emerald-300' },
            ].map(({ label, value, note, icon: Icon, tone }) => (
              <article key={label} className="border border-white/[0.08] bg-[#11120F] p-4 sm:p-5">
                <div className="flex items-start justify-between"><span className="text-[9px] font-medium uppercase tracking-[0.14em] text-white/45">{label}</span><Icon size={16} className={tone} strokeWidth={1.6} /></div>
                <p className="mt-4 truncate font-serif text-[25px] tracking-tight sm:text-[29px]">{value}</p><p className="mt-1 text-[9px] text-white/35">{note}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <section className="border border-white/[0.08] bg-[#11120F] p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-[8px] uppercase tracking-[0.18em] text-[#D4AF37]">Store pulse</p><h2 className="mt-1 font-serif text-[20px]">A little momentum</h2></div><span className="flex items-center gap-1.5 text-[8px] text-white/35"><span className="size-1.5 rounded-full bg-emerald-400" /> Updates every 5 sec</span></div>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {statuses.map((status, index) => {
                  const count = orders.filter((order) => order.status === status).length
                  return <button key={status} type="button" onClick={() => { setOrderStatusFilter(status); navigateSection('orders') }} className="min-w-0 border border-white/[0.07] bg-white/[0.02] p-3 text-left transition hover:border-[#D4AF37]/35">
                    <span className={`flex size-7 items-center justify-center rounded-full ${index < 2 ? 'bg-[#D4AF37]/10 text-[#E5C75E]' : 'bg-white/[0.06] text-white/45'}`}><span className="text-[9px]">{String(index + 1).padStart(2, '0')}</span></span>
                    <span className="mt-3 block font-serif text-[20px]">{count}</span><span className="mt-1 block truncate text-[8px] leading-4 text-white/40">{status}</span>
                  </button>
                })}
              </div>
            </section>
            <section className="border border-white/[0.08] bg-[#11120F] p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-[8px] uppercase tracking-[0.18em] text-[#D4AF37]">Collection mix</p><h2 className="mt-1 font-serif text-[20px]">Order value by edit</h2></div><Boxes size={16} className="text-white/35" /></div>
              <div className="mt-5 space-y-4">{categoryValue.map(({ category, total }) => <div key={category}><div className="mb-1.5 flex items-center justify-between gap-2 text-[9px]"><span className="text-white/60">{category}</span><span className="text-white/40">{formatPrice(total)}</span></div><div className="h-1 overflow-hidden bg-white/[0.07]"><div className="h-full bg-gradient-to-r from-[#9E781C] to-[#E5C75E] transition-all duration-700" style={{ width: `${Math.max(total ? 5 : 0, (total / largestCategoryValue) * 100)}%` }} /></div></div>)}</div>
            </section>
          </div>
        </section>

        <div className="mt-10 grid items-start gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section id="admin-orders" className="scroll-mt-24 min-w-0 border border-white/[0.08] bg-[#11120F]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-5 sm:px-6"><div><p className="text-[8px] uppercase tracking-[0.18em] text-[#D4AF37]">Customer care</p><h2 className="mt-1 font-serif text-[22px]">Orders received <span className="ml-1 align-middle font-sans text-[10px] text-white/35">{filteredOrders.length}/{orders.length}</span></h2></div><button type="button" onClick={exportOrders} disabled={!filteredOrders.length} className="flex h-9 items-center gap-2 border border-white/10 px-3 text-[8px] uppercase tracking-[0.1em] text-white/65 transition hover:border-[#D4AF37]/40 hover:text-[#E5C75E] disabled:opacity-35"><ArrowDownToLine size={13} /> Export CSV</button></div>
            <div className="flex flex-wrap gap-2 border-b border-white/[0.08] px-5 py-3 sm:px-6">
              <label className="relative min-w-[190px] flex-1"><span className="sr-only">Search orders</span><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" /><input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Search order, customer, item…" className="h-9 w-full border border-white/[0.08] bg-black/20 pl-9 pr-3 text-[10px] text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/55" /></label>
              <label className="relative"><span className="sr-only">Filter orders by status</span><select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)} className="h-9 appearance-none border border-white/[0.08] bg-[#151610] pl-3 pr-8 text-[9px] text-white/70 outline-none focus:border-[#D4AF37]/55"><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40" /></label>
            </div>
            {filteredOrders.length ? (
              <div className="overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-left"><thead><tr className="border-b border-white/[0.07] text-[8px] uppercase tracking-[0.13em] text-white/35"><th className="px-5 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Pieces</th><th className="px-4 py-3 font-medium">Order value</th><th className="px-4 py-3 font-medium">Fulfilment</th></tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id} className="border-b border-white/[0.06] last:border-0 transition hover:bg-white/[0.02]"><td className="px-5 py-4 align-top"><span className="block text-[10px] font-medium text-white/85">{order.id}</span><span className="mt-1 block text-[8px] text-white/35">{formatDate(order.createdAt)}</span></td><td className="px-4 py-4 align-top"><span className="block text-[10px] text-white/80">{order.delivery.fullName}</span><span className="mt-1 block text-[8px] text-white/40">{order.delivery.city} · {order.delivery.phone}</span></td><td className="max-w-[160px] px-4 py-4 align-top text-[9px] leading-5 text-white/55">{order.items.map((item) => <span key={item.product.id} className="block truncate">{item.product.name} × {item.quantity}</span>)}</td><td className="px-4 py-4 align-top text-[10px] text-white/75">{formatPrice(order.total)}</td><td className="px-4 py-4 align-top"><label className="sr-only" htmlFor={`status-${order.id}`}>Update {order.id} status</label><select id={`status-${order.id}`} value={order.status} disabled={updatingOrderIds.has(order.id)} onChange={(event) => void updateStatus(order.id, event.target.value)} className="max-w-[155px] border border-[#D4AF37]/20 bg-[#171811] px-2 py-2 text-[9px] text-[#E5C75E] outline-none focus:border-[#D4AF37] disabled:opacity-50">{statuses.map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>
            ) : <div className="px-6 py-14 text-center"><Truck size={23} className="mx-auto text-[#D4AF37]/70" /><p className="mt-3 font-serif text-[18px]">{orders.length ? 'No matching orders.' : 'Your first order is on its way.'}</p><p className="mt-1 text-[10px] text-white/40">{orders.length ? 'Adjust your search or status filter.' : 'New customer orders will arrive here automatically.'}</p></div>}
          </section>

          <section id="admin-publish" className="scroll-mt-24 border border-white/[0.08] bg-[#11120F]">
            <div className="border-b border-white/[0.08] px-5 py-5 sm:px-6"><p className="text-[8px] uppercase tracking-[0.18em] text-[#D4AF37]">Storefront studio</p><h2 className="mt-1 font-serif text-[22px]">Give it a place here.</h2><p className="mt-1 text-[9px] text-white/40">Add a new piece to your live collection.</p></div>
            <form onSubmit={postProduct} className="space-y-4 p-5 sm:p-6">
              <label className="block text-[10px] font-medium text-white/75">Product name<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-10 w-full border border-white/10 bg-[#090A08] px-3 text-[11px] text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]" /></label>
              <div className="grid grid-cols-2 gap-3"><label className="block text-[10px] font-medium text-white/75">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ProductCategory })} className="mt-2 h-10 w-full border border-white/10 bg-[#090A08] px-2 text-[11px] text-white outline-none focus:border-[#D4AF37]">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="block text-[10px] font-medium text-white/75">Price (NGN)<input required min="1" step="1" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-2 h-10 w-full border border-white/10 bg-[#090A08] px-3 text-[11px] text-white outline-none focus:border-[#D4AF37]" /></label></div>
              <label className="block text-[10px] font-medium text-white/75">Description<textarea required maxLength={3000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 w-full resize-y border border-white/10 bg-[#090A08] px-3 py-2.5 text-[11px] text-white outline-none focus:border-[#D4AF37]" /></label>
              <label className="block text-[10px] font-medium text-white/75">Product benefits <span className="text-white/40">(one benefit per line)</span><textarea maxLength={2000} rows={3} value={form.benefits} onChange={(event) => setForm({ ...form, benefits: event.target.value })} placeholder={'Skin-friendly ingredients\nThoughtful small-batch finish'} className="mt-2 w-full resize-y border border-white/10 bg-[#090A08] px-3 py-2.5 text-[11px] text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]" /></label>
              <label className="block text-[10px] font-medium text-white/75">Product images <span className="text-white/40">(up to 5 images · max 5 MB each)</span><span className="mt-2 flex min-h-24 flex-col justify-center gap-3 border border-dashed border-white/15 bg-[#090A08] p-3 text-[10px] text-white/45 transition hover:border-[#D4AF37]">{imagePreviews.length > 0 && <span className="grid grid-cols-3 gap-2 sm:grid-cols-5">{imagePreviews.map((preview, index) => <span key={preview} className="relative aspect-square overflow-hidden border border-white/10"><img src={preview} alt={`Product image preview ${index + 1}`} className="size-full object-cover" /><span className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 text-[8px] text-white">{index + 1}</span></span>)}</span>}<span className="flex items-center gap-2"><ImagePlus size={17} className="shrink-0 text-[#D4AF37]" />{form.images.length ? `${form.images.length} image${form.images.length === 1 ? '' : 's'} selected` : 'Choose up to five product photos'}</span><input ref={imageInput} required multiple type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => selectImages(Array.from(event.target.files || []))} className="mt-1 w-full cursor-pointer border border-white/10 bg-[#11120F] text-[9px] file:mr-3 file:h-9 file:border-0 file:bg-[#D4AF37] file:px-3 file:text-[9px] file:font-semibold file:uppercase file:tracking-[0.1em] file:text-[#17150E]" /></span></label>
              <button type="submit" disabled={submitting} className="flex h-11 w-full items-center justify-center gap-2 bg-[#D4AF37] text-[9px] font-semibold uppercase tracking-[0.13em] text-[#17150E] hover:bg-[#E5C75E] disabled:opacity-60"><PackagePlus size={15} />{submitting ? 'Publishing…' : 'Publish product'}<ArrowRight size={14} /></button>
              <p className="text-[9px] leading-4 text-white/40">Published products are saved to your live collection and appear on the storefront.</p>
            </form>
            <div id="admin-inventory" className="scroll-mt-24 border-t border-white/[0.08]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 sm:px-6"><div><p className="text-[8px] uppercase tracking-[0.18em] text-[#D4AF37]">Published collection</p><h3 className="mt-1 font-serif text-[19px]">Manage products</h3></div><span className="border border-white/10 px-2.5 py-1 text-[9px] text-white/55">{filteredProducts.length}/{products.length}</span></div>
              <div className="flex flex-col gap-2 border-b border-white/[0.08] p-4 sm:flex-row">
                <label className="relative min-w-0 flex-1"><span className="sr-only">Search products</span><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Find a product…" className="h-9 w-full border border-white/[0.08] bg-black/20 pl-9 pr-3 text-[9px] text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/55" /></label>
                <label className="relative"><span className="sr-only">Filter products by category</span><select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)} className="h-9 w-full appearance-none border border-white/[0.08] bg-[#151610] pl-3 pr-8 text-[9px] text-white/70 outline-none focus:border-[#D4AF37]/55"><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40" /></label>
              </div>
              {filteredProducts.length ? (
                <ul className="divide-y divide-white/[0.06]">
                  {filteredProducts.map((product) => (
                    <li key={product.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                      <img src={product.images?.[0] || product.image} alt="" className="size-12 shrink-0 border border-white/10 object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-medium text-white/85">{product.name}</p>
                        <p className="mt-1 text-[8px] text-white/40">{product.category} · {formatPrice(product.price)}</p>
                      </div>
                      <button type="button" aria-label={`Remove ${product.name}`} onClick={() => void removeProduct(product)} disabled={deletingProductIds.has(product.id)} className="flex h-9 shrink-0 items-center gap-2 border border-white/10 px-2.5 text-[8px] uppercase tracking-[0.08em] text-white/45 transition hover:border-red-500/45 hover:text-red-300 disabled:opacity-50 sm:px-3">
                        <Trash2 size={13} />{deletingProductIds.has(product.id) ? 'Removing…' : 'Remove'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="px-6 py-8 text-center text-[10px] text-white/40">{products.length ? 'No products match your filters.' : 'Your new collection will appear here after publishing.'}</p>}
            </div>
          </section>
        </div>
      </div>
      </main>
    </div>
  )
}
