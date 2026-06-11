'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { checkoutToWhatsApp } from '@/app/actions/checkout'
import type { Vendor, CategoryWithItems, Item, CartItem, PaymentMethod } from '@/types/menu'

interface Props {
  vendor: Vendor
  categories: CategoryWithItems[]
}

type MobileStage = 'cart' | 'checkout' | 'payment' | 'confirmed'
type DeliveryType = 'pickup' | 'delivery'

export default function MenuClient({ vendor, categories }: Props) {
  // ── Shared cart state ──────────────────────────────────────
  const [cart, setCart]                     = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '')
  const sectionRefs  = useRef<Record<string, HTMLElement | null>>({})
  const tabRefs      = useRef<Record<string, HTMLButtonElement | null>>({})
  const scrollingRef = useRef(false)
  const supabase     = useMemo(() => createClient(), [])

  // ── Mobile drawer state ────────────────────────────────────
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [mobileStage,  setMobileStage]  = useState<MobileStage>('cart')
  const [mName,        setMName]        = useState('')
  const [mPhone,       setMPhone]       = useState('')
  const [mNotes,       setMNotes]       = useState('')
  const [mDelivery,    setMDelivery]    = useState<DeliveryType>('pickup')
  const [mAddress,     setMAddress]     = useState('')
  const [mBusy,        setMBusy]        = useState(false)
  const [mOrderId,     setMOrderId]     = useState<string | null>(null)
  const [mError,       setMError]       = useState<string | null>(null)

  // ── Cart helpers ───────────────────────────────────────────
  const addToCart = (item: Item) =>
    setCart((prev) => {
      const ex = prev.find((ci) => ci.item.id === item.id)
      if (ex) return prev.map((ci) => ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci)
      return [...prev, { item, quantity: 1 }]
    })

  const updateQuantity = (itemId: string, delta: number) =>
    setCart((prev) =>
      prev.map((ci) => ci.item.id === itemId ? { ...ci, quantity: ci.quantity + delta } : ci)
          .filter((ci) => ci.quantity > 0)
    )

  const totalItems = cart.reduce((s, ci) => s + ci.quantity, 0)
  const totalPrice = cart.reduce((s, ci) => s + ci.item.price * ci.quantity, 0)

  // ── Category scroll ────────────────────────────────────────
  const scrollToCategory = (id: string) => {
    setActiveCategory(id)
    scrollingRef.current = true
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { scrollingRef.current = false }, 800)
  }

  // ── Mobile drawer helpers ──────────────────────────────────
  const openDrawer = () => { setMobileStage('cart'); setDrawerOpen(true) }
  const closeDrawer = () => {
    setDrawerOpen(false)
    setTimeout(() => {
      setMobileStage('cart')
      setMName(''); setMPhone(''); setMNotes('')
      setMDelivery('pickup'); setMAddress('')
      setMOrderId(null); setMBusy(false); setMError(null)
    }, 300)
  }

  const mProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mName.trim()) return
    if (mDelivery === 'delivery' && !mAddress.trim()) return
    setMobileStage('payment')
  }

  const mConfirmOrder = async () => {
    setMBusy(true)
    setMError(null)

    const result = await checkoutToWhatsApp({
      vendor_id:        vendor.id,
      customer_name:    mName,
      customer_phone:   mPhone,
      notes:            mNotes,
      delivery_type:    mDelivery,
      delivery_address: mAddress,
      items:            cart.map((ci) => ({ name: ci.item.name, price: ci.item.price, quantity: ci.quantity })),
      total_price:      totalPrice,
    })

    if (!result.success) {
      setMBusy(false)
      setMError(result.error ?? 'Something went wrong. Please try again.')
      return
    }

    setCart([])

    // New flow: send the customer to their order status / payment page.
    if (result.order_token) {
      window.location.href = `/order/${result.order_token}`
      return
    }

    // Fallback (legacy DBs without a token): hand off to WhatsApp directly.
    const waUrl = buildWhatsAppUrl(
      vendor.phone_number,
      result.short_order_id!,
      result.total_price!,
      cart,
      mDelivery,
      mAddress,
      mNotes,
      mName,
      mPhone,
    )
    setMOrderId(result.short_order_id!)
    setMobileStage('confirmed')
    setMBusy(false)
    window.location.href = waUrl
  }

  const totalItemCount = categories.reduce((n, c) => n + c.items.length, 0)

  // ── Scroll-spy ─────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      if (scrollingRef.current) return
      const scrollY = window.scrollY + 120
      const ids = categories.map((c) => c.id)
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = sectionRefs.current[ids[i]]
        if (el && el.offsetTop <= scrollY) { setActiveCategory(ids[i]); return }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [categories])

  // ── Keep active tab visible in the pill bar ────────────────
  useEffect(() => {
    tabRefs.current[activeCategory]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCategory])

  // ── Lightbox ───────────────────────────────────────────────
  const [lightbox, setLightbox] = useState<{ url: string; name: string; description?: string | null } | null>(null)

  return (
    <div className="min-h-screen bg-white">

      {/* ── Image lightbox ───────────────────────────────────── */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-lg transition-colors">✕</button>
          <img src={lightbox.url} alt={lightbox.name} className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <div className="mt-4 max-w-md text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-semibold text-sm">{lightbox.name}</p>
            {lightbox.description && (
              <p className="mt-1.5 text-white/70 text-xs leading-relaxed whitespace-pre-line">{lightbox.description}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile sticky header ────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-border h-14 flex items-center px-4 gap-3">
        {vendor.logo_url
          ? <Image src={vendor.logo_url} alt={vendor.name} width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-border shrink-0" />
          : <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-xs shrink-0">{(vendor.name?.[0] ?? '?').toUpperCase()}</div>
        }
        <p className="font-bold text-ink text-sm flex-1 truncate">{vendor.name}</p>
        {totalItems > 0 && (
          <button onClick={openDrawer} className="flex items-center gap-1.5 bg-brand text-white text-xs font-semibold rounded-full px-3 py-1.5 shrink-0">
            <span>{totalItems}</span><span>View cart</span>
          </button>
        )}
      </header>

      {/* ── Desktop title ────────────────────────────────────── */}
      <div className="hidden lg:block max-w-7xl mx-auto px-8 pt-10 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {vendor.logo_url && (
              <Image src={vendor.logo_url} alt={vendor.name} width={64} height={64} className="w-16 h-16 rounded-full object-cover border border-border shrink-0" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-ink">{vendor.name}</h1>
              <p className="text-sm text-fog mt-0.5">{totalItemCount} items</p>
            </div>
          </div>
          {vendor.business_type === 'restaurant' && vendor.makanjom_restaurant_id && (
            <a
              href={`https://makanjom.com/restaurants/${vendor.makanjom_restaurant_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-600 shadow-sm hover:border-neutral-300 hover:text-neutral-900 transition shrink-0"
            >
              <span>🍽️</span> Discover on Makanjom
            </a>
          )}
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <HeroGrid gallery={vendor.gallery_urls ?? []} vendorName={vendor.name} />

      {/* ── Category tabs ────────────────────────────────────── */}
      <div className="sticky top-14 lg:top-0 z-20 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto lg:px-8">
          <div className="flex overflow-x-auto [overflow-y:clip] no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                ref={(el) => { tabRefs.current[cat.id] = el }}
                onClick={() => scrollToCategory(cat.id)}
                className={`shrink-0 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeCategory === cat.id ? 'border-ink text-ink' : 'border-transparent text-fog hover:text-ink'
                }`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-12 lg:items-start">

        {/* Left column */}
        <div className="pb-40 lg:pb-16">
          {(vendor.description || vendor.promo_text) && (
            <div className="mb-8 pb-8 border-b border-border space-y-4">
              {vendor.description && <p className="text-base text-ink leading-relaxed whitespace-pre-line">{vendor.description}</p>}
              {vendor.promo_text && (
                <div className="flex items-start gap-3 bg-brand/5 border border-brand/15 rounded-2xl px-5 py-4">
                  <span className="text-xl shrink-0">🏷️</span>
                  <p className="text-sm font-semibold text-ink">{vendor.promo_text}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-12">
            {categories.map((cat) => (
              <section key={cat.id} ref={(el) => { sectionRefs.current[cat.id] = el }} className="scroll-mt-28 lg:scroll-mt-14">
                <h2 className="text-xl font-bold text-ink mb-5">{cat.name}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {cat.items.map((item) => (
                    <ItemCard key={item.id} item={item} onAdd={addToCart} onImageClick={(url, name, description) => setLightbox({ url, name, description })} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Right column — desktop cart */}
        <div className="hidden lg:block">
          <div className="sticky top-[57px]">
            <DesktopCartPanel
              cart={cart}
              vendor={vendor}
              onUpdate={updateQuantity}
              onClearCart={() => setCart([])}
              totalPrice={totalPrice}
              supabase={supabase}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile cart bar ──────────────────────────────────── */}
      {totalItems > 0 && !drawerOpen && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-4 pb-6 pt-2 bg-white border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
          <button onClick={openDrawer}
            className="w-full bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-3.5 flex items-center justify-between px-5 hover:opacity-90 transition-opacity">
            <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm tabular-nums">{totalItems}</span>
            <span className="text-base">View order</span>
            <span className="tabular-nums font-bold">RM {totalPrice.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── Mobile drawer ────────────────────────────────────── */}
      {drawerOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/50" onClick={closeDrawer} />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* ── Stage: Cart ── */}
            {mobileStage === 'cart' && (
              <>
                <DrawerHeader title="Your order" onClose={closeDrawer} />
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                  {cart.map((ci) => (
                    <div key={ci.item.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink text-sm truncate">{ci.item.name}</p>
                        <p className="text-xs text-fog mt-0.5">RM {ci.item.price.toFixed(2)} each</p>
                      </div>
                      <QuantityControl itemId={ci.item.id} quantity={ci.quantity} onUpdate={updateQuantity} />
                      <p className="text-sm font-bold text-ink w-16 text-right tabular-nums">RM {(ci.item.price * ci.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="px-5 pb-8 pt-4 border-t border-border space-y-4 shrink-0">
                  <div className="flex justify-between text-base font-bold text-ink">
                    <span>Total</span>
                    <span className="tabular-nums">RM {totalPrice.toFixed(2)}</span>
                  </div>
                  <button onClick={() => setMobileStage('checkout')}
                    className="w-full bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity">
                    Proceed to checkout →
                  </button>
                </div>
              </>
            )}

            {/* ── Stage: Checkout (details + delivery) ── */}
            {mobileStage === 'checkout' && (
              <>
                <DrawerHeader title="Your details" onBack={() => setMobileStage('cart')} onClose={closeDrawer} />
                <form onSubmit={mProceedToPayment} className="overflow-y-auto flex-1 flex flex-col">
                  <div className="px-5 py-4 space-y-4 flex-1">
                    <CheckoutFields
                      name={mName}          onName={setMName}
                      phone={mPhone}        onPhone={setMPhone}
                      notes={mNotes}        onNotes={setMNotes}
                      deliveryType={mDelivery} onDeliveryType={setMDelivery}
                      address={mAddress}    onAddress={setMAddress}
                    />
                  </div>
                  <div className="px-5 pb-8 pt-4 border-t border-border shrink-0 space-y-3">
                    <OrderSummaryLine totalItems={totalItems} totalPrice={totalPrice} />
                    <button type="submit"
                      className="w-full bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity">
                      Continue to payment →
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── Stage: Payment ── */}
            {mobileStage === 'payment' && (
              <>
                <DrawerHeader title="Payment" onBack={() => setMobileStage('checkout')} onClose={closeDrawer} />
                <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

                  {/* ── Order confirmation summary ── */}
                  <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wide">Order summary</h3>

                    {/* Customer details */}
                    <div className="space-y-1 text-sm">
                      <p className="text-ink font-semibold">{mName}</p>
                      {mPhone && <p className="text-fog">{mPhone}</p>}
                      <p className="text-fog">{mDelivery === 'delivery' ? `Delivery${mAddress ? ` — ${mAddress}` : ''}` : 'Self pickup'}</p>
                    </div>

                    {/* Items */}
                    <div className="border-t border-border pt-3 space-y-1.5">
                      {cart.map((ci, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-ink">{ci.quantity}&times; {ci.item.name}</span>
                          <span className="text-fog tabular-nums">RM {(ci.item.price * ci.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-ink pt-2 border-t border-border">
                        <span>Total</span>
                        <span className="tabular-nums">RM {totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment details are shown on the /order/[token] page after checkout,
                      where the QR is pre-filled with the exact amount. Nothing to show here. */}
                </div>
                <div className="px-5 pb-8 pt-4 border-t border-border shrink-0 space-y-3">
                  <OrderSummaryLine totalItems={totalItems} totalPrice={totalPrice} />
                  {mError && (
                    <p className="text-xs text-brand bg-red-50 rounded-xl px-4 py-2.5 text-center">{mError}</p>
                  )}
                  <button onClick={mConfirmOrder} disabled={mBusy}
                    className="w-full bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors">
                    {mBusy
                      ? <><Spinner /> Saving order…</>
                      : <><WhatsAppIcon /> Place order via WhatsApp</>
                    }
                  </button>
                </div>
              </>
            )}

            {/* ── Stage: Confirmed ── */}
            {mobileStage === 'confirmed' && (
              <>
                <DrawerHeader title="Order placed!" onClose={closeDrawer} />
                <div className="overflow-y-auto flex-1 px-5 py-10 flex flex-col items-center justify-center text-center gap-3">
                  <p className="text-5xl">🎉</p>
                  <p className="font-bold text-ink text-lg">Thank you, {mName}!</p>
                  <p className="text-sm text-fog">Your order has been sent to {vendor.name} via WhatsApp.</p>
                  {mOrderId && (
                    <div className="mt-1 bg-surface rounded-xl px-4 py-2.5 text-center">
                      <p className="text-xs text-fog">Order reference</p>
                      <p className="font-mono font-bold text-ink text-base tracking-wider">{mOrderId}</p>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-8 pt-4 border-t border-border shrink-0">
                  <button onClick={closeDrawer} className="w-full border border-ink text-ink font-semibold rounded-xl py-3.5 hover:bg-surface transition-colors">
                    Back to menu
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Hero Grid ───────────────────────────────────────────────

function HeroGrid({ gallery, vendorName }: { gallery: string[]; vendorName: string }) {
  const images = (gallery ?? []).filter(Boolean)
  const [activeIdx, setActiveIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const goTo = (i: number) => setActiveIdx(Math.max(0, Math.min(i, images.length - 1)))

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs((touchStartY.current ?? 0) - e.changedTouches[0].clientY)
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      if (dx > 0) goTo(activeIdx + 1)
      else goTo(activeIdx - 1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  if (images.length === 0) {
    return (
      <div className="mx-4 lg:max-w-7xl lg:mx-auto lg:px-8 mb-6 lg:mb-8">
        <div className="h-52 lg:h-[460px] rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center">
          <p className="text-9xl font-black text-brand/10 select-none">{vendorName[0]?.toUpperCase()}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden relative aspect-[4/3] overflow-hidden mb-4"
        style={{ touchAction: 'pan-y' }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {images.map((url, i) => (
          <div key={i} className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(${(i - activeIdx) * 100}%)`,
              visibility:    i === activeIdx ? 'visible' : 'hidden',
              pointerEvents: i === activeIdx ? 'auto'    : 'none',
            }}>
            <Image src={url} alt="" fill sizes="100vw" priority={i === 0} className="object-cover select-none" draggable={false} />
          </div>
        ))}
        {images.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center items-center gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-200 pointer-events-auto ${i === activeIdx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:block max-w-7xl mx-auto px-8 mb-8">
        <div className="rounded-2xl overflow-hidden h-[460px] flex gap-2">
          <div className={`relative overflow-hidden ${images.length > 1 ? 'flex-1' : 'w-full'}`}>
            <Image src={images[0]} alt={vendorName} fill sizes="(min-width: 1024px) 640px, 100vw" priority className="object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex gap-2 flex-1 min-h-0">
                <div className="relative flex-1 overflow-hidden bg-surface">{images[1] && <Image src={images[1]} alt="" fill sizes="(min-width: 1024px) 320px, 50vw" className="object-cover" />}</div>
                <div className="relative flex-1 overflow-hidden bg-surface">{images[2] && <Image src={images[2]} alt="" fill sizes="(min-width: 1024px) 320px, 50vw" className="object-cover" />}</div>
              </div>
              <div className="flex gap-2 flex-1 min-h-0">
                <div className="relative flex-1 overflow-hidden bg-surface">{images[3] && <Image src={images[3]} alt="" fill sizes="(min-width: 1024px) 320px, 50vw" className="object-cover" />}</div>
                <div className="relative flex-1 overflow-hidden bg-surface">{images[4] && <Image src={images[4]} alt="" fill sizes="(min-width: 1024px) 320px, 50vw" className="object-cover" />}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Desktop Cart Panel ──────────────────────────────────────

type DesktopStage = 'form' | 'confirmed'

function DesktopCartPanel({ cart, vendor, onUpdate, onClearCart, totalPrice, supabase }: {
  cart: CartItem[]
  vendor: Vendor
  onUpdate: (itemId: string, delta: number) => void
  onClearCart: () => void
  totalPrice: number
  supabase: ReturnType<typeof createClient>
}) {
  const [name,         setName]         = useState('')
  const [phone,        setPhone]        = useState('')
  const [notes,        setNotes]        = useState('')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup')
  const [address,      setAddress]      = useState('')
  const [stage,        setStage]        = useState<DesktopStage>('form')
  const [busy,         setBusy]         = useState(false)
  const [orderId,      setOrderId]      = useState<string | null>(null)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  const totalItems = cart.reduce((s, ci) => s + ci.quantity, 0)

  useEffect(() => {
    if (cart.length > 0 && stage === 'confirmed') setStage('form')
  }, [cart.length, stage])

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setSubmitError(null)

    const result = await checkoutToWhatsApp({
      vendor_id:        vendor.id,
      customer_name:    name,
      customer_phone:   phone,
      notes,
      delivery_type:    deliveryType,
      delivery_address: address,
      items:            cart.map((ci) => ({ name: ci.item.name, price: ci.item.price, quantity: ci.quantity })),
      total_price:      totalPrice,
    })

    if (!result.success) {
      setBusy(false)
      setSubmitError(result.error ?? 'Something went wrong.')
      return
    }

    // New flow: send the customer to their order status / payment page.
    if (result.order_token) {
      onClearCart()
      window.location.href = `/order/${result.order_token}`
      return
    }

    // Fallback (legacy DBs without a token): hand off to WhatsApp directly.
    const waUrl = buildWhatsAppUrl(
      vendor.phone_number,
      result.short_order_id!,
      result.total_price!,
      cart,
      deliveryType,
      address,
      notes,
      name,
      phone,
    )
    setOrderId(result.short_order_id!)
    setStage('confirmed')
    setBusy(false)
    window.location.href = waUrl
  }

  if (stage === 'confirmed') {
    return (
      <div className="border border-border rounded-2xl p-8 text-center space-y-3">
        <p className="text-4xl">🎉</p>
        <p className="font-bold text-ink text-lg">Order sent!</p>
        <p className="text-sm text-fog">Check your WhatsApp — {vendor.name} will confirm shortly.</p>
        {orderId && (
          <div className="mt-1 bg-surface rounded-xl px-4 py-2.5 inline-block">
            <p className="text-xs text-fog">Order reference</p>
            <p className="font-mono font-bold text-ink tracking-wider">{orderId}</p>
          </div>
        )}
        <div className="pt-2">
          <button onClick={() => { setStage('form'); setName(''); setPhone(''); setNotes(''); setDeliveryType('pickup'); setAddress(''); onClearCart() }}
            className="text-sm font-semibold text-brand underline underline-offset-2">
            Place another order
          </button>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="border border-border rounded-2xl p-10 text-center">
        <p className="text-4xl mb-3">🛒</p>
        <p className="font-semibold text-ink">Your cart is empty</p>
        <p className="text-xs text-fog mt-1">Add items from the menu to get started.</p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      {/* Cart items */}
      <div className="p-5 space-y-4 border-b border-border">
        <h3 className="font-bold text-ink">Your order</h3>
        {cart.map((ci) => (
          <div key={ci.item.id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{ci.item.name}</p>
              <p className="text-xs text-fog">RM {ci.item.price.toFixed(2)} each</p>
            </div>
            <QuantityControl itemId={ci.item.id} quantity={ci.quantity} onUpdate={onUpdate} />
            <p className="text-sm font-bold text-ink w-16 text-right tabular-nums">RM {(ci.item.price * ci.quantity).toFixed(2)}</p>
          </div>
        ))}
        <div className="flex justify-between font-bold text-ink pt-2 border-t border-border">
          <span>Total</span>
          <span className="tabular-nums">RM {totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Checkout form */}
      <form onSubmit={handleOrder} className="p-5 space-y-5">
        <div className="space-y-4">
          <h3 className="font-bold text-ink">Your details</h3>
          <CheckoutFields
            name={name}               onName={setName}
            phone={phone}             onPhone={setPhone}
            notes={notes}             onNotes={setNotes}
            deliveryType={deliveryType} onDeliveryType={setDeliveryType}
            address={address}         onAddress={setAddress}
          />
        </div>

        {vendor.payment_methods?.length > 0 && (
          <div className="space-y-3 pt-1">
            <p className="text-sm font-bold text-ink">How to pay</p>
            <p className="text-xs text-fog -mt-1">Scan the QR or use the details below to pay first.</p>
            {vendor.payment_methods.map((pm, i) => <PaymentMethodCard key={i} method={pm} />)}
          </div>
        )}

        <div className="space-y-3 pt-1">
          <OrderSummaryLine totalItems={totalItems} totalPrice={totalPrice} />
          {submitError && (
            <p className="text-xs text-brand bg-red-50 rounded-xl px-4 py-2.5 text-center">{submitError}</p>
          )}
          <button type="submit" disabled={busy}
            className="w-full bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors">
            {busy
              ? <><Spinner /> Saving order…</>
              : <><WhatsAppIcon /> Place order via WhatsApp</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Item Card ───────────────────────────────────────────────

function ItemCard({ item, onAdd, onImageClick }: {
  item: Item
  onAdd: (item: Item) => void
  onImageClick: (url: string, name: string, description?: string | null) => void
}) {
  return (
    <div className={`group bg-white rounded-2xl overflow-hidden flex flex-col border border-border hover:shadow-md transition-shadow ${!item.is_available ? 'opacity-60' : ''}`}>
      <div className={`aspect-[4/3] relative bg-surface overflow-hidden ${item.image_url ? 'cursor-zoom-in' : ''}`}
        onClick={() => item.image_url && onImageClick(item.image_url, item.name, item.description)}>
        {item.image_url
          ? <Image src={item.image_url} alt={item.name} fill sizes="(max-width: 1024px) 50vw, 300px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="absolute inset-0 flex items-center justify-center text-5xl select-none">🍽️</div>
        }
        {!item.is_available && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-white text-ink text-xs font-bold px-3 py-1 rounded-full border border-border shadow-sm">Sold out</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-bold text-ink leading-snug line-clamp-1">{item.name}</p>
        {item.description && <p className="text-xs text-fog mt-0.5 line-clamp-2 leading-relaxed whitespace-pre-line">{item.description}</p>}
        <div className="flex items-center justify-between mt-auto pt-2.5 gap-2">
          <span className="text-sm font-bold text-ink tabular-nums">RM {item.price.toFixed(2)}</span>
          <button onClick={(e) => { e.stopPropagation(); onAdd(item) }} disabled={!item.is_available}
            className="bg-gradient-to-r from-brand-dark to-brand disabled:from-border disabled:to-border disabled:cursor-not-allowed text-white rounded-lg px-2.5 py-1 text-xs font-semibold hover:opacity-90 transition-opacity shrink-0">
            + Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Payment Method Card ──────────────────────────────────────

function PaymentMethodCard({ method }: { method: PaymentMethod }) {
  const label = method.type === 'duitnow' ? 'DuitNow' : method.type === 'paynow' ? 'PayNow' : 'Bank Transfer'
  return (
    <div className="bg-white rounded-xl border border-border p-4 space-y-3">
      <p className="text-xs font-bold text-brand uppercase tracking-wide">{label}</p>
      {(method.type === 'duitnow' || method.type === 'paynow') && (
        <div>
          <p className="text-sm font-semibold text-ink">{method.recipient_name}</p>
          <p className="text-sm text-fog font-mono">{method.id}</p>
        </div>
      )}
      {method.type === 'bank' && (
        <div>
          <p className="text-sm font-semibold text-ink">{method.bank_name}</p>
          <p className="text-sm text-fog">Account: <span className="font-mono font-semibold text-ink">{method.account_number}</span></p>
          <p className="text-sm text-fog">{method.account_name}</p>
        </div>
      )}
      {/* QR not shown here — the order status page shows a dynamic amount-filled QR after checkout */}
    </div>
  )
}

// ─── Shared small components ──────────────────────────────────

function DrawerHeader({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
      <div className="flex items-center gap-3">
        {onBack && <button onClick={onBack} className="text-fog hover:text-ink text-xl leading-none">‹</button>}
        <h2 className="text-lg font-bold text-ink">{title}</h2>
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-fog hover:text-ink text-xl leading-none">×</button>
    </div>
  )
}

function QuantityControl({ itemId, quantity, onUpdate }: { itemId: string; quantity: number; onUpdate: (id: string, delta: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onUpdate(itemId, -1)} className="w-6 h-6 rounded-full border border-border text-ink flex items-center justify-center hover:border-ink transition-colors leading-none text-sm">−</button>
      <span className="w-4 text-center text-sm font-bold text-ink tabular-nums">{quantity}</span>
      <button type="button" onClick={() => onUpdate(itemId, 1)} className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center hover:opacity-90 transition-opacity leading-none text-sm">+</button>
    </div>
  )
}

function CheckoutFields({
  name, onName, phone, onPhone, notes, onNotes,
  deliveryType, onDeliveryType, address, onAddress,
}: {
  name: string;         onName: (v: string) => void
  phone: string;        onPhone: (v: string) => void
  notes: string;        onNotes: (v: string) => void
  deliveryType: DeliveryType; onDeliveryType: (v: DeliveryType) => void
  address: string;      onAddress: (v: string) => void
}) {
  return (
    <>
      {/* Pickup / Delivery toggle */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Order type</label>
        <div className="grid grid-cols-2 gap-2">
          {(['pickup', 'delivery'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onDeliveryType(t)}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                deliveryType === t
                  ? 'border-brand bg-brand/5 text-brand'
                  : 'border-border text-fog hover:border-ink hover:text-ink'
              }`}
            >
              {t === 'pickup' ? '🛍️ Self Pickup' : '🛵 Delivery'}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery address — shown only when delivery is selected */}
      {deliveryType === 'delivery' && (
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">
            Delivery address <span className="text-brand">*</span>
          </label>
          <textarea
            required
            value={address}
            onChange={(e) => onAddress(e.target.value)}
            placeholder="Full delivery address (unit, street, postcode, city)"
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-1.5">Name <span className="text-brand">*</span></label>
        <input required type="text" value={name} onChange={(e) => onName(e.target.value)} placeholder="Your name" className={inputCls} />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-1.5">Phone number</label>
        <input type="tel" value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="e.g. 60123456789 (optional)" className={inputCls} />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-1.5">Notes</label>
        <textarea value={notes} onChange={(e) => onNotes(e.target.value)}
          placeholder="Allergies, special requests… (optional)" rows={3}
          className={`${inputCls} resize-none`} />
      </div>
    </>
  )
}

function OrderSummaryLine({ totalItems, totalPrice }: { totalItems: number; totalPrice: number }) {
  return (
    <div className="flex justify-between text-sm text-fog">
      <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
      <span className="font-bold text-ink tabular-nums">RM {totalPrice.toFixed(2)}</span>
    </div>
  )
}

// ─── WhatsApp URL builder ─────────────────────────────────────

function buildWhatsAppUrl(
  vendorPhone: string,
  shortOrderId: string,
  totalPrice: number,
  cart: CartItem[],
  deliveryType: DeliveryType,
  address: string,
  notes: string,
  customerName: string,
  customerPhone: string,
): string {
  // Normalise to E.164-ish without the '+' — expected by wa.me
  const raw = vendorPhone.replace(/\D/g, '')
  const phone = raw.startsWith('60') ? raw : raw.startsWith('0') ? '60' + raw.slice(1) : raw
  const itemSummary = cart.map((ci) => `${ci.quantity}x ${ci.item.name}`).join(', ')

  const lines = [
    `Hello! I would like to confirm my order: ${shortOrderId}.`,
    `Name: ${customerName.trim()}.`,
    customerPhone.trim() ? `Phone: ${customerPhone.trim()}.` : '',
    `Total: RM ${totalPrice.toFixed(2)}.`,
    `Items: ${itemSummary}.`,
    deliveryType === 'delivery' ? `Delivery to: ${address.trim()}.` : 'Self pickup.',
    notes.trim() ? `Notes: ${notes.trim()}.` : '',
    'Please send me your bank details to proceed.',
  ].filter(Boolean).join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`
}

// ─── Micro components ─────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const inputCls = 'w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition bg-white'
