import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, ImagePlus, LogOut, PackagePlus, RefreshCw, ShieldCheck, Trash2, Truck } from 'lucide-react'
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
const statuses = ['Order Placed', 'Processing', 'Dispatched', 'Out for Delivery'] as const
const categories: ProductCategory[] = ['Clothes', 'Jewelries', 'Organic Soap', 'Cream']
const formatPrice = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
const emptyProductForm = () => ({ name: '', category: 'Clothes' as ProductCategory, price: '', description: '', benefits: '', images: [] as File[] })

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { signOut: clearAuth } = useAuth()
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [pageError, setPageError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const imageInput = useRef<HTMLInputElement>(null)
  const imagePreviewUrls = useRef<string[]>([])
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(() => new Set())
  const [deletingProductIds, setDeletingProductIds] = useState<Set<string>>(() => new Set())
  const [form, setForm] = useState(emptyProductForm)

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
    return <div className="mx-auto max-w-xl px-5 py-24 text-center text-[var(--ink)]"><ShieldCheck size={24} className="mx-auto text-[#A88417]" /><h1 className="mt-4 font-serif text-2xl">Verifying administrator access</h1><p role={pageError ? 'alert' : 'status'} className="mt-2 text-[11px] text-[var(--muted)]">{pageError || 'Checking your secure session…'}</p></div>
  }

  return (
    <div className="min-h-[calc(100vh-76px)] bg-[var(--page-bg)] px-4 py-7 text-[var(--ink)] sm:px-7 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-[1450px]">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div><p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A88417]"><ShieldCheck size={14} /> Private control room</p><h1 className="mt-2 font-serif text-[31px] sm:text-[38px]">Good to see you{admin ? `, ${admin.fullName.split(' ')[0]}` : ''}.</h1><p className="mt-1 text-[11px] text-[var(--muted)]">Manage incoming orders and the customer storefront.</p></div>
          <div className="flex items-center gap-3"><button type="button" onClick={() => Promise.all([apiRequest<{ orders: OrderRow[] }>('/admin/orders', { headers: adminHeaders() }), apiRequest<{ products: Product[] }>('/products')]).then(([result, inventory]) => { setOrders(result.orders); setProducts(inventory.products); setPageError('') }).catch((error: Error) => setPageError(error.message))} className="flex h-9 items-center gap-2 border border-[var(--line)] px-3 text-[9px] uppercase tracking-[0.12em] hover:border-[#D4AF37]"><RefreshCw size={13} /> Refresh</button><button type="button" onClick={signOut} className="flex h-9 items-center gap-2 border border-[var(--line)] px-3 text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] hover:border-[#D4AF37] hover:text-[var(--ink)]"><LogOut size={13} /> Sign out</button></div>
        </header>

        {pageError && <p role="alert" className="mt-5 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[11px] text-red-700">{pageError}</p>}

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="min-w-0 border border-[var(--line)] bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6"><div><p className="text-[9px] uppercase tracking-[0.18em] text-[#A88417]">Live orders</p><h2 className="mt-1 font-serif text-[22px]">Orders received</h2></div><span className="border border-[var(--line)] px-2.5 py-1 text-[10px]">{orders.length}</span></div>
            {orders.length ? (
              <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left"><thead><tr className="border-b border-[var(--line)] text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]"><th className="px-5 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Items</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Progress</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-[var(--line)] last:border-0"><td className="px-5 py-4 align-top"><span className="block text-[11px] font-medium">{order.id}</span><span className="mt-1 block text-[9px] text-[var(--muted)]">{new Date(order.createdAt).toLocaleDateString()}</span></td><td className="px-4 py-4 align-top"><span className="block text-[11px]">{order.delivery.fullName}</span><span className="mt-1 block text-[9px] text-[var(--muted)]">{order.delivery.city}</span></td><td className="max-w-[180px] px-4 py-4 align-top text-[10px] leading-5">{order.items.map((item) => <span key={item.product.id} className="block truncate">{item.product.name} × {item.quantity}</span>)}</td><td className="px-4 py-4 align-top text-[11px]">{formatPrice(order.total)}</td><td className="px-4 py-4 align-top"><label className="sr-only" htmlFor={`status-${order.id}`}>Update {order.id} status</label><select id={`status-${order.id}`} value={order.status} disabled={updatingOrderIds.has(order.id)} onChange={(event) => void updateStatus(order.id, event.target.value)} className="max-w-[155px] border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-[10px] outline-none focus:border-[#D4AF37] disabled:opacity-60">{statuses.map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>
            ) : <div className="px-6 py-14 text-center"><Truck size={22} className="mx-auto text-[#A88417]" /><p className="mt-3 font-serif text-[18px]">No orders just yet.</p><p className="mt-1 text-[10px] text-[var(--muted)]">New customer orders will appear here.</p></div>}
          </section>

          <section className="border border-[var(--line)] bg-[var(--surface)]">
            <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6"><p className="text-[9px] uppercase tracking-[0.18em] text-[#A88417]">Storefront inventory</p><h2 className="mt-1 font-serif text-[22px]">Post new product</h2></div>
            <form onSubmit={postProduct} className="space-y-4 p-5 sm:p-6">
              <label className="block text-[10px] font-medium">Product name<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-10 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[11px] outline-none focus:border-[#D4AF37]" /></label>
              <div className="grid grid-cols-2 gap-3"><label className="block text-[10px] font-medium">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ProductCategory })} className="mt-2 h-10 w-full border border-[var(--line)] bg-[var(--page-bg)] px-2 text-[11px] outline-none focus:border-[#D4AF37]">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="block text-[10px] font-medium">Price (NGN)<input required min="1" step="1" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-2 h-10 w-full border border-[var(--line)] bg-[var(--page-bg)] px-3 text-[11px] outline-none focus:border-[#D4AF37]" /></label></div>
              <label className="block text-[10px] font-medium">Description<textarea required maxLength={3000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 w-full resize-y border border-[var(--line)] bg-[var(--page-bg)] px-3 py-2.5 text-[11px] outline-none focus:border-[#D4AF37]" /></label>
              <label className="block text-[10px] font-medium">Product benefits <span className="text-[var(--muted)]">(one benefit per line)</span><textarea maxLength={2000} rows={3} value={form.benefits} onChange={(event) => setForm({ ...form, benefits: event.target.value })} placeholder={'Skin-friendly ingredients\nThoughtful small-batch finish'} className="mt-2 w-full resize-y border border-[var(--line)] bg-[var(--page-bg)] px-3 py-2.5 text-[11px] outline-none focus:border-[#D4AF37]" /></label>
              <label className="block text-[10px] font-medium">Product images <span className="text-[var(--muted)]">(up to 5 images · max 5 MB each)</span><span className="mt-2 flex min-h-24 flex-col justify-center gap-3 border border-dashed border-[var(--line)] bg-[var(--page-bg)] p-3 text-[10px] text-[var(--muted)] transition hover:border-[#D4AF37]">{imagePreviews.length > 0 && <span className="grid grid-cols-3 gap-2 sm:grid-cols-5">{imagePreviews.map((preview, index) => <span key={preview} className="relative aspect-square overflow-hidden border border-[var(--line)]"><img src={preview} alt={`Product image preview ${index + 1}`} className="size-full object-cover" /><span className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 text-[8px] text-white">{index + 1}</span></span>)}</span>}<span className="flex items-center gap-2"><ImagePlus size={17} className="shrink-0 text-[#A88417]" />{form.images.length ? `${form.images.length} image${form.images.length === 1 ? '' : 's'} selected` : 'Choose up to five product photos'}</span><input ref={imageInput} required multiple type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => selectImages(Array.from(event.target.files || []))} className="mt-1 w-full cursor-pointer border border-[var(--line)] bg-[var(--surface)] text-[9px] file:mr-3 file:h-9 file:border-0 file:bg-[#D4AF37] file:px-3 file:text-[9px] file:font-semibold file:uppercase file:tracking-[0.1em] file:text-[#17150E]" /></span></label>
              {success && <p role="status" className="border-l-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800">{success}</p>}
              <button type="submit" disabled={submitting} className="flex h-11 w-full items-center justify-center gap-2 bg-[#D4AF37] text-[9px] font-semibold uppercase tracking-[0.13em] text-[#17150E] hover:bg-[#E5C75E] disabled:opacity-60"><PackagePlus size={15} />{submitting ? 'Publishing…' : 'Publish product'}<ArrowRight size={14} /></button>
              <p className="text-[9px] leading-4 text-[var(--muted)]">Published products are saved to the local backend and appear on the storefront feed shortly.</p>
            </form>
            <div className="border-t border-[var(--line)]">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6"><div><p className="text-[9px] uppercase tracking-[0.18em] text-[#A88417]">Published items</p><h3 className="mt-1 font-serif text-[19px]">Manage products</h3></div><span className="border border-[var(--line)] px-2.5 py-1 text-[10px]">{products.length}</span></div>
              {products.length ? (
                <ul className="divide-y divide-[var(--line)]">
                  {products.map((product) => (
                    <li key={product.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                      <img src={product.images?.[0] || product.image} alt="" className="size-12 shrink-0 border border-[var(--line)] object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium">{product.name}</p>
                        <p className="mt-1 text-[9px] text-[var(--muted)]">{product.category} · {formatPrice(product.price)}</p>
                      </div>
                      <button type="button" aria-label={`Remove ${product.name}`} onClick={() => void removeProduct(product)} disabled={deletingProductIds.has(product.id)} className="flex h-9 shrink-0 items-center gap-2 border border-[var(--line)] px-2.5 text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] transition hover:border-red-700 hover:text-red-700 disabled:opacity-50 sm:px-3">
                        <Trash2 size={13} />{deletingProductIds.has(product.id) ? 'Removing…' : 'Remove'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="px-6 py-8 text-center text-[10px] text-[var(--muted)]">No published products to manage.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
