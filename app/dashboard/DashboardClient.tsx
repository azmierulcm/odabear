'use client'

import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compressImage'
import { isDuitNowQr } from '@/lib/duitnowQr'
import { decodeQrFromFile } from '@/lib/decodeQrImage'
import { waUrl } from '@/lib/whatsapp'
import { getReceiptSignedUrl } from './actions'
import { getBookingReceiptSignedUrl } from '@/app/booking/[token]/actions'
import { buildReceipt } from '@/lib/escpos'
import { isBluetoothPrintingSupported, isConnected, connectPrinter, printBytes, type PrinterConnection } from '@/lib/btPrinter'
import SubscriptionCard from './SubscriptionCard'
import type { Vendor, Category, Item, Order, OrderStatus, OrderLineItem, PaymentMethod, PaymentStatus, BusinessType, Booking, BookingStatus } from '@/types/menu'

type Tab = 'profile' | 'rooms' | 'main' | 'activity' | 'analytics' | 'settings'

interface PlatformBilling {
  payload: string | null
  name: string
  qrUrl: string | null
}

interface Props {
  userId: string
  vendor: Vendor | null
  initialCategories: Category[]
  initialItems: Item[]
  billing: PlatformBilling
}

export default function DashboardClient({ userId, vendor: initialVendor, initialCategories, initialItems, billing }: Props) {
  const [vendor, setVendor]         = useState<Vendor | null>(initialVendor)
  const [businessType, setBusinessType] = useState<BusinessType | null>(initialVendor?.business_type ?? null)
  const [tab, setTab]               = useState<Tab>('profile')
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [items, setItems]           = useState<Item[]>(initialItems)
  const [showBackToTop, setShowBackToTop] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const refreshData = async (vendorId: string) => {
    const { data: cats } = await supabase.from('categories').select('*').eq('vendor_id', vendorId).order('sort_order', { ascending: true })
    const newCats = (cats ?? []) as Category[]
    setCategories(newCats)
    if (newCats.length > 0) {
      const { data: its } = await supabase.from('items').select('*').in('category_id', newCats.map((c) => c.id)).order('sort_order', { ascending: true })
      setItems((its ?? []) as Item[])
    } else {
      setItems([])
    }
  }

  const handleSelectBusinessType = async (type: BusinessType) => {
    setBusinessType(type)
    if (vendor) {
      const { data } = await supabase.from('vendors').update({ business_type: type }).eq('id', vendor.id).select().single()
      if (data) setVendor(data as Vendor)
    }
  }

  // Show setup screen if business type not chosen yet
  if (!businessType) {
    return <BusinessTypeSetup onSelect={handleSelectBusinessType} />
  }

  const tabConfig: { id: Tab; label: string }[] = businessType === 'booking'
    ? [
        { id: 'profile',   label: 'Profile' },
        { id: 'rooms',     label: 'Rooms & Services' },
        { id: 'main',      label: 'Availability' },
        { id: 'activity',  label: 'Bookings' },
        { id: 'analytics', label: 'Sales' },
        { id: 'settings',  label: 'Settings' },
      ]
    : [
        { id: 'profile',   label: 'Profile' },
        { id: 'main',      label: businessType === 'retail' ? 'Products' : 'Menu' },
        { id: 'activity',  label: 'Orders' },
        { id: 'analytics', label: 'Sales' },
        { id: 'settings',  label: 'Settings' },
      ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-ink mb-6">
        {vendor ? vendor.name : 'Set up your shop'}
      </h1>

      <div className="flex border-b border-border mb-8 overflow-x-auto no-scrollbar">
        {tabConfig.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 px-1 mr-6 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.id ? 'border-ink text-ink' : 'border-transparent text-fog hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <ProfileTab userId={userId} vendor={vendor} businessType={businessType} onSaved={(v) => { setVendor(v); setBusinessType(v.business_type) }} supabase={supabase} />
      )}

      {tab === 'rooms' && vendor && (
        <MenuTab userId={userId} vendor={vendor} categories={categories} items={items} businessType={businessType} onChanged={() => refreshData(vendor.id)} supabase={supabase} />
      )}
      {tab === 'rooms' && !vendor && <SetupPrompt onGoToProfile={() => setTab('profile')} />}

      {tab === 'main' && businessType === 'booking' && vendor && (
        <AvailabilityTab
          vendor={vendor}
          onVendorUpdate={setVendor}
          supabase={supabase}
          items={items}
          onItemUpdate={(updated) => setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
        />
      )}
      {tab === 'main' && businessType !== 'booking' && vendor && (
        <MenuTab userId={userId} vendor={vendor} categories={categories} items={items} businessType={businessType} onChanged={() => refreshData(vendor.id)} supabase={supabase} />
      )}
      {tab === 'main' && !vendor && <SetupPrompt onGoToProfile={() => setTab('profile')} />}

      {tab === 'activity' && businessType === 'booking' && vendor && (
        <BookingsTab vendor={vendor} supabase={supabase} />
      )}
      {tab === 'activity' && businessType !== 'booking' && vendor && (
        <OrdersTab vendor={vendor} supabase={supabase} />
      )}
      {tab === 'activity' && !vendor && <SetupPrompt onGoToProfile={() => setTab('profile')} />}

      {tab === 'analytics' && vendor && (
        <AnalyticsTab vendor={vendor} businessType={businessType} supabase={supabase} />
      )}
      {tab === 'analytics' && !vendor && <SetupPrompt onGoToProfile={() => setTab('profile')} />}

      {tab === 'settings' && vendor && (
        <SettingsTab userId={userId} vendor={vendor} billing={billing} onSaved={(v) => setVendor(v)} onPatchVendor={(patch) => setVendor((prev) => prev ? { ...prev, ...patch } : prev)} supabase={supabase} />
      )}
      {tab === 'settings' && !vendor && <SetupPrompt onGoToProfile={() => setTab('profile')} />}

      {/* ── Back to Top ───────────────────────────────────────── */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-6 right-4 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-ink text-white shadow-lg transition-all duration-300 ${
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  )
}

// ─── Business Type Setup ──────────────────────────────────────

const BUSINESS_TYPES: { type: BusinessType; emoji: string; title: string; description: string }[] = [
  {
    type: 'restaurant',
    emoji: '🍽️',
    title: 'F&B / Restaurant',
    description: 'Manage your menu, categories, and promos. Customers browse and order directly via WhatsApp.',
  },
  {
    type: 'retail',
    emoji: '🛍️',
    title: 'Retail Shop',
    description: 'Showcase your products, manage inventory, and receive purchase orders instantly.',
  },
  {
    type: 'booking',
    emoji: '🏡',
    title: 'Service & Homestay',
    description: 'List your services or rooms, manage a booking calendar, and receive reservation requests.',
  },
]

function BusinessTypeSetup({ onSelect }: { onSelect: (type: BusinessType) => void }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center mb-10">
        <p className="text-4xl mb-4">👋</p>
        <h1 className="text-3xl font-bold text-ink mb-3">Welcome to Jomoda</h1>
        <p className="text-fog text-base">What type of business are you setting up?</p>
      </div>

      <div className="max-w-2xl w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
        {BUSINESS_TYPES.map((bt) => (
          <button
            key={bt.type}
            onClick={() => onSelect(bt.type)}
            className="group bg-white border-2 border-border hover:border-brand rounded-2xl p-6 text-left flex flex-col gap-4 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span className="text-5xl">{bt.emoji}</span>
            <div>
              <p className="font-bold text-ink text-base mb-1.5 group-hover:text-brand transition-colors">{bt.title}</p>
              <p className="text-xs text-fog leading-relaxed">{bt.description}</p>
            </div>
            <span className="mt-auto text-xs font-semibold text-brand opacity-0 group-hover:opacity-100 transition-opacity">
              Select →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Profile Tab ─────────────────────────────────────────────

function ProfileTab({ userId, vendor, businessType, onSaved, supabase }: {
  userId: string
  vendor: Vendor | null
  businessType: BusinessType
  onSaved: (v: Vendor) => void
  supabase: ReturnType<typeof createClient>
}) {
  const [name, setName]               = useState(vendor?.name ?? '')
  const [slug, setSlug]               = useState(vendor?.slug ?? '')
  const [phone, setPhone]             = useState(vendor?.phone_number ?? '')
  const [logoUrl, setLogoUrl]         = useState(vendor?.logo_url ?? '')
  const [description, setDescription]         = useState(vendor?.description ?? '')
  const [promoText, setPromoText]             = useState(vendor?.promo_text ?? '')
  const [locationAddress, setLocationAddress] = useState(vendor?.location_address ?? '')
  const [locationLat, setLocationLat]         = useState(vendor?.location_lat?.toString() ?? '')
  const [locationLng, setLocationLng]         = useState(vendor?.location_lng?.toString() ?? '')
  const [galleryUrls, setGalleryUrls]         = useState<string[]>(vendor?.gallery_urls ?? [])
  const [makanjomUrl, setMakanjomUrl]         = useState(() => {
    const id = vendor?.makanjom_restaurant_id
    return id ? `https://makanjom.com/restaurants/${id}` : ''
  })
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [message, setMessage]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Extract UUID from a Makanjom restaurant URL or a raw UUID string
  const parseMakanjomId = (raw: string): string | null => {
    const trimmed = raw.trim()
    if (!trimmed) return null
    // Full URL: https://makanjom.com/restaurants/<uuid>
    const urlMatch = trimmed.match(/restaurants\/([0-9a-f-]{36})/i)
    if (urlMatch) return urlMatch[1]
    // Raw UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return trimmed
    return null
  }

  const descPlaceholder = businessType === 'booking'
    ? 'Describe your property, location, amenities…'
    : businessType === 'retail'
    ? 'Tell customers about your shop and products…'
    : 'Tell customers about your food, story, or specialty…'

  const promoPlaceholder = businessType === 'booking'
    ? 'e.g. Free breakfast included! Book 3 nights, get 1 free.'
    : businessType === 'retail'
    ? 'e.g. Free shipping on orders above RM 80!'
    : 'e.g. Free delivery on orders above RM 30!'

  const slugHint = businessType === 'booking' ? 'Your public booking page' : 'Your public menu link'
  const publishLabel = vendor ? 'Save changes' : businessType === 'booking' ? 'Publish my page' : 'Publish my menu'

  const handleLogoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setLogoUploadError('File too large. Max 5 MB.'); return }
    setLogoUploading(true)
    setLogoUploadError(null)
    const upload = await compressImage(file)
    const ext  = upload.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/logo_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('vendor-galleries').upload(path, upload, { upsert: true })
    if (error) {
      setLogoUploadError(`Upload failed: ${error.message}`)
    } else if (data) {
      const { data: urlData } = supabase.storage.from('vendor-galleries').getPublicUrl(data.path)
      setLogoUrl(urlData.publicUrl)
    }
    setLogoUploading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    // phone_number is required by DB (NOT NULL) so include current value; format
    // validation is enforced in Settings tab where the input field lives.
    const payload: Record<string, unknown> = {
      user_id:       userId,
      name:          name.trim(),
      slug:          slug.trim().toLowerCase().replace(/\s+/g, '-'),
      phone_number:  phone.trim(),
      logo_url:      logoUrl.trim() || null,
      description:   description.trim() || null,
      promo_text:       promoText.trim() || null,
      location_address: businessType === 'booking' ? (locationAddress.trim() || null) : null,
      location_lat:     businessType === 'booking' ? (locationLat.trim() ? parseFloat(locationLat) : null) : null,
      location_lng:     businessType === 'booking' ? (locationLng.trim() ? parseFloat(locationLng) : null) : null,
      gallery_urls:            galleryUrls,
      business_type:           businessType,
      makanjom_restaurant_id:  parseMakanjomId(makanjomUrl),
    }

    let result
    if (vendor) {
      result = await supabase.from('vendors').update(payload).eq('id', vendor.id).select().single()
    } else {
      result = await supabase.from('vendors').insert(payload).select().single()
    }

    setSaving(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error.message })
    } else {
      setMessage({ type: 'success', text: 'Profile saved!' })
      onSaved(result.data as Vendor)
    }
  }

  return (
    <div className="space-y-6">
      {!vendor && (
        <div className="bg-brand/5 border border-brand/20 rounded-2xl p-4 text-sm text-ink">
          👋 Welcome! Fill in your details to publish your{' '}
          {businessType === 'booking' ? 'booking page' : 'shop'}.
        </div>
      )}

      {vendor && (
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-base font-semibold text-ink mb-1">
            {businessType === 'booking' ? 'Property photos' : 'Shop photos'}
          </h2>
          <p className="text-xs text-fog mb-5">Up to 5 photos shown as a hero gallery on your public page.</p>
          <GalleryField
            userId={userId}
            vendorId={vendor.id}
            urls={galleryUrls}
            onChange={(urls) => {
              setGalleryUrls(urls)
              supabase.from('vendors').update({ gallery_urls: urls }).eq('id', vendor.id)
            }}
            supabase={supabase}
          />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="text-base font-semibold text-ink mb-5">Business details</h2>
        <form
          onSubmit={handleSave}
          onKeyDown={(e) => {
            const tag = (e.target as HTMLElement).tagName
            if (e.key === 'Enter' && tag !== 'TEXTAREA' && tag !== 'BUTTON') e.preventDefault()
          }}
          className="space-y-4"
        >
          <Field label="Logo" hint="Shown as your shop icon — square image works best">
            <LogoUploadField
              logoUrl={logoUrl}
              uploading={logoUploading}
              onUpload={handleLogoUpload}
              onRemove={() => setLogoUrl('')}
            />
            {logoUploadError && <p className="text-xs text-brand mt-1">{logoUploadError}</p>}
          </Field>

          <Field label="Business Name" required>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder={businessType === 'booking' ? 'e.g. Tepi Pantai Chalet' : 'e.g. Demo Kopitiam'}
              className={inputCls} />
          </Field>

          <Field label="URL Slug" hint={<>{slugHint}: <span className="font-semibold text-ink">jomoda.com/{slug || 'your-slug'}</span></>} required>
            <input type="text" required value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="demo-kopitiam" className={inputCls} />
          </Field>

          <Field label="Description" hint="Shown on your public page">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder={descPlaceholder}
              className={`${inputCls} resize-none`} />
          </Field>

          {businessType === 'booking' && (
            <Field label="Location / Address" hint="Shown on your public page below the map">
              <textarea value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)}
                rows={2} placeholder="e.g. Lot 12, Jalan Pantai, 43000 Kajang, Selangor"
                className={`${inputCls} resize-y`} />
            </Field>
          )}

          {businessType === 'booking' && (
            <Field
              label="Precise Location (optional)"
              hint={<>Get coordinates from Google Maps — long-press your property → tap the coordinates. <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline text-brand">Open Google Maps ↗</a></>}
            >
              <div className="flex gap-3">
                <input
                  type="number" step="any" value={locationLat}
                  onChange={(e) => setLocationLat(e.target.value)}
                  placeholder="Latitude e.g. 3.1390"
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="number" step="any" value={locationLng}
                  onChange={(e) => setLocationLng(e.target.value)}
                  placeholder="Longitude e.g. 101.6869"
                  className={`${inputCls} flex-1`}
                />
              </div>
            </Field>
          )}

          {businessType !== 'booking' && (
            <Field label="Promo / Announcement" hint="Highlighted banner on your page (optional)">
              <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)}
                placeholder={promoPlaceholder} className={inputCls} />
            </Field>
          )}

          {businessType === 'restaurant' && (
            <div className="bg-gradient-to-br from-orange-50 to-rose-50 border border-orange-200/70 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg shrink-0">🍽️</span>
                <p className="text-sm font-bold text-ink">Get found by more hungry customers</p>
                <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">Free</span>
              </div>
              <p className="text-xs text-fog leading-relaxed">
                Makanjom is where Malaysians go to discover places to eat. Link your Makanjom page below and a &quot;Discover on Makanjom&quot; button will appear on your menu — sending more people your way, at no extra cost.
              </p>
              <input
                type="text"
                value={makanjomUrl}
                onChange={(e) => setMakanjomUrl(e.target.value)}
                placeholder="Paste your Makanjom page link here"
                className={inputCls}
              />
              <p className="text-xs">
                {parseMakanjomId(makanjomUrl) ? (
                  <span className="text-emerald-600 font-semibold">✓ Linked — the button is now live on your menu</span>
                ) : (
                  <span className="text-fog">
                    Not on Makanjom yet?{' '}
                    <a href="https://makanjom.com/vendor" target="_blank" rel="noopener noreferrer" className="text-brand font-semibold underline underline-offset-2">
                      Create your free listing →
                    </a>
                  </span>
                )}
              </p>
            </div>
          )}

          {message && (
            <p className={`text-sm rounded-xl px-4 py-2.5 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-brand'}`}>
              {message.text}
            </p>
          )}

          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving…' : publishLabel}
          </button>
        </form>

        {vendor && (
          <div className="mt-4 pt-4 border-t border-border">
            <a href={`/${vendor.slug}`} target="_blank" rel="noopener noreferrer"
              className="text-sm font-semibold text-brand underline underline-offset-2">
              View public page ↗
            </a>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Gallery Upload Field ────────────────────────────────────

function GalleryField({ userId, vendorId, urls, onChange, supabase }: {
  userId: string
  vendorId: string
  urls: string[]
  onChange: (urls: string[]) => void
  supabase: ReturnType<typeof createClient>
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    if (urls.length >= 5) return
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5 MB.'); return }
    setUploading(true)
    setError(null)
    const upload = await compressImage(file)
    const ext  = upload.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${vendorId}_${Date.now()}.${ext}`
    const { data, error: err } = await supabase.storage.from('vendor-galleries').upload(path, upload, { upsert: true })
    if (err) {
      setError(`Upload failed: ${err.message}`)
    } else if (data) {
      const { data: urlData } = supabase.storage.from('vendor-galleries').getPublicUrl(data.path)
      onChange([...urls, urlData.publicUrl])
    }
    setUploading(false)
  }

  const handleRemove = (i: number) => onChange(urls.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {urls.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-brand text-sm font-bold hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity">
              ×
            </button>
            <span className="absolute bottom-1 left-1 text-[10px] font-bold text-white bg-black/40 rounded px-1">{i + 1}</span>
          </div>
        ))}
        {urls.length < 5 && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-fog hover:border-ink hover:text-ink transition-colors disabled:opacity-50">
            <span className="text-2xl leading-none">{uploading ? '…' : '+'}</span>
            <span className="text-[10px] font-semibold">{uploading ? 'Uploading' : 'Add photo'}</span>
          </button>
        )}
        {Array.from({ length: Math.max(0, 5 - urls.length - 1) }).map((_, i) => (
          <div key={`ph-${i}`} className="w-24 h-24 rounded-xl border border-dashed border-border bg-surface" />
        ))}
      </div>
      {error && <p className="text-xs text-brand">{error}</p>}
      <p className="text-xs text-fog">{urls.length}/5 photos · First photo is the hero image</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = '' }} />
    </div>
  )
}

// ─── Menu / Products Tab ─────────────────────────────────────

function MenuTab({ userId, vendor, categories, items, businessType, onChanged, supabase }: {
  userId: string
  vendor: Vendor
  categories: Category[]
  items: Item[]
  businessType: BusinessType
  onChanged: () => void
  supabase: ReturnType<typeof createClient>
}) {
  const isRetail   = businessType === 'retail'
  const isBooking  = businessType === 'booking'
  const catLabel   = isBooking ? 'Service Type' : isRetail ? 'Product Category' : 'Category'
  const itemLabel  = isBooking ? 'Service / Room' : isRetail ? 'Product' : 'Item'

  return (
    <div className="space-y-6">
      <CategoriesTab vendor={vendor} categories={categories} catLabel={catLabel} onChanged={onChanged} supabase={supabase} />
      <ItemsTab userId={userId} vendor={vendor} categories={categories} items={items} itemLabel={itemLabel} isBooking={isBooking} onChanged={onChanged} supabase={supabase} />
    </div>
  )
}

// ─── Categories Tab ──────────────────────────────────────────

function CategoriesTab({ vendor, categories, catLabel, onChanged, supabase }: {
  vendor: Vendor
  categories: Category[]
  catLabel: string
  onChanged: () => void
  supabase: ReturnType<typeof createClient>
}) {
  const [newName, setNewName]     = useState('')
  const [adding, setAdding]       = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName]   = useState('')
  const [editOrder, setEditOrder] = useState(0)
  const [busy, setBusy]           = useState(false)

  const addCategory = async () => {
    if (!newName.trim()) return
    setBusy(true)
    await supabase.from('categories').insert({ vendor_id: vendor.id, name: newName.trim(), sort_order: categories.length })
    setNewName('')
    setAdding(false)
    setBusy(false)
    onChanged()
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    setBusy(true)
    await supabase.from('categories').update({ name: editName.trim(), sort_order: editOrder }).eq('id', id)
    setEditingId(null)
    setBusy(false)
    onChanged()
  }

  const deleteCategory = async (id: string) => {
    if (!confirm(`Delete this ${catLabel.toLowerCase()} and all its items?`)) return
    setBusy(true)
    await supabase.from('categories').delete().eq('id', id)
    setBusy(false)
    onChanged()
  }

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-ink">{catLabel}s</h2>
        <button onClick={() => setAdding(true)} className={btnSmall}>+ Add</button>
      </div>

      {categories.length === 0 && !adding && (
        <p className="text-sm text-fog text-center py-12">No {catLabel.toLowerCase()}s yet.</p>
      )}

      <ul className="divide-y divide-surface">
        {categories.map((cat) =>
          editingId === cat.id ? (
            <li key={cat.id} className="px-6 py-4 space-y-3 bg-surface">
              <input type="text" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                placeholder={`${catLabel} name`} className={inputCls}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(cat.id) } }} />
              <div className="flex items-center gap-3">
                <button onClick={() => saveEdit(cat.id)} disabled={busy || !editName.trim()} className={btnSmall}>Save</button>
                <button onClick={() => setEditingId(null)} className={btnGhost}>Cancel</button>
              </div>
            </li>
          ) : (
            <li key={cat.id} className="flex items-center justify-between px-6 py-4">
              <span className="text-sm font-medium text-ink">{cat.name}</span>
              <div className="flex items-center gap-4">
                <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditOrder(cat.sort_order) }}
                  className="text-sm font-semibold text-ink underline underline-offset-2">Edit</button>
                <button onClick={() => deleteCategory(cat.id)}
                  className="text-sm font-semibold text-brand underline underline-offset-2">Delete</button>
              </div>
            </li>
          )
        )}
      </ul>

      {adding && (
        <div className="px-6 py-4 border-t border-border bg-surface space-y-3">
          <input type="text" autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder={`${catLabel} name`} className={inputCls}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }} />
          <div className="flex items-center gap-3">
            <button onClick={addCategory} disabled={busy || !newName.trim()} className={btnSmall}>{busy ? '…' : 'Add'}</button>
            <button onClick={() => { setAdding(false); setNewName('') }} className={btnGhost}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Items Tab ───────────────────────────────────────────────

const EMPTY_ITEM = { name: '', description: '', price: '', image_url: '', image_urls: [] as string[], category_id: '', is_available: true, sort_order: 0 }

function ItemsTab({ userId, vendor, categories, items, itemLabel, isBooking, onChanged, supabase }: {
  userId: string
  vendor: Vendor
  categories: Category[]
  items: Item[]
  itemLabel: string
  isBooking: boolean
  onChanged: () => void
  supabase: ReturnType<typeof createClient>
}) {
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({ ...EMPTY_ITEM, category_id: categories[0]?.id ?? '' })
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [busy, setBusy]               = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Sync category_id when categories first load (e.g. after adding the first category)
  useEffect(() => {
    if (form.category_id === '' && categories.length > 0) {
      setForm((prev) => ({ ...prev, category_id: categories[0].id }))
    }
  }, [categories])

  const resetForm = () => {
    setForm({ ...EMPTY_ITEM, category_id: categories[0]?.id ?? '' })
    setShowForm(false)
    setEditingItem(null)
    setUploadError(null)
    setSubmitError(null)
  }

  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setUploadError('File too large. Max 5 MB.'); return }
    setUploading(true)
    setUploadError(null)
    const upload = await compressImage(file)
    const ext  = upload.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${vendor.id}_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('item-images').upload(path, upload, { upsert: true })
    if (error) {
      setUploadError(`Upload failed: ${error.message}`)
    } else if (data) {
      const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(data.path)
      setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }))
    }
    setUploading(false)
  }

  // Multi-photo upload for booking type (up to 5 photos per room)
  const handleRoomPhotoUpload = async (file: File) => {
    if (form.image_urls.length >= 5) return
    if (file.size > 5 * 1024 * 1024) { setUploadError('File too large. Max 5 MB.'); return }
    setUploading(true)
    setUploadError(null)
    const upload = await compressImage(file)
    const ext  = upload.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${vendor.id}_room_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('item-images').upload(path, upload, { upsert: true })
    if (error) {
      setUploadError(`Upload failed: ${error.message}`)
    } else if (data) {
      const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(data.path)
      const newUrl = urlData.publicUrl
      setForm((prev) => ({
        ...prev,
        image_urls: [...prev.image_urls, newUrl],
        // Keep image_url in sync with first photo for backward compat
        image_url: prev.image_urls.length === 0 ? newUrl : prev.image_url,
      }))
    }
    setUploading(false)
  }

  const handleRemoveRoomPhoto = (i: number) => {
    setForm((prev) => {
      const next = prev.image_urls.filter((_, idx) => idx !== i)
      return { ...prev, image_urls: next, image_url: next[0] ?? '' }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setSubmitError(null)

    // Guard: category must be selected (can be empty string if categories loaded after mount)
    if (!form.category_id) {
      setSubmitError('Please select a category.')
      setBusy(false)
      return
    }

    // Reject non-https image URLs (blocks javascript: and data: URIs)
    const rawImageUrl = form.image_url.trim()
    if (rawImageUrl && !rawImageUrl.startsWith('https://')) {
      setSubmitError('Image URL must start with https://')
      setBusy(false)
      return
    }

    // Build payload — only include image_urls if the column exists (booking type).
    // For non-booking types we omit it entirely to avoid DB errors if migration hasn't run.
    const payload: Record<string, unknown> = {
      category_id:  form.category_id,
      name:         form.name.trim(),
      description:  form.description.trim() || null,
      price:        parseFloat(form.price),
      image_url:    isBooking ? (form.image_urls[0] ?? null) : (form.image_url.trim() || null),
      is_available: form.is_available,
      sort_order:   form.sort_order,
    }
    if (isBooking) {
      payload.image_urls = form.image_urls
    }

    let dbError: string | null = null
    if (editingItem) {
      const { error } = await supabase.from('items').update(payload).eq('id', editingItem.id)
      if (error) dbError = error.message
    } else {
      const { error } = await supabase.from('items').insert(payload)
      if (error) dbError = error.message
    }

    setBusy(false)
    if (dbError) {
      setSubmitError(dbError)
      return
    }
    resetForm()
    onChanged()
  }

  const startEdit = (item: Item) => {
    setEditingItem(item)
    setForm({
      name:         item.name,
      description:  item.description ?? '',
      price:        item.price.toString(),
      image_url:    item.image_url ?? '',
      image_urls:   item.image_urls ?? [],
      category_id:  item.category_id,
      is_available: item.is_available,
      sort_order:   item.sort_order,
    })
    setShowForm(true)
    setUploadError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteItem = async (id: string) => {
    if (!confirm(`Delete this ${itemLabel.toLowerCase()}?`)) return
    setBusy(true)
    await supabase.from('items').delete().eq('id', id)
    setBusy(false)
    onChanged()
  }

  const toggleAvailable = async (item: Item) => {
    await supabase.from('items').update({ is_available: !item.is_available }).eq('id', item.id)
    onChanged()
  }

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border p-12 text-center text-fog text-sm">
        Create a category first before adding {itemLabel.toLowerCase()}s.
      </div>
    )
  }

  const priceLabelHint = isBooking ? 'Price per night / session (RM)' : 'Price (RM)'
  const availableLabel = isBooking ? 'Available to book' : 'Available for order'

  return (
    <div className="space-y-4">
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxUrl(null)} className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm font-semibold">Close ✕</button>
            <img src={lightboxUrl} alt="" className="w-full rounded-2xl object-contain max-h-[80vh]" />
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-base font-semibold text-ink mb-5">{editingItem ? `Edit ${itemLabel}` : `New ${itemLabel}`}</h2>
          <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              const tag = (e.target as HTMLElement).tagName
              if (e.key === 'Enter' && tag !== 'TEXTAREA' && tag !== 'BUTTON') e.preventDefault()
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" required>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              </Field>
              <Field label={priceLabelHint} required>
                <input type="number" required step="0.01" min="0" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${inputCls} resize-y min-h-[120px]`} placeholder="Optional" rows={5} />
            </Field>
            <Field label="Category" required>
              <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputCls}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {isBooking ? (
              <Field label="Room Photos" hint="Up to 5 photos — first photo is the main listing image">
                <RoomPhotoGallery
                  urls={form.image_urls}
                  uploading={uploading}
                  onUpload={handleRoomPhotoUpload}
                  onRemove={handleRemoveRoomPhoto}
                />
                {uploadError && <p className="text-xs text-brand mt-2">{uploadError}</p>}
              </Field>
            ) : (
              <Field label="Photo">
                <ItemImageUpload imageUrl={form.image_url} uploading={uploading} onUpload={handleImageUpload} onRemove={() => setForm({ ...form, image_url: '' })} />
                {uploadError && <p className="text-xs text-brand mt-2">{uploadError}</p>}
              </Field>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="w-4 h-4 rounded accent-brand" />
              <span className="text-sm font-medium text-ink">{availableLabel}</span>
            </label>
            {submitError && (
              <p className="text-xs text-brand bg-red-50 rounded-xl px-4 py-2.5">{submitError}</p>
            )}
            <div className="flex items-center gap-4 pt-1">
              <button type="submit" disabled={busy || uploading} className={btnPrimary}>{busy ? 'Saving…' : editingItem ? 'Save changes' : `Add ${itemLabel}`}</button>
              <button type="button" onClick={resetForm} className={btnGhost}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-ink">{itemLabel}s</h2>
          {!showForm && <button onClick={() => setShowForm(true)} className={btnSmall}>+ Add {itemLabel}</button>}
        </div>
        {items.length === 0 && <p className="text-sm text-fog text-center py-12">No {itemLabel.toLowerCase()}s yet.</p>}
        <ul className="divide-y divide-surface">
          {items.map((item) => {
            const thumbUrl = isBooking ? (item.image_urls?.[0] ?? item.image_url) : item.image_url
            const photoCount = isBooking ? (item.image_urls?.length ?? (item.image_url ? 1 : 0)) : 0
            return (
            <li key={item.id} className="flex items-center gap-4 px-6 py-4">
              <button type="button" onClick={() => thumbUrl && setLightboxUrl(thumbUrl)}
                className={`relative w-12 h-12 rounded-xl overflow-hidden bg-surface shrink-0 flex items-center justify-center text-xl ${thumbUrl ? 'cursor-zoom-in hover:opacity-80' : 'cursor-default'}`}>
                {thumbUrl
                  ? <Image src={thumbUrl} alt={item.name} width={48} height={48} className="object-cover w-full h-full" />
                  : isBooking ? '🏡' : '🍽️'}
                {isBooking && photoCount > 1 && (
                  <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] font-bold px-1 rounded-tl">+{photoCount}</span>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-fog">{categoryName(item.category_id)}</span>
                  <span className="text-xs text-fog">·</span>
                  <span className="text-xs font-bold text-ink">RM {item.price.toFixed(2)}{isBooking ? '/night' : ''}</span>
                </div>
              </div>
              <button onClick={() => toggleAvailable(item)}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                  item.is_available ? 'bg-green-50 text-green-700 border-green-200' : 'bg-surface text-fog border-border'
                }`}>
                {item.is_available ? (isBooking ? 'Available' : 'Available') : (isBooking ? 'Unavailable' : 'Sold out')}
              </button>
              <div className="flex items-center gap-4 shrink-0">
                <button onClick={() => startEdit(item)} className="text-sm font-semibold text-ink underline underline-offset-2">Edit</button>
                <button onClick={() => deleteItem(item.id)} className="text-sm font-semibold text-brand underline underline-offset-2">Delete</button>
              </div>
            </li>
          )})}
        </ul>
      </div>
    </div>
  )
}

// ─── Availability Tab (booking type) ─────────────────────────

const CLOSE_ALL = '__all__'

// Format "2026-06-17" → "17 June 2026"
function fmtDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

function AvailabilityTab({ vendor, onVendorUpdate, supabase, items, onItemUpdate }: {
  vendor: Vendor
  onVendorUpdate: (v: Vendor) => void
  supabase: ReturnType<typeof createClient>
  items: Item[]
  onItemUpdate: (item: Item) => void
}) {
  const [bookings, setBookings]           = useState<Booking[]>([])
  const [blockedDates, setBlockedDates]   = useState<string[]>(vendor.blocked_dates ?? [])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [calMonth, setCalMonth]           = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [pendingDate, setPendingDate]     = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'block' | 'unblock' | null>(null)
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess]     = useState(false)

  useEffect(() => {
    const load = async () => {
      // Only current/future bookings can block availability — past ones are irrelevant.
      const todayStr = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('bookings').select('*').eq('vendor_id', vendor.id)
        .gte('end_date', todayStr).order('start_date')
      setBookings((data ?? []) as Booking[])
    }
    load()
    const channel = supabase.channel(`bookings:${vendor.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `vendor_id=eq.${vendor.id}` },
        (payload) => setBookings((prev) => [...prev, payload.new as Booking]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `vendor_id=eq.${vendor.id}` },
        (payload) => setBookings((prev) => prev.map((b) => b.id === (payload.new as Booking).id ? payload.new as Booking : b)))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [vendor.id, supabase])

  const today        = new Date().toISOString().split('T')[0]
  const isCloseAll   = selectedRoomId === CLOSE_ALL
  const hasSelection = selectedRoomId !== ''
  const selectedRoom = items.find((i) => i.id === selectedRoomId) ?? null

  const roomBookedDateMap = useMemo(() => {
    if (!selectedRoom) return {} as Record<string, 'confirmed' | 'pending'>
    const map: Record<string, 'confirmed' | 'pending'> = {}
    bookings
      .filter((b) => b.status !== 'cancelled' && b.service_name === selectedRoom.name)
      .forEach((b) => {
        // Any non-pending, non-cancelled stage (confirmed/holding/cleared/completed)
        // occupies the room — display it the same as a confirmed booking.
        const display = b.status === 'pending' ? 'pending' : 'confirmed'
        const start = new Date(b.start_date)
        const end   = new Date(b.end_date)
        for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().split('T')[0]
          if (map[key] !== 'confirmed') map[key] = display
        }
      })
    return map
  }, [selectedRoom, bookings])

  const roomBlockedSet = useMemo(() => new Set(selectedRoom?.blocked_dates ?? []), [selectedRoom])
  const closeAllSet    = useMemo(() => new Set(blockedDates), [blockedDates])

  // Click a day → open confirmation modal
  const handleDayClick = (dateStr: string) => {
    const isBooked  = !isCloseAll && !!roomBookedDateMap[dateStr]
    if (isBooked) return
    const isBlocked = isCloseAll ? closeAllSet.has(dateStr) : roomBlockedSet.has(dateStr)
    setPendingDate(dateStr)
    setPendingAction(isBlocked ? 'unblock' : 'block')
  }

  // Confirm modal action
  const handleConfirm = async () => {
    if (!pendingDate || !pendingAction) return
    setSaving(true)
    setSaveError(null)

    let failed = false

    if (isCloseAll) {
      const prev = blockedDates
      const next = pendingAction === 'block'
        ? [...blockedDates, pendingDate]
        : blockedDates.filter((d) => d !== pendingDate)
      setBlockedDates(next)                                          // optimistic
      const { error } = await supabase.from('vendors')
        .update({ blocked_dates: next }).eq('id', vendor.id)
      if (error) {
        setBlockedDates(prev)                                        // rollback
        setSaveError('Could not save. Please try again.')
        failed = true
      } else {
        onVendorUpdate({ ...vendor, blocked_dates: next })           // sync parent
      }
    } else if (selectedRoom) {
      const prev = selectedRoom.blocked_dates ?? []
      const next = pendingAction === 'block'
        ? [...prev, pendingDate]
        : prev.filter((d) => d !== pendingDate)
      onItemUpdate({ ...selectedRoom, blocked_dates: next })         // optimistic
      const { error } = await supabase.from('items')
        .update({ blocked_dates: next }).eq('id', selectedRoom.id)
      if (error) {
        onItemUpdate({ ...selectedRoom, blocked_dates: prev })       // rollback
        setSaveError('Could not save. Please try again.')
        failed = true
      }
      // Note: we do NOT overwrite optimistic update with server response —
      // the optimistic state is already correct and prevents a visual flicker.
    }

    setSaving(false)

    if (!failed) {
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        setPendingDate(null)
        setPendingAction(null)
      }, 1200)
    }
  }

  const closeModal = () => {
    setPendingDate(null)
    setPendingAction(null)
    setSaveError(null)
    setSaveSuccess(false)
  }

  const calYear     = calMonth.getFullYear()
  const calMon      = calMonth.getMonth()
  const firstDow    = new Date(calYear, calMon, 1).getDay()
  const daysInMonth = new Date(calYear, calMon + 1, 0).getDate()
  const monthLabel  = calMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  const activePills = isCloseAll
    ? [...blockedDates].sort()
    : [...(selectedRoom?.blocked_dates ?? [])].sort()

  const contextLabel = isCloseAll
    ? 'Tap a date to close your entire property. All rooms will be unavailable on that day.'
    : `Tap any date to block it for ${selectedRoom?.name ?? 'this room'}. Blocked dates are hidden from customers booking online.`

  return (
    <div className="space-y-5">

      {/* ── Step 1: Room / Service Selector ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
        <div>
          <p className="text-[10px] font-bold text-fog uppercase tracking-widest mb-1">Step 1</p>
          <h2 className="text-base font-semibold text-ink">Select Room / Service</h2>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-fog">No rooms yet — add them in <strong>Rooms &amp; Services</strong> first.</p>
        ) : (
          <select
            value={selectedRoomId}
            onChange={(e) => { setSelectedRoomId(e.target.value); setPendingDate(null) }}
            className={inputCls}
          >
            <option value="" disabled>Choose a room or service…</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}{(item.blocked_dates?.length ?? 0) > 0 ? ` (${item.blocked_dates.length} blocked)` : ''}
              </option>
            ))}
            <option value={CLOSE_ALL}>🔒 Close All Rooms (property-wide)</option>
          </select>
        )}
      </div>

      {/* ── Step 2: Calendar ─────────────────────────────────────── */}
      {!hasSelection ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-border p-14 text-center space-y-2">
          <p className="text-3xl">📅</p>
          <p className="font-semibold text-ink">Calendar will appear here</p>
          <p className="text-sm text-fog">Select a room or service above to manage its availability.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">

          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border space-y-1">
            <p className="text-[10px] font-bold text-fog uppercase tracking-widest">Step 2</p>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  {isCloseAll ? 'Close All Rooms' : selectedRoom?.name}
                </h2>
                <p className="text-xs text-fog mt-0.5">{contextLabel}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[11px] text-fog">
              {!isCloseAll && <>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-green-100 border border-green-300 shrink-0" />Confirmed booking</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-yellow-100 border border-yellow-300 shrink-0" />Pending booking</span>
              </>}
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-red-100 border border-red-200 shrink-0" />Manually blocked</span>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => setCalMonth(new Date(calYear, calMon - 1, 1))}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface text-fog hover:text-ink transition-colors text-xl">‹</button>
              <span className="text-base font-bold text-ink">{monthLabel}</span>
              <button onClick={() => setCalMonth(new Date(calYear, calMon + 1, 1))}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface text-fog hover:text-ink transition-colors text-xl">›</button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-fog py-1 uppercase tracking-wide">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day     = i + 1
                const dateStr = `${calYear}-${String(calMon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isPast  = dateStr < today
                const isToday = dateStr === today
                const booked  = !isCloseAll ? roomBookedDateMap[dateStr] : undefined
                const blocked = isCloseAll ? closeAllSet.has(dateStr) : roomBlockedSet.has(dateStr)
                const clickable = !isPast && !booked

                let cellBg = 'bg-white hover:bg-brand/5 border-transparent'
                if (isPast)                       cellBg = 'bg-white border-transparent opacity-30'
                else if (booked === 'confirmed')  cellBg = 'bg-green-50 border-green-200'
                else if (booked === 'pending')    cellBg = 'bg-yellow-50 border-yellow-200'
                else if (blocked)                 cellBg = 'bg-red-50 border-red-200 hover:bg-red-100'

                return (
                  <button
                    key={dateStr}
                    disabled={isPast || !!booked}
                    onClick={() => clickable && handleDayClick(dateStr)}
                    className={`relative flex flex-col items-center justify-center rounded-xl aspect-square border text-sm font-semibold transition-all
                      ${cellBg}
                      ${isToday ? 'ring-2 ring-brand ring-offset-1' : ''}
                      ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`leading-none
                      ${booked === 'confirmed' ? 'text-green-700' : ''}
                      ${booked === 'pending'   ? 'text-yellow-700' : ''}
                      ${blocked && !booked     ? 'text-red-400 line-through' : ''}
                      ${!booked && !blocked && !isPast ? 'text-ink' : ''}
                    `}>
                      {day}
                    </span>
                    {blocked && !booked && (
                      <span className="text-[7px] font-black text-red-400 leading-none mt-0.5 uppercase tracking-wide">Blocked</span>
                    )}
                    {booked === 'confirmed' && (
                      <span className="text-[7px] font-black text-green-600 leading-none mt-0.5 uppercase tracking-wide">Booked</span>
                    )}
                    {booked === 'pending' && (
                      <span className="text-[7px] font-black text-yellow-600 leading-none mt-0.5 uppercase tracking-wide">Pending</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Blocked dates pills */}
            {activePills.length > 0 && (
              <div className="pt-4 border-t border-border space-y-2">
                <p className="text-xs font-semibold text-fog">
                  {isCloseAll ? 'Property closed on:' : `${selectedRoom?.name} manually blocked:`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {activePills.map((d) => (
                    <button
                      key={d}
                      onClick={() => { setPendingDate(d); setPendingAction('unblock') }}
                      className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 transition-colors"
                    >
                      {d} <span className="font-bold leading-none">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ────────────────────────────────────── */}
      {pendingDate && pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!saving ? closeModal : undefined} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Success state */}
            {saveSuccess ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center text-2xl">✓</div>
                <p className="font-bold text-ink text-base">
                  {pendingAction === 'block' ? 'Date blocked!' : 'Date unblocked!'}
                </p>
                <p className="text-sm text-fog">
                  <span className="font-semibold text-ink">{fmtDate(pendingDate)}</span> is now{' '}
                  {pendingAction === 'block' ? 'marked as unavailable.' : 'open for bookings.'}
                </p>
              </div>
            ) : (
              <>
                {/* Colour bar */}
                <div className={`h-1.5 w-full ${pendingAction === 'block' ? 'bg-gradient-to-r from-brand-dark to-brand' : 'bg-green-400'}`} />
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-lg font-bold text-ink">
                      {pendingAction === 'block' ? '🔒 Block this date?' : '🔓 Unblock this date?'}
                    </p>
                    <p className="text-sm text-fog mt-1">
                      <span className="font-semibold text-ink">{fmtDate(pendingDate)}</span>
                      <span className="mx-1.5">·</span>
                      <span>{isCloseAll ? 'All rooms' : selectedRoom?.name}</span>
                    </p>
                  </div>

                  <p className="text-sm text-fog leading-relaxed">
                    {pendingAction === 'block'
                      ? 'This date will be marked as unavailable. Customers cannot book online — ideal for walk-in or external bookings.'
                      : 'This date will be reopened for online customer bookings.'}
                  </p>

                  {/* Error message */}
                  {saveError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <p className="text-sm text-brand font-semibold">{saveError}</p>
                      <p className="text-xs text-fog mt-0.5">Check that your database has the <code>blocked_dates</code> column. Run the SQL migration in Supabase if not.</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleConfirm}
                      disabled={saving}
                      className={`flex-1 font-semibold rounded-xl py-3 text-sm transition-opacity disabled:opacity-50
                        ${pendingAction === 'block'
                          ? 'bg-gradient-to-r from-brand-dark to-brand text-white'
                          : 'bg-green-500 text-white'}`}
                    >
                      {saving ? 'Saving…' : pendingAction === 'block' ? 'Block Date (Manual Booking)' : 'Unblock Date'}
                    </button>
                    <button
                      onClick={closeModal}
                      disabled={saving}
                      className="flex-1 border border-border text-fog font-semibold rounded-xl py-3 text-sm hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Bookings Tab — Pipeline View ────────────────────────────

type StageKey = 'pending' | 'holding' | 'cleared' | 'completed'

const STAGES: {
  key: StageKey
  label: string
  description: string
  activeCls: string
  dotCls: string
  emptyMsg: string
}[] = [
  { key: 'pending',   label: 'New',       description: 'Awaiting your action',        activeCls: 'bg-brand text-white border-brand',                dotCls: 'bg-brand',      emptyMsg: "All clear — no new requests!" },
  { key: 'holding',   label: 'Holding',   description: 'Approved, awaiting payment',  activeCls: 'bg-yellow-400 text-yellow-900 border-yellow-400', dotCls: 'bg-yellow-400', emptyMsg: 'No bookings in holding.' },
  { key: 'cleared',   label: 'Cleared',   description: 'Paid — ready for check-in',   activeCls: 'bg-green-500 text-white border-green-500',        dotCls: 'bg-green-500',  emptyMsg: 'No cleared bookings.' },
  { key: 'completed', label: 'Completed', description: 'Checked out & archived',       activeCls: 'bg-ink text-white border-ink',                    dotCls: 'bg-ink',        emptyMsg: 'No completed bookings yet.' },
]

function BookingsTab({ vendor, supabase }: {
  vendor: Vendor
  supabase: ReturnType<typeof createClient>
}) {
  const [bookings, setBookings]   = useState<Booking[]>([])
  const [loading, setLoading]     = useState(true)
  const [stage, setStage]         = useState<StageKey>('pending')
  const [selected, setSelected]   = useState<Booking | null>(null)
  const [search, setSearch]       = useState('')
  const [logInput, setLogInput]   = useState('')
  const [logSaving, setLogSaving] = useState(false)

  // ── Payment receipt verification ─────────────────────────────
  const [receiptBusy,  setReceiptBusy]  = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)

  const viewBookingReceipt = async (bookingId: string) => {
    setReceiptBusy(bookingId)
    setReceiptError(null)
    const res = await getBookingReceiptSignedUrl(bookingId)
    setReceiptBusy(null)
    if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer')
    else setReceiptError(bookingId)
  }

  // Confirming payment also clears the booking (moves to 'cleared' if pending/holding).
  const confirmBookingPayment = async (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId)
    const shouldClear = target && ['pending', 'holding'].includes(target.status)
    setBookings((prev) => prev.map((b) => b.id === bookingId
      ? { ...b, payment_status: 'confirmed', status: shouldClear ? 'cleared' : b.status }
      : b))
    setSelected((prev) => prev?.id === bookingId
      ? { ...prev, payment_status: 'confirmed', status: shouldClear ? 'cleared' : prev.status }
      : prev)
    await supabase
      .from('bookings')
      .update({ payment_status: 'confirmed', ...(shouldClear ? { status: 'cleared' } : {}) })
      .eq('id', bookingId)
  }

  const rejectBookingPayment = async (bookingId: string) => {
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, payment_status: 'rejected' } : b))
    setSelected((prev) => prev?.id === bookingId ? { ...prev, payment_status: 'rejected' } : prev)
    await supabase.from('bookings').update({ payment_status: 'rejected' }).eq('id', bookingId)
  }

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('bookings').select('*')
        .eq('vendor_id', vendor.id).order('created_at', { ascending: false })
        .limit(DASHBOARD_FETCH_LIMIT)
      setBookings((data ?? []) as Booking[])
      setLoading(false)
    }
    load()

    const channel = supabase.channel(`bookings-pipeline:${vendor.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `vendor_id=eq.${vendor.id}` },
        (p) => setBookings(prev => [p.new as Booking, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `vendor_id=eq.${vendor.id}` },
        (p) => {
          const upd = p.new as Booking
          setBookings(prev => prev.map(b => b.id === upd.id ? upd : b))
          setSelected(prev => prev?.id === upd.id ? upd : prev)
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [vendor.id, supabase])

  // Map legacy 'confirmed' → 'holding' so old bookings show correctly
  const stageOf = (b: Booking): StageKey | 'cancelled' => {
    if (b.status === 'confirmed') return 'holding'
    if (['pending','holding','cleared','completed'].includes(b.status)) return b.status as StageKey
    return 'cancelled'
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return bookings
    return bookings.filter(b =>
      (b.short_booking_id ?? '').toLowerCase().includes(q) ||
      b.customer_name.toLowerCase().includes(q) ||
      (b.customer_phone ?? '').includes(q) ||
      (b.service_name ?? '').toLowerCase().includes(q)
    )
  }, [bookings, search])

  const buckets = useMemo(() => {
    const out: Record<StageKey, Booking[]> = { pending: [], holding: [], cleared: [], completed: [] }
    filtered.forEach(b => { const s = stageOf(b); if (s !== 'cancelled') out[s].push(b) })
    return out
  }, [filtered]) // eslint-disable-line react-hooks/exhaustive-deps

  const moveStage = async (id: string, newStatus: string) => {
    const snap = bookings.find(b => b.id === id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus as BookingStatus } : b))
    setSelected(prev => prev?.id === id ? { ...prev, status: newStatus as BookingStatus } : prev)
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id)
    if (error && snap) {
      setBookings(prev => prev.map(b => b.id === id ? snap : b))
      setSelected(prev => prev?.id === id ? snap : prev)
    }
  }

  const addLog = async () => {
    if (!logInput.trim() || !selected) return
    setLogSaving(true)
    const entry = { text: logInput.trim(), ts: new Date().toISOString() }
    const newLog = [...(selected.staff_log ?? []), entry]
    const upd = { ...selected, staff_log: newLog }
    setSelected(upd)
    setBookings(prev => prev.map(b => b.id === selected.id ? upd : b))
    await supabase.from('bookings').update({ staff_log: newLog }).eq('id', selected.id)
    setLogInput('')
    setLogSaving(false)
  }

  const daysOf = (b: Booking) =>
    Math.max(1, Math.round((new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / 86400000))

  if (loading) return <div className="text-sm text-fog text-center py-16">Loading…</div>

  const currentStage = STAGES.find(s => s.key === stage)!

  return (
    <div className="space-y-4">

      {/* ── Search ───────────────────────────────────────────────── */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog">🔍</span>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by booking ID, name, phone or room…"
          className={`${inputCls} pl-9`}
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fog hover:text-ink text-xl leading-none">×</button>
        )}
      </div>

      {/* ── Pipeline tabs ─────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STAGES.map(s => (
          <button key={s.key} onClick={() => setStage(s.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              stage === s.key ? s.activeCls : 'bg-white border-border text-fog hover:text-ink hover:border-ink'
            }`}
          >
            {s.key === 'pending' && buckets.pending.length > 0 && (
              <span className={`w-2 h-2 rounded-full animate-pulse ${stage === s.key ? 'bg-white' : s.dotCls}`} />
            )}
            {s.label}
            {buckets[s.key].length > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${stage === s.key ? 'bg-white/25' : 'bg-surface'}`}>
                {buckets[s.key].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stage description */}
      <p className="text-xs text-fog">{currentStage.description}</p>

      {/* ── Booking cards ─────────────────────────────────────────── */}
      {buckets[stage].length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-14 text-center space-y-2">
          <p className="text-3xl">{stage === 'pending' ? '🎉' : '📋'}</p>
          <p className="font-semibold text-ink">{currentStage.emptyMsg}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {buckets[stage].map(b => (
            <button key={b.id} onClick={() => setSelected(b)}
              className="w-full text-left bg-white rounded-2xl border border-border p-4 hover:border-ink hover:shadow-sm transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {stage === 'pending' && (
                    <span className="mt-0.5 shrink-0 bg-brand text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">New</span>
                  )}
                  <div>
                    <p className="font-bold text-ink text-sm">{b.customer_name}</p>
                    <p className="text-[10px] font-mono text-fog mt-0.5">{b.short_booking_id ?? '—'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-ink">{b.service_name}</p>
                  <p className="text-[10px] text-fog mt-0.5">{daysOf(b)} day{daysOf(b) !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-fog">
                <span>📅 {b.start_date}</span>
                <span>→</span>
                <span>{b.end_date}</span>
                <div className="ml-auto flex items-center gap-2">
                  {b.payment_status === 'submitted' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Receipt
                    </span>
                  )}
                  {b.payment_status === 'confirmed' && (
                    <span className="text-[10px] font-semibold text-green-700">&#x1F4B0; Paid</span>
                  )}
                  <span className="text-[10px]">{timeAgo(b.created_at)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Detail panel ──────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full lg:max-w-2xl bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 shrink-0 lg:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <p className="font-bold text-ink">{selected.customer_name}</p>
                <p className="text-xs font-mono text-fog">{selected.short_booking_id ?? '—'}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-fog hover:text-ink text-xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-7">

              {/* ── Zone A: Basic Specs ─────────────────────────── */}
              <section className="space-y-3">
                <p className="text-[10px] font-black text-fog uppercase tracking-widest">Zone A — Basic Specs</p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Guest',     value: selected.customer_name },
                    { label: 'Phone',     value: selected.customer_phone || '—' },
                    { label: 'Service / Room', value: selected.service_name || '—' },
                    { label: 'Duration',  value: `${daysOf(selected)} day${daysOf(selected) !== 1 ? 's' : ''}` },
                    { label: 'Check-in',  value: selected.start_date },
                    { label: 'Check-out', value: selected.end_date },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface rounded-xl p-3">
                      <p className="text-[10px] font-bold text-fog uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Payment ledger */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-surface border-b border-border">
                    <p className="text-[10px] font-black text-fog uppercase tracking-widest">Payment</p>
                  </div>
                  <div className="divide-y divide-surface text-sm">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-fog">Nights</span>
                      <span className="font-semibold text-ink">{daysOf(selected)}</span>
                    </div>
                    {selected.total_price && (
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-fog">Total</span>
                        <span className="font-bold text-ink tabular-nums">RM {Number(selected.total_price).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-fog">Status</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                        selected.payment_status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                        selected.payment_status === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        selected.payment_status === 'rejected'  ? 'bg-red-50 text-brand border-red-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {selected.payment_status === 'confirmed' ? '✓ Confirmed' :
                         selected.payment_status === 'submitted' ? 'Receipt uploaded' :
                         selected.payment_status === 'rejected'  ? 'Rejected' :
                         'Awaiting payment'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment receipt review (QR payment flow) */}
                {selected.payment_status === 'submitted' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-blue-700">&#x1F4CB; Receipt uploaded — review and confirm</p>
                    {receiptError === selected.id && (
                      <p className="text-xs text-brand">Could not open receipt. Try again.</p>
                    )}
                    <button
                      onClick={() => viewBookingReceipt(selected.id)}
                      disabled={receiptBusy === selected.id}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl py-2.5 disabled:opacity-50 transition-colors"
                    >
                      {receiptBusy === selected.id ? 'Opening...' : '&#x1F4C4; View Receipt'}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmBookingPayment(selected.id)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
                      >
                        ✓ Confirm Payment
                      </button>
                      <button
                        onClick={() => rejectBookingPayment(selected.id)}
                        className="flex-1 border border-border text-fog text-sm font-semibold rounded-xl py-2.5 hover:border-brand hover:text-brand transition-colors"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                )}

                {selected.payment_status === 'confirmed' && selected.customer_phone && (
                  <a
                    href={waUrl(
                      selected.customer_phone,
                      `Hi ${selected.customer_name.split(' ')[0]}! Your payment for booking ${selected.short_booking_id ?? ''} has been confirmed. Check-in: ${selected.start_date}. We look forward to hosting you!`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors"
                  >
                    &#128242; Notify guest — payment confirmed
                  </a>
                )}

                {selected.payment_status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-brand">
                    Payment rejected. The guest will be prompted to re-upload their receipt.
                  </div>
                )}
              </section>

              {/* ── Zone B: Guest Requests ──────────────────────── */}
              <section className="space-y-3">
                <p className="text-[10px] font-black text-fog uppercase tracking-widest">Zone B — Guest Requests</p>
                {selected.notes ? (
                  <div className="bg-surface rounded-xl p-4 space-y-2">
                    {selected.notes.split(/\n|,|;/).map(r => r.trim()).filter(Boolean).map((req, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <span className="w-5 h-5 rounded border-2 border-border mt-0.5 shrink-0 flex items-center justify-center text-[10px] text-fog">
                          {stageOf(selected) === 'completed' ? '✓' : ''}
                        </span>
                        <span className="text-ink">{req}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-fog italic">No special requests.</p>
                )}
              </section>

              {/* ── Zone C: Staff Logbook ───────────────────────── */}
              <section className="space-y-3">
                <p className="text-[10px] font-black text-fog uppercase tracking-widest">Zone C — Staff Logbook</p>

                {(selected.staff_log ?? []).length === 0 ? (
                  <p className="text-sm text-fog italic">No log entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {[...(selected.staff_log ?? [])].reverse().map((entry, i) => (
                      <div key={i} className="bg-surface rounded-xl px-4 py-3 space-y-1">
                        <p className="text-[10px] font-semibold text-fog">
                          {new Date(entry.ts).toLocaleString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-sm text-ink">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <textarea
                    value={logInput} onChange={e => setLogInput(e.target.value)}
                    placeholder="Add a handover note, payment update, or staff message…"
                    rows={2} className={`${inputCls} resize-none`}
                  />
                  <button onClick={addLog} disabled={!logInput.trim() || logSaving} className={`${btnSmall} disabled:opacity-50`}>
                    {logSaving ? 'Saving…' : '+ Add to Logbook'}
                  </button>
                </div>
              </section>

              {/* ── Pipeline Actions ────────────────────────────── */}
              <section className="space-y-2 pt-1 border-t border-border">
                <p className="text-[10px] font-black text-fog uppercase tracking-widest pb-1">Move Stage</p>

                {stageOf(selected) === 'pending' && <>
                  <button onClick={() => moveStage(selected.id, 'holding')}
                    className="w-full bg-yellow-400 text-yellow-900 font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity">
                    Approve → Holding (Awaiting Payment)
                  </button>
                  <button onClick={() => moveStage(selected.id, 'cancelled')}
                    className="w-full border border-border text-fog font-semibold rounded-xl py-2.5 text-sm hover:border-brand hover:text-brand transition-colors">
                    Decline Booking
                  </button>
                </>}

                {stageOf(selected) === 'holding' && <>
                  <button onClick={() => moveStage(selected.id, 'cleared')}
                    className="w-full bg-green-500 text-white font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity">
                    Payment Received → Cleared ✓
                  </button>
                  <button onClick={() => moveStage(selected.id, 'cancelled')}
                    className="w-full border border-border text-fog font-semibold rounded-xl py-2.5 text-sm hover:border-brand hover:text-brand transition-colors">
                    Cancel Booking
                  </button>
                </>}

                {stageOf(selected) === 'cleared' && <>
                  <button onClick={() => moveStage(selected.id, 'completed')}
                    className="w-full bg-ink text-white font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity">
                    Guest Checked Out → Completed
                  </button>
                  <button onClick={() => moveStage(selected.id, 'holding')}
                    className="w-full border border-border text-fog font-semibold rounded-xl py-2.5 text-sm hover:border-ink hover:text-ink transition-colors">
                    Move back to Holding
                  </button>
                </>}

                {stageOf(selected) === 'completed' && (
                  <div className="bg-surface rounded-xl p-4 text-center">
                    <p className="text-sm font-semibold text-ink">✓ Archived</p>
                    <p className="text-xs text-fog mt-0.5">This booking is complete.</p>
                  </div>
                )}

                {stageOf(selected) === 'cancelled' && (
                  <div className="bg-surface rounded-xl p-4 text-center">
                    <p className="text-sm font-semibold text-ink">✗ Declined / Cancelled</p>
                    <p className="text-xs text-fog mt-0.5">This booking is no longer active.</p>
                  </div>
                )}
              </section>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Orders Tab ───────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending_whatsapp: { label: 'Via WhatsApp', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  pending:          { label: 'Pending',      bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  accepted:         { label: 'Accepted',     bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  cancelled:        { label: 'Cancelled',    bg: 'bg-surface',   text: 'text-fog',        dot: 'bg-fog'        },
  completed:        { label: 'Completed',    bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const ORDERS_PER_PAGE = 10

// Cap how many rows the dashboard pulls into the browser at once. Vendors very
// rarely scroll past the most recent few hundred; this bounds memory/transfer
// instead of loading an unbounded history on every visit.
const DASHBOARD_FETCH_LIMIT = 300   // order/booking lists (paginated client-side)
const ANALYTICS_FETCH_LIMIT = 2000  // sales aggregate window

// Stable refs for useSyncExternalStore (Bluetooth support is a one-shot read —
// it never changes during a session, so the subscribe is a no-op).
const btNoopSubscribe = () => () => {}
const btServerSnapshot = () => false

// ─── Analytics / Sales ──────────────────────────────────────────
// A normalised sale, so confirmed orders and confirmed bookings can share
// the same revenue + top-seller maths.
interface SaleRecord {
  id: string
  total: number
  paymentStatus: PaymentStatus
  createdAt: string
  lines: { name: string; quantity: number; revenue: number }[]
}

type SalesPeriod = '7d' | '30d' | 'all'

const SALES_PERIODS: { id: SalesPeriod; label: string }[] = [
  { id: '7d',  label: 'This week' },
  { id: '30d', label: 'This month' },
  { id: 'all', label: 'All time' },
]

function AnalyticsTab({ vendor, businessType, supabase }: {
  vendor: Vendor
  businessType: BusinessType
  supabase: ReturnType<typeof createClient>
}) {
  const isBooking = businessType === 'booking'
  const noun      = isBooking ? 'bookings' : 'orders'

  const [records, setRecords] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [period,  setPeriod]  = useState<SalesPeriod>('7d')
  // "Now" is captured when data loads (not read during render) so the stats
  // useMemo below stays a pure, deterministic derivation.
  const [now, setNow] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      if (isBooking) {
        const { data } = await supabase
          .from('bookings')
          .select('id, total_price, payment_status, created_at, service_name')
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false })
          .limit(ANALYTICS_FETCH_LIMIT)
        const rows = (data ?? []) as Booking[]
        setRecords(rows.map((b) => {
          const total = Number(b.total_price ?? 0)
          return {
            id:            b.id,
            total,
            paymentStatus: b.payment_status,
            createdAt:     b.created_at,
            lines:         [{ name: b.service_name, quantity: 1, revenue: total }],
          }
        }))
      } else {
        const { data } = await supabase
          .from('orders')
          .select('id, total_price, payment_status, created_at, items, cart_items')
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false })
          .limit(ANALYTICS_FETCH_LIMIT)
        const rows = (data ?? []) as Order[]
        setRecords(rows.map((o) => {
          const lineItems = ((o.items?.length ? o.items : o.cart_items) ?? []) as OrderLineItem[]
          return {
            id:            o.id,
            total:         Number(o.total_price ?? 0),
            paymentStatus: o.payment_status,
            createdAt:     o.created_at,
            lines:         lineItems.map((li) => ({
              name:    li.name,
              quantity: li.quantity,
              revenue: li.price * li.quantity,
            })),
          }
        }))
      }
      setNow(Date.now())
      setLoading(false)
    }
    load()
  }, [vendor.id, supabase, isBooking])

  const stats = useMemo(() => {
    const cutoff = period === 'all'
      ? 0
      : now - (period === '7d' ? 7 : 30) * 86_400_000
    const inPeriod  = records.filter((r) => new Date(r.createdAt).getTime() >= cutoff)
    const confirmed = inPeriod.filter((r) => r.paymentStatus === 'confirmed')

    const revenue  = confirmed.reduce((s, r) => s + r.total, 0)
    const awaiting = inPeriod
      .filter((r) => r.paymentStatus === 'awaiting' || r.paymentStatus === 'submitted')
      .reduce((s, r) => s + r.total, 0)
    const avg = confirmed.length ? revenue / confirmed.length : 0

    // Top sellers, by confirmed revenue
    const map = new Map<string, { quantity: number; revenue: number }>()
    for (const r of confirmed) {
      for (const l of r.lines) {
        const cur = map.get(l.name) ?? { quantity: 0, revenue: 0 }
        cur.quantity += l.quantity
        cur.revenue  += l.revenue
        map.set(l.name, cur)
      }
    }
    const topSellers = [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return { revenue, awaiting, avg, confirmedCount: confirmed.length, periodCount: inPeriod.length, topSellers }
  }, [records, period, now])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-11 rounded-xl bg-surface animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-2xl bg-surface animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Period toggle */}
      <div className="inline-flex rounded-xl bg-surface p-1 border border-border">
        {SALES_PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] ${
              period === p.id ? 'bg-white text-ink shadow-sm' : 'text-fog hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Revenue"
          value={`RM ${stats.revenue.toFixed(2)}`}
          sub={`${stats.confirmedCount} paid ${noun}`}
          accent
        />
        <StatCard
          label={`Paid ${noun}`}
          value={String(stats.confirmedCount)}
          sub={`of ${stats.periodCount} total`}
        />
        <StatCard
          label="Awaiting payment"
          value={`RM ${stats.awaiting.toFixed(2)}`}
          sub="not yet confirmed"
        />
        <StatCard
          label="Average sale"
          value={`RM ${stats.avg.toFixed(2)}`}
          sub={stats.confirmedCount ? 'per paid order' : 'no sales yet'}
        />
      </div>

      {/* Top sellers */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h3 className="text-sm font-bold text-ink mb-3">Top sellers</h3>
        {stats.topSellers.length === 0 ? (
          <p className="text-sm text-fog">No confirmed sales in this period yet.</p>
        ) : (
          <ol className="space-y-3">
            {stats.topSellers.map((s, i) => (
              <li key={s.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-surface text-fog text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{s.name}</p>
                  <p className="text-xs text-fog">{s.quantity} sold</p>
                </div>
                <span className="text-sm font-bold text-ink tabular-nums shrink-0">
                  RM {s.revenue.toFixed(2)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="text-center text-xs text-fog">
        Revenue counts only {noun} with a confirmed payment.
      </p>
    </div>
  )
}

function StatCard({ label, value, sub, accent }: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-brand/30 bg-brand/5' : 'border-border bg-white'}`}>
      <p className="text-[11px] text-fog font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${accent ? 'text-brand' : 'text-ink'}`}>{value}</p>
      {sub && <p className="text-[11px] text-fog mt-0.5">{sub}</p>}
    </div>
  )
}

function OrdersTab({ vendor, supabase }: {
  vendor: Vendor
  supabase: ReturnType<typeof createClient>
}) {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(1)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })
        .limit(DASHBOARD_FETCH_LIMIT)
      setOrders((data ?? []) as Order[])
      setLoading(false)
    }
    load()

    const channel = supabase.channel(`orders:${vendor.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendor.id}` },
        (payload) => {
          const incoming = payload.new as Order
          setOrders((prev) => [incoming, ...prev])
          setPage(1)
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendor.id}` },
        (payload) => {
          const updated = payload.new as Order
          setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o))
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [vendor.id, supabase])

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o))
    await supabase.from('orders').update({ status }).eq('id', orderId)
  }

  // ── Payment verification (QR-payment flow) ──
  const [receiptBusy,  setReceiptBusy]  = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)

  const viewReceipt = async (orderId: string) => {
    setReceiptBusy(orderId)
    setReceiptError(null)
    const res = await getReceiptSignedUrl(orderId)
    setReceiptBusy(null)
    if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer')
    else setReceiptError(orderId)
  }

  // Confirming payment also takes the order: a still-pending order advances to "accepted".
  const confirmPayment = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId)
    const advance = target?.status === 'pending' || target?.status === 'pending_whatsapp'
    setOrders((prev) => prev.map((o) => o.id === orderId
      ? { ...o, payment_status: 'confirmed', status: advance ? 'accepted' : o.status }
      : o))
    await supabase.from('orders')
      .update({ payment_status: 'confirmed', ...(advance ? { status: 'accepted' } : {}) })
      .eq('id', orderId)
  }

  const rejectPayment = async (orderId: string) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, payment_status: 'rejected' } : o))
    await supabase.from('orders').update({ payment_status: 'rejected' }).eq('id', orderId)
  }

  // ── Bluetooth receipt printing (58mm thermal, Web Bluetooth) ──
  // Feature-detected via useSyncExternalStore so the button renders only where
  // it works (Android/desktop Chrome) and never on iOS, with no hydration
  // mismatch — server snapshot is false, client snapshot reads navigator.
  const btSupported = useSyncExternalStore(btNoopSubscribe, isBluetoothPrintingSupported, btServerSnapshot)
  const printerRef = useRef<PrinterConnection | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [printError, setPrintError] = useState<{ id: string; msg: string } | null>(null)

  const printReceipt = async (order: Order) => {
    setPrintingId(order.id)
    setPrintError(null)
    try {
      // Reconnect only if we have no live connection (a vendor connects once,
      // then reuses the printer for every subsequent receipt that session).
      if (!isConnected(printerRef.current)) {
        printerRef.current = await connectPrinter()
      }
      const conn = printerRef.current
      if (!conn) throw new Error('no-gatt')
      const bytes = buildReceipt({
        shopName:      vendor.name,
        shopPhone:     vendor.phone_number,
        orderId:       order.short_order_id ?? order.id.slice(-6).toUpperCase(),
        dateStr:       new Date(order.created_at).toLocaleString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
        customerName:  order.customer_name,
        customerPhone: order.customer_phone,
        mode:          order.delivery_type === 'delivery' ? 'Delivery' : 'Self Pickup',
        address:       order.delivery_type === 'delivery' ? order.delivery_address : null,
        items:         (order.items ?? []).map((li) => ({ name: li.name, quantity: li.quantity, price: li.price })),
        total:         Number(order.total_price),
        notes:         order.notes,
      })
      await printBytes(conn, bytes)
    } catch (e) {
      printerRef.current = null
      const name = (e as { name?: string })?.name
      const msg  = e instanceof Error ? e.message : ''
      // User dismissed the device chooser — not an error worth surfacing.
      if (name === 'NotFoundError') { setPrintingId(null); return }
      if (msg === 'unsupported') {
        setPrintError({ id: order.id, msg: 'This browser does not support Bluetooth printing. Use Chrome on Android.' })
      } else if (msg === 'no-writable-characteristic' || msg === 'no-gatt') {
        setPrintError({ id: order.id, msg: 'This printer is not compatible with browser printing (Bluetooth Classic only).' })
      } else {
        setPrintError({ id: order.id, msg: 'Could not print. Make sure the printer is on and nearby, then try again.' })
      }
    }
    setPrintingId(null)
  }

  // ── Collapsible cards — all collapsed by default, tap to expand ──
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  // Filter by search query (order ID or customer name)
  const q = search.trim().toLowerCase()
  const filtered = q
    ? orders.filter((o) =>
        (o.short_order_id ?? '').toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        (o.customer_phone ?? '').includes(q)
      )
    : orders

  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ORDERS_PER_PAGE, safePage * ORDERS_PER_PAGE)

  // Reset to page 1 when search changes
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }

  if (loading) return <div className="text-sm text-fog text-center py-16">Loading orders…</div>

  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fog text-sm pointer-events-none">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by order ID or name…"
            className="w-full pl-8 pr-4 py-2.5 border border-border rounded-xl text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-ink bg-white"
          />
          {search && (
            <button onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fog hover:text-ink text-lg leading-none">×</button>
          )}
        </div>

        {/* Live badge + count */}
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-sm text-fog">
            {q ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          </p>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />Live
          </span>
        </div>
      </div>

      {/* ── Empty states ── */}
      {orders.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <p className="text-2xl mb-3">🛎️</p>
          <p className="font-semibold text-ink mb-1">No orders yet</p>
          <p className="text-sm text-fog">Orders placed through your page will appear here in real-time.</p>
        </div>
      )}

      {orders.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <p className="text-fog text-sm">No orders match "<span className="font-semibold text-ink">{search}</span>"</p>
          <button onClick={() => handleSearch('')} className="mt-3 text-sm font-semibold text-brand underline underline-offset-2">Clear search</button>
        </div>
      )}

      {/* ── Order cards (collapsible) ── */}
      {paginated.map((order) => {
        const cfg        = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
        const isDelivery = order.delivery_type === "delivery"
        const firstName  = order.customer_name.split(' ')[0]
        const isOpen     = expandedIds.has(order.id)
        const totalStr   = `RM ${Number(order.total_price).toFixed(2)}`

        // One-tap WhatsApp to tell the customer their payment went through.
        const confirmUrl = order.customer_phone
          ? waUrl(order.customer_phone, `Hi ${firstName}! Your payment for order ${order.short_order_id} (RM ${Number(order.total_price).toFixed(2)}) is confirmed ✅ We are preparing your order now. Thank you!`)
          : null

        return (
          <div key={order.id} className="bg-white rounded-2xl border border-border overflow-hidden">

            {/* ── Collapsed header (always visible, tap to toggle) ── */}
            <button
              onClick={() => toggleExpand(order.id)}
              className="w-full text-left px-5 py-4 flex flex-col gap-2 hover:bg-surface/60 transition-colors active:bg-surface"
            >
              {/* Row 1: order ID + time + status + chevron */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-ink tracking-wider text-sm shrink-0">
                    {order.short_order_id ?? `#${order.id.slice(-6).toUpperCase()}`}
                  </span>
                  <span className="text-xs text-fog shrink-0">{timeAgo(order.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} border-current/20`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                  <span className={`text-fog text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                </div>
              </div>

              {/* Row 2: customer + delivery + total + action indicators */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-sm font-semibold text-ink truncate">{order.customer_name}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    isDelivery ? "bg-blue-50 text-blue-700" : "bg-surface text-fog"
                  }`}>
                    {isDelivery ? "🛵" : "🛍️"} {isDelivery ? "Delivery" : "Pickup"}
                  </span>
                  {order.notes && <span className="text-xs text-fog">📝</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {order.payment_status === "submitted" && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Receipt
                    </span>
                  )}
                  {order.payment_status === "confirmed" && (
                    <span className="text-xs text-green-700 font-semibold">&#x1F4B0; Paid</span>
                  )}
                  <span className="text-sm font-bold text-ink tabular-nums">{totalStr}</span>
                </div>
              </div>
            </button>

            {/* ── Expanded body ── */}
            {isOpen && (
              <div className="border-t border-border">
                <div className="p-5 space-y-4">

                  {/* ── Customer info ── */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-ink">{order.customer_name}</p>
                      {order.customer_phone && (
                        <a href={`tel:${order.customer_phone}`} className="text-xs text-brand underline">
                          📞 {order.customer_phone}
                        </a>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      isDelivery
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-surface text-fog border border-border'
                    }`}>
                      {isDelivery ? '🛵 Delivery' : '🛍️ Self Pickup'}
                    </span>
                  </div>

                  {/* ── Delivery address ── */}
                  {isDelivery && order.delivery_address && (
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <span className="text-sm shrink-0 mt-0.5">📍</span>
                      <div>
                        <p className="text-xs font-semibold text-blue-700 mb-0.5">Delivery address</p>
                        <p className="text-sm text-ink leading-snug">{order.delivery_address}</p>
                      </div>
                    </div>
                  )}

                  {/* ── Items ── */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-surface border-b border-border">
                      <p className="text-xs font-semibold text-fog uppercase tracking-wide">Items ordered</p>
                    </div>
                    <ul className="divide-y divide-surface">
                      {(order.items ?? []).map((li, i) => (
                        <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="text-ink">
                            <span className="font-semibold text-fog mr-1.5">{li.quantity}×</span>
                            {li.name}
                          </span>
                          <span className="tabular-nums text-fog font-medium">RM {(li.price * li.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between items-center px-4 py-2.5 bg-surface border-t border-border">
                      <span className="text-sm font-bold text-ink">Total</span>
                      <span className="font-bold text-ink tabular-nums">{totalStr}</span>
                    </div>
                  </div>

                  {/* ── Notes ── */}
                  {order.notes && (
                    <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
                      <span className="text-sm shrink-0 mt-0.5">📝</span>
                      <div>
                        <p className="text-xs font-semibold text-yellow-700 mb-0.5">Customer notes</p>
                        <p className="text-sm text-ink italic">&ldquo;{order.notes}&rdquo;</p>
                      </div>
                    </div>
                  )}

                  {/* ── Payment receipt: review + confirm/reject ── */}
                  {order.payment_status === 'submitted' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">💳 Payment receipt uploaded</p>
                        {order.payment_submitted_at && (
                          <span className="text-xs text-blue-700 shrink-0">{timeAgo(order.payment_submitted_at)}</span>
                        )}
                      </div>
                      <p className="text-sm text-ink">
                        Check the receipt shows <span className="font-bold">RM {Number(order.total_price).toFixed(2)}</span> in your account before confirming.
                      </p>
                      <button onClick={() => viewReceipt(order.id)} disabled={receiptBusy === order.id}
                        className="w-full border border-blue-300 bg-white text-blue-700 font-semibold rounded-xl py-2.5 text-sm hover:bg-blue-100 transition-colors disabled:opacity-50">
                        {receiptBusy === order.id ? 'Opening…' : '🧾 View receipt'}
                      </button>
                      {receiptError === order.id && (
                        <p className="text-xs text-brand">Couldn&apos;t open the receipt. Please try again.</p>
                      )}
                      <div className="flex items-center gap-3">
                        <button onClick={() => confirmPayment(order.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
                          ✓ Confirm payment
                        </button>
                        <button onClick={() => rejectPayment(order.id)}
                          className="flex-1 border border-red-200 text-brand font-semibold rounded-xl py-2.5 text-sm hover:bg-red-50 transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {order.payment_status === 'confirmed' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">💰</span>
                        <p className="text-sm font-semibold text-green-800">Payment confirmed</p>
                        {order.payment_proof_url && (
                          <button onClick={() => viewReceipt(order.id)} disabled={receiptBusy === order.id}
                            className="ml-auto text-xs font-semibold text-green-700 underline underline-offset-2 disabled:opacity-50">
                            {receiptBusy === order.id ? 'Opening…' : 'View receipt'}
                          </button>
                        )}
                      </div>
                      {confirmUrl && (
                        <a href={confirmUrl} target="_blank" rel="noopener noreferrer"
                          className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 transition-colors">
                          📲 Tell {firstName} it&apos;s confirmed
                        </a>
                      )}
                    </div>
                  )}

                  {order.payment_status === 'rejected' && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                      <span className="text-sm">⚠️</span>
                      <p className="text-sm font-semibold text-brand">Payment rejected — customer asked to retry</p>
                      {order.payment_proof_url && (
                        <button onClick={() => viewReceipt(order.id)} disabled={receiptBusy === order.id}
                          className="ml-auto text-xs font-semibold text-brand underline underline-offset-2 disabled:opacity-50">
                          {receiptBusy === order.id ? 'Opening…' : 'View'}
                        </button>
                      )}
                    </div>
                  )}

                  {order.payment_status === 'awaiting' && order.order_token && (vendor.payment_methods?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                      <span className="text-sm">⏳</span>
                      <p className="text-sm font-medium text-amber-800">Waiting for customer to pay &amp; upload receipt</p>
                    </div>
                  )}

                  {/* ── Print receipt (58mm Bluetooth) ── */}
                  {btSupported && (
                    <div className="space-y-1.5">
                      <button onClick={() => printReceipt(order)} disabled={printingId === order.id}
                        className="w-full border border-border text-ink font-semibold rounded-xl py-2.5 text-sm hover:border-ink transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        🖨️ {printingId === order.id ? 'Printing…' : 'Print receipt'}
                      </button>
                      {printError?.id === order.id && (
                        <p className="text-xs text-brand">{printError.msg}</p>
                      )}
                    </div>
                  )}

                  {/* ── Actions ── */}
                  {(order.status === 'pending' || order.status === 'pending_whatsapp') && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateStatus(order.id, 'accepted')}
                        className="flex-1 bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90 transition-opacity">
                        Accept
                      </button>
                      <button onClick={() => updateStatus(order.id, 'cancelled')}
                        className="flex-1 border border-border text-fog font-semibold rounded-xl py-2.5 text-sm hover:border-ink hover:text-ink transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                  {order.status === 'accepted' && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateStatus(order.id, 'completed')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
                        Mark completed
                      </button>
                      <button onClick={() => updateStatus(order.id, 'cancelled')}
                        className="flex-1 border border-border text-fog font-semibold rounded-xl py-2.5 text-sm hover:border-ink hover:text-ink transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-fog hover:border-ink hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg"
          >‹</button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            // Show first, last, current and neighbours; collapse others to "…"
            const show = p === 1 || p === totalPages || Math.abs(p - safePage) <= 1
            const ellipsisBefore = p === totalPages && safePage < totalPages - 2
            return (
              <span key={p} className="flex items-center gap-1">
                {ellipsisBefore && <span className="text-fog text-sm px-1">…</span>}
                {show && (
                  <button
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                      p === safePage
                        ? 'bg-ink text-white'
                        : 'border border-border text-fog hover:border-ink hover:text-ink'
                    }`}
                  >{p}</button>
                )}
              </span>
            )
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-fog hover:border-ink hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg"
          >›</button>
        </div>
      )}
    </div>
  )
}

// ─── Settings Tab ────────────────────────────────────────────

type PMDraft =
  | { type: 'duitnow'; recipient_name: string; id: string; qr_url?: string; duitnow_payload?: string }
  | { type: 'paynow';  recipient_name: string; id: string; qr_url?: string; duitnow_payload?: string }
  | { type: 'bank';    bank_name: string; account_number: string; account_name: string; qr_url?: string; duitnow_payload?: string }

const emptyDraft = (type: PMDraft['type']): PMDraft => {
  if (type === 'bank') return { type: 'bank', bank_name: '', account_number: '', account_name: '' }
  return { type, recipient_name: '', id: '' }
}

function SettingsTab({ userId, vendor, billing, onSaved, onPatchVendor, supabase }: {
  userId: string
  vendor: Vendor
  billing: { payload: string | null; name: string; qrUrl: string | null }
  onSaved: (v: Vendor) => void
  onPatchVendor: (patch: Partial<Vendor>) => void
  supabase: ReturnType<typeof createClient>
}) {
  const [phone, setPhone]     = useState(vendor.phone_number)
  const [methods, setMethods] = useState<PMDraft[]>((vendor.payment_methods ?? []) as PMDraft[])
  const [saving, setSaving]   = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploadError, setUploadError]   = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const addMethod    = (type: PMDraft['type']) => setMethods((prev) => [...prev, emptyDraft(type)])
  const removeMethod = (i: number) => setMethods((prev) => prev.filter((_, idx) => idx !== i))
  const updateMethod = (i: number, patch: Partial<PMDraft>) =>
    setMethods((prev) => prev.map((m, idx) => idx === i ? { ...m, ...patch } as PMDraft : m))

  const handleQrUpload = async (file: File, idx: number) => {
    if (file.size > 5 * 1024 * 1024) { setUploadError('File too large. Max 5 MB.'); return }
    setUploadingIdx(idx)
    setUploadError(null)
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${userId}/${vendor.id}_${idx}_${Date.now()}.${ext}`

    // Read the QR (so checkout can auto-fill the amount) and upload the image together.
    const [decoded, uploadRes] = await Promise.all([
      decodeQrFromFile(file).catch(() => null),
      supabase.storage.from('payment-qr').upload(path, file, { upsert: true }),
    ])

    const { data, error } = uploadRes
    if (error) {
      setUploadError(`Upload failed: ${error.message}`)
    } else if (data) {
      const { data: urlData } = supabase.storage.from('payment-qr').getPublicUrl(data.path)
      const duitnow_payload = decoded && isDuitNowQr(decoded) ? decoded : undefined
      updateMethod(idx, { qr_url: urlData.publicUrl, duitnow_payload })
    }
    setUploadingIdx(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const { data, error } = await supabase.from('vendors').update({ phone_number: phone.trim(), payment_methods: methods })
      .eq('id', vendor.id).select().single()
    setSaving(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Settings saved!' })
      onSaved(data as Vendor)
    }
  }

  return (
    <div className="space-y-6">
    <SubscriptionCard vendor={vendor} billing={billing} onActivated={onPatchVendor} />
    <form
      onSubmit={handleSave}
      onKeyDown={(e) => {
        const tag = (e.target as HTMLElement).tagName
        if (e.key === 'Enter' && tag !== 'TEXTAREA' && tag !== 'BUTTON') e.preventDefault()
      }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <h2 className="text-base font-semibold text-ink">Contact</h2>
        <Field label="WhatsApp Number" hint="Include country code — customers will contact you here" required>
          <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="60123456789" className={inputCls} />
        </Field>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Payment Methods</h2>
          <p className="text-xs text-fog">Shown to customers after booking</p>
        </div>

        {methods.length === 0 && (
          <p className="text-sm text-fog text-center py-6 border border-dashed border-border rounded-xl">No payment methods added yet.</p>
        )}

        {uploadError && <p className="text-xs text-brand bg-red-50 rounded-xl px-3 py-2">{uploadError}</p>}

        <div className="space-y-4">
          {methods.map((m, i) => (
            <div key={i} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-fog">
                  {m.type === 'duitnow' ? 'DuitNow' : m.type === 'paynow' ? 'PayNow' : 'Bank Transfer'}
                </span>
                <button type="button" onClick={() => removeMethod(i)} className="text-xs font-semibold text-brand underline">Remove</button>
              </div>
              {(m.type === 'duitnow' || m.type === 'paynow') && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Recipient Name" required>
                    <input required value={m.recipient_name} onChange={(e) => updateMethod(i, { recipient_name: e.target.value })} placeholder="Ahmad bin Ali" className={inputCls} />
                  </Field>
                  <Field label={m.type === 'duitnow' ? 'Phone / IC / Reg No.' : 'PayNow ID'} required>
                    <input required value={m.id} onChange={(e) => updateMethod(i, { id: e.target.value })} placeholder={m.type === 'duitnow' ? '0123456789' : 'S1234567A'} className={inputCls} />
                  </Field>
                </div>
              )}
              {m.type === 'bank' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Bank Name" required>
                      <input required value={m.bank_name} onChange={(e) => updateMethod(i, { bank_name: e.target.value })} placeholder="Maybank" className={inputCls} />
                    </Field>
                    <Field label="Account Number" required>
                      <input required value={m.account_number} onChange={(e) => updateMethod(i, { account_number: e.target.value })} placeholder="1234567890" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Account Name" required>
                    <input required value={m.account_name} onChange={(e) => updateMethod(i, { account_name: e.target.value })} placeholder="Ahmad bin Ali" className={inputCls} />
                  </Field>
                </div>
              )}
              <QrUploadField qrUrl={m.qr_url} autoAmount={!!m.duitnow_payload} uploading={uploadingIdx === i} onUpload={(file) => handleQrUpload(file, i)} onRemove={() => updateMethod(i, { qr_url: undefined, duitnow_payload: undefined })} />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {(['duitnow', 'paynow', 'bank'] as PMDraft['type'][]).map((type) => (
            <button key={type} type="button" onClick={() => addMethod(type)}
              className="text-xs font-semibold border border-border rounded-lg px-3 py-1.5 text-ink hover:border-ink transition-colors">
              + {type === 'duitnow' ? 'DuitNow' : type === 'paynow' ? 'PayNow' : 'Bank Transfer'}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className={`text-sm rounded-xl px-4 py-2.5 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-brand'}`}>
          {message.text}
        </p>
      )}

      <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save settings'}</button>
    </form>
    </div>
  )
}

// ─── Room Photo Gallery (multi-upload, up to 5 photos) ───────

function RoomPhotoGallery({ urls, uploading, onUpload, onRemove }: {
  urls: string[]
  uploading: boolean
  onUpload: (file: File) => void
  onRemove: (i: number) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {urls.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group">
            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            <button type="button" onClick={() => onRemove(i)}
              className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-brand text-sm font-bold hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity">
              ×
            </button>
            <span className="absolute bottom-1 left-1 text-[10px] font-bold text-white bg-black/40 rounded px-1">{i + 1}</span>
          </div>
        ))}
        {urls.length < 5 && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-fog hover:border-ink hover:text-ink transition-colors disabled:opacity-50">
            <span className="text-2xl leading-none">{uploading ? '⏳' : '+'}</span>
            <span className="text-[10px] font-semibold">{uploading ? 'Uploading…' : 'Add photo'}</span>
          </button>
        )}
        {urls.length < 5 && !uploading && Array.from({ length: Math.max(0, 4 - urls.length) }).map((_, i) => (
          <div key={`ph-${i}`} className="w-24 h-24 rounded-xl border border-dashed border-border bg-surface" />
        ))}
      </div>
      <p className="text-xs text-fog">{urls.length}/5 photos · First photo is the main listing image</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onUpload(e.target.files[0]); e.target.value = '' }} />
    </div>
  )
}

// ─── Item Image Upload ────────────────────────────────────────

function ItemImageUpload({ imageUrl, uploading, onUpload, onRemove }: {
  imageUrl: string; uploading: boolean; onUpload: (file: File) => void; onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onUpload(e.target.files[0]); e.target.value = '' }} />
      {imageUrl ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border group">
          <img src={imageUrl} alt="Item preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button type="button" onClick={() => fileRef.current?.click()} className="bg-white text-ink text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-surface">Replace</button>
            <button type="button" onClick={onRemove} className="bg-white text-brand text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-surface">Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full border-2 border-dashed border-border rounded-xl py-10 flex flex-col items-center gap-2 text-fog hover:border-ink hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <span className="text-3xl">{uploading ? '⏳' : '📷'}</span>
          <span className="text-xs font-semibold">{uploading ? 'Uploading…' : 'Upload photo'}</span>
          <span className="text-[11px]">PNG, JPG or WEBP</span>
        </button>
      )}
    </div>
  )
}

function LogoUploadField({ logoUrl, uploading, onUpload, onRemove }: {
  logoUrl: string; uploading: boolean; onUpload: (file: File) => void; onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-4">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onUpload(e.target.files[0]); e.target.value = '' }} />
      {logoUrl ? (
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border shrink-0 group">
          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-white text-[10px] font-bold">Change</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-16 h-16 rounded-full border-2 border-dashed border-border flex flex-col items-center justify-center text-fog hover:border-ink hover:text-ink transition-colors disabled:opacity-50 shrink-0">
          <span className="text-xl leading-none">{uploading ? '⏳' : '🏪'}</span>
        </button>
      )}
      <div className="space-y-1">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className={btnSmall}>
          {uploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
        </button>
        {logoUrl && (
          <button type="button" onClick={onRemove}
            className="block text-xs text-brand underline underline-offset-2">Remove</button>
        )}
        <p className="text-xs text-fog">PNG, JPG or WEBP · Max 5 MB</p>
      </div>
    </div>
  )
}

function QrUploadField({ qrUrl, autoAmount, uploading, onUpload, onRemove }: {
  qrUrl?: string; autoAmount?: boolean; uploading: boolean; onUpload: (file: File) => void; onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <p className="text-xs font-semibold text-fog mb-2">QR Code <span className="font-normal">(optional)</span></p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onUpload(e.target.files[0]); e.target.value = '' }} />
      {qrUrl ? (
        <div className="flex items-center gap-4">
          <img src={qrUrl} alt="QR" className="w-20 h-20 object-contain rounded-xl border border-border bg-surface" />
          <div className="space-y-2">
            {autoAmount
              ? <p className="text-xs text-green-700 font-semibold">Uploaded ✓ · Amount fills in automatically when scanned</p>
              : <p className="text-xs text-fog font-semibold">Uploaded ✓ · Customers will type the amount themselves</p>}
            <button type="button" onClick={() => fileRef.current?.click()} className="block text-xs text-ink underline underline-offset-2">Replace</button>
            <button type="button" onClick={onRemove} className="block text-xs text-brand underline underline-offset-2">Remove</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={`${btnSmall} ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {uploading ? 'Uploading…' : '↑ Upload QR'}
          </button>
          <span className="text-xs text-fog">PNG or JPG</span>
        </div>
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────

function SetupPrompt({ onGoToProfile }: { onGoToProfile: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-12 text-center">
      <p className="text-fog text-sm mb-4">Set up your profile first.</p>
      <button onClick={onGoToProfile} className={btnPrimary}>Go to Profile</button>
    </div>
  )
}

function Field({ label, hint, required, children }: {
  label: string; hint?: React.ReactNode; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink mb-1.5">
        {label}{required && <span className="text-brand ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-fog mt-1">{hint}</p>}
    </div>
  )
}

const inputCls   = 'w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition bg-white'
const btnPrimary = 'bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl px-5 py-2.5 text-sm hover:opacity-90 disabled:opacity-60 transition-opacity'
const btnSmall   = 'bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl px-4 py-2 text-xs hover:opacity-90 transition-opacity'
const btnGhost   = 'text-sm font-semibold text-ink underline underline-offset-2 hover:text-fog transition-colors'
