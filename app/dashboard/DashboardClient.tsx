'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Vendor, Category, Item, Order, OrderStatus, PaymentMethod, BusinessType, Booking, BookingStatus } from '@/types/menu'

type Tab = 'profile' | 'rooms' | 'main' | 'activity' | 'settings'

interface Props {
  userId: string
  vendor: Vendor | null
  initialCategories: Category[]
  initialItems: Item[]
}

export default function DashboardClient({ userId, vendor: initialVendor, initialCategories, initialItems }: Props) {
  const [vendor, setVendor]         = useState<Vendor | null>(initialVendor)
  const [businessType, setBusinessType] = useState<BusinessType | null>(initialVendor?.business_type ?? null)
  const [tab, setTab]               = useState<Tab>('profile')
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [items, setItems]           = useState<Item[]>(initialItems)

  const supabase = useMemo(() => createClient(), [])

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
        { id: 'profile',  label: 'Profile' },
        { id: 'rooms',    label: 'Rooms & Services' },
        { id: 'main',     label: 'Availability' },
        { id: 'activity', label: 'Bookings' },
        { id: 'settings', label: 'Settings' },
      ]
    : [
        { id: 'profile',  label: 'Profile' },
        { id: 'main',     label: businessType === 'retail' ? 'Products' : 'Menu' },
        { id: 'activity', label: 'Orders' },
        { id: 'settings', label: 'Settings' },
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
        <AvailabilityTab vendor={vendor} onVendorUpdate={setVendor} supabase={supabase} />
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

      {tab === 'settings' && vendor && (
        <SettingsTab userId={userId} vendor={vendor} onSaved={(v) => setVendor(v)} supabase={supabase} />
      )}
      {tab === 'settings' && !vendor && <SetupPrompt onGoToProfile={() => setTab('profile')} />}
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
  const [description, setDescription] = useState(vendor?.description ?? '')
  const [promoText, setPromoText]     = useState(vendor?.promo_text ?? '')
  const [galleryUrls, setGalleryUrls] = useState<string[]>(vendor?.gallery_urls ?? [])
  const [saving, setSaving]           = useState(false)
  const [message, setMessage]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    // Phone: digits only, 8–15 chars (covers Malaysian 60xxxxxxxxx format)
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      setMessage({ type: 'error', text: 'Phone number must be 8–15 digits, e.g. 60123456789.' })
      setSaving(false)
      return
    }

    // Logo URL: https:// only (blocks javascript: and data: URIs)
    if (logoUrl.trim() && !logoUrl.trim().startsWith('https://')) {
      setMessage({ type: 'error', text: 'Logo URL must start with https://' })
      setSaving(false)
      return
    }

    const payload = {
      user_id:       userId,
      name:          name.trim(),
      slug:          slug.trim().toLowerCase().replace(/\s+/g, '-'),
      phone_number:  digitsOnly,
      logo_url:      logoUrl.trim() || null,
      description:   description.trim() || null,
      promo_text:    promoText.trim() || null,
      gallery_urls:  galleryUrls,
      business_type: businessType,
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

      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="text-base font-semibold text-ink mb-5">Business details</h2>
        <form onSubmit={handleSave} className="space-y-4">
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

          <Field label="Logo URL" hint="Paste a direct image URL (optional)">
            <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..." className={inputCls} />
            {logoUrl && (
              <div className="mt-2 w-12 h-12 rounded-full overflow-hidden border border-border">
                <Image src={logoUrl} alt="Logo preview" width={48} height={48} className="object-cover" />
              </div>
            )}
          </Field>

          <Field label="Description" hint="Shown on your public page">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder={descPlaceholder}
              className={`${inputCls} resize-none`} />
          </Field>

          {businessType !== 'booking' && (
            <Field label="Promo / Announcement" hint="Highlighted banner on your page (optional)">
              <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)}
                placeholder={promoPlaceholder} className={inputCls} />
            </Field>
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
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${vendorId}_${Date.now()}.${ext}`
    const { data, error: err } = await supabase.storage.from('vendor-galleries').upload(path, file, { upsert: true })
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
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${vendor.id}_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('item-images').upload(path, file, { upsert: true })
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
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${vendor.id}_room_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('item-images').upload(path, file, { upsert: true })
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
                className={`${inputCls} resize-none`} placeholder="Optional" rows={3} />
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

function AvailabilityTab({ vendor, onVendorUpdate, supabase }: {
  vendor: Vendor
  onVendorUpdate: (v: Vendor) => void
  supabase: ReturnType<typeof createClient>
}) {
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>(vendor.blocked_dates ?? [])
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d
  })
  const [newBlock, setNewBlock] = useState('')
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('bookings').select('*').eq('vendor_id', vendor.id).order('start_date')
      setBookings((data ?? []) as Booking[])
      setLoading(false)
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

  // Build set of booked dates for calendar highlighting
  const bookedDateMap = useMemo(() => {
    const map: Record<string, BookingStatus> = {}
    bookings.filter((b) => b.status !== 'cancelled').forEach((b) => {
      const start = new Date(b.start_date)
      const end   = new Date(b.end_date)
      for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0]
        if (map[key] !== 'confirmed') map[key] = b.status
      }
    })
    return map
  }, [bookings])

  const toggleBlock = async (dateStr: string) => {
    const prev = blockedDates
    const next = blockedDates.includes(dateStr)
      ? blockedDates.filter((d) => d !== dateStr)
      : [...blockedDates, dateStr]
    setBlockedDates(next)
    const { data, error } = await supabase.from('vendors').update({ blocked_dates: next }).eq('id', vendor.id).select().single()
    if (error) { setBlockedDates(prev); return } // rollback on failure
    if (data) onVendorUpdate(data as Vendor)
  }

  const addBlock = async () => {
    if (!newBlock || blockedDates.includes(newBlock)) return
    await toggleBlock(newBlock)
    setNewBlock('')
  }

  const updateBookingStatus = async (id: string, status: BookingStatus) => {
    const snapshot = bookings.find((b) => b.id === id)
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b))
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error && snapshot) setBookings((prev) => prev.map((b) => b.id === id ? snapshot : b))
  }

  // Calendar rendering
  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDow  = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]
  const blockedSet = new Set(blockedDates)

  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const upcomingBookings = bookings.filter((b) => b.end_date >= today && b.status !== 'cancelled')
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  return (
    <div className="space-y-6">
      {/* Calendar card */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">Availability Calendar</h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface text-fog hover:text-ink transition-colors text-lg">‹</button>
            <span className="text-sm font-semibold text-ink w-32 text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface text-fog hover:text-ink transition-colors text-lg">›</button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-fog">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300" />Pending</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand/20 border border-brand/30" />Confirmed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-surface border border-border" />Blocked</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-px">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-fog py-2">{d}</div>
          ))}
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const booked  = bookedDateMap[dateStr]
            const blocked = blockedSet.has(dateStr)
            const isToday = dateStr === today

            let bg = 'hover:bg-surface'
            if (booked === 'confirmed') bg = 'bg-brand/20'
            else if (booked === 'pending') bg = 'bg-yellow-100'
            else if (blocked) bg = 'bg-surface'

            return (
              <button
                key={dateStr}
                onClick={() => !booked && toggleBlock(dateStr)}
                title={booked ? 'Booked' : blocked ? 'Click to unblock' : 'Click to block'}
                className={`relative aspect-square flex items-center justify-center text-xs rounded-lg transition-colors ${bg} ${booked ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className={`${isToday ? 'font-bold text-brand' : blocked && !booked ? 'line-through text-fog' : 'text-ink'}`}>
                  {day}
                </span>
              </button>
            )
          })}
        </div>

        {/* Block a specific date */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-fog mb-2">Block a date (click calendar days, or pick below)</p>
          <div className="flex items-center gap-2">
            <input type="date" value={newBlock} onChange={(e) => setNewBlock(e.target.value)}
              min={today} className={`${inputCls} flex-1`} />
            <button onClick={addBlock} disabled={!newBlock} className={btnSmall}>Block</button>
          </div>
        </div>
      </div>

      {/* Upcoming bookings */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-ink">Upcoming Bookings</h2>
          {upcomingBookings.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />Live
            </span>
          )}
        </div>

        {loading && <p className="text-sm text-fog text-center py-12">Loading…</p>}
        {!loading && upcomingBookings.length === 0 && (
          <p className="text-sm text-fog text-center py-12">No upcoming bookings yet.</p>
        )}

        <ul className="divide-y divide-surface">
          {upcomingBookings.map((b) => {
            const nights = Math.round((new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / 86400000)
            const statusCfg: Record<BookingStatus, { label: string; cls: string }> = {
              pending:   { label: 'Pending',   cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
              confirmed: { label: 'Confirmed', cls: 'bg-green-50  text-green-700  border-green-200'  },
              cancelled: { label: 'Cancelled', cls: 'bg-surface   text-fog        border-border'     },
            }
            const cfg = statusCfg[b.status]
            return (
              <li key={b.id} className="px-6 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink text-sm">{b.customer_name}</p>
                    {b.customer_phone && <p className="text-xs text-fog">{b.customer_phone}</p>}
                    {b.service_name && <p className="text-xs text-fog mt-0.5">Service: {b.service_name}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${cfg.cls}`}>{cfg.label}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-fog">
                  <span>📅 {b.start_date}</span>
                  <span>→</span>
                  <span>{b.end_date}</span>
                  <span className="text-ink font-semibold">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
                {b.notes && <p className="text-xs text-fog italic">"{b.notes}"</p>}
                {b.status === 'pending' && (
                  <div className="flex items-center gap-3 pt-1">
                    <button onClick={() => updateBookingStatus(b.id, 'confirmed')}
                      className="flex-1 bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-2 text-xs hover:opacity-90 transition-opacity">
                      Confirm Booking
                    </button>
                    <button onClick={() => updateBookingStatus(b.id, 'cancelled')}
                      className="flex-1 border border-border text-fog font-semibold rounded-xl py-2 text-xs hover:border-ink hover:text-ink transition-colors">
                      Decline
                    </button>
                  </div>
                )}
                {b.status === 'confirmed' && (
                  <button onClick={() => updateBookingStatus(b.id, 'cancelled')}
                    className="text-xs font-semibold text-fog underline underline-offset-2">
                    Cancel booking
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ─── Bookings Tab (booking vendor orders list) ────────────────

function BookingsTab({ vendor, supabase }: {
  vendor: Vendor
  supabase: ReturnType<typeof createClient>
}) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('bookings').select('*').eq('vendor_id', vendor.id).order('created_at', { ascending: false })
      if (error) { setFetchError(error.message); setLoading(false); return }
      setBookings((data ?? []) as Booking[])
      setLoading(false)
    }
    load()

    const channel = supabase.channel(`bookings-all:${vendor.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `vendor_id=eq.${vendor.id}` },
        (payload) => setBookings((prev) => [payload.new as Booking, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `vendor_id=eq.${vendor.id}` },
        (payload) => setBookings((prev) => prev.map((b) => b.id === (payload.new as Booking).id ? payload.new as Booking : b)))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [vendor.id, supabase])

  const updateStatus = async (id: string, status: BookingStatus) => {
    const snapshot = bookings.find((b) => b.id === id)
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b))
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error && snapshot) {
      // Rollback optimistic update on failure
      setBookings((prev) => prev.map((b) => b.id === id ? snapshot : b))
    }
  }

  if (loading) return <div className="text-sm text-fog text-center py-16">Loading…</div>

  if (fetchError) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-brand mb-1">Could not load bookings</p>
        <p className="text-xs text-fog">{fetchError}</p>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border p-16 text-center">
        <p className="text-2xl mb-3">📅</p>
        <p className="font-semibold text-ink mb-1">No bookings yet</p>
        <p className="text-sm text-fog">Reservation requests will appear here in real-time.</p>
      </div>
    )
  }

  const BOOKING_STATUS: Record<BookingStatus, { label: string; bg: string; text: string }> = {
    pending:   { label: 'Pending',   bg: 'bg-yellow-50', text: 'text-yellow-700' },
    confirmed: { label: 'Confirmed', bg: 'bg-green-50',  text: 'text-green-700'  },
    cancelled: { label: 'Cancelled', bg: 'bg-surface',   text: 'text-fog'        },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fog">{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</p>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />Live
        </span>
      </div>
      {bookings.map((b) => {
        const nights = Math.round((new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / 86400000)
        const cfg = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.pending
        return (
          <div key={b.id} className="bg-white rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-ink">{b.customer_name}</p>
                {b.customer_phone && <p className="text-xs text-fog mt-0.5">{b.customer_phone}</p>}
                {b.service_name && <p className="text-xs text-brand font-semibold mt-0.5">{b.service_name}</p>}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-ink">
              <span>📅 {b.start_date}</span>
              <span className="text-fog">→</span>
              <span>{b.end_date}</span>
              <span className="text-xs text-fog">({nights} night{nights !== 1 ? 's' : ''})</span>
            </div>
            {b.notes && <p className="text-xs text-fog italic">"{b.notes}"</p>}
            <p className="text-xs text-fog">Requested {timeAgo(b.created_at)}</p>
            {b.status === 'pending' && (
              <div className="flex gap-3 pt-1">
                <button onClick={() => updateStatus(b.id, 'confirmed')}
                  className="flex-1 bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90 transition-opacity">
                  Confirm
                </button>
                <button onClick={() => updateStatus(b.id, 'cancelled')}
                  className="flex-1 border border-border text-fog font-semibold rounded-xl py-2.5 text-sm hover:border-ink hover:text-ink transition-colors">
                  Decline
                </button>
              </div>
            )}
            {b.status === 'confirmed' && (
              <button onClick={() => updateStatus(b.id, 'cancelled')}
                className="text-xs font-semibold text-fog underline underline-offset-2">Cancel booking</button>
            )}
          </div>
        )
      })}
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
      setOrders((data ?? []) as Order[])
      setLoading(false)
    }
    load()

    const channel = supabase.channel(`orders:${vendor.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendor.id}` },
        (payload) => { setOrders((prev) => [payload.new as Order, ...prev]); setPage(1) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendor.id}` },
        (payload) => setOrders((prev) => prev.map((o) => o.id === (payload.new as Order).id ? payload.new as Order : o)))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [vendor.id, supabase])

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o))
    await supabase.from('orders').update({ status }).eq('id', orderId)
  }

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

      {/* ── Order cards ── */}
      {paginated.map((order) => {
        const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
        const isDelivery = order.delivery_type === 'delivery'

        return (
          <div key={order.id} className="bg-white rounded-2xl border border-border overflow-hidden">

            {/* ── Top bar: order ID + time + status ── */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-surface border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-ink tracking-wider">
                  {order.short_order_id ?? `#${order.id.slice(-6).toUpperCase()}`}
                </span>
                <span className="text-xs text-fog">{timeAgo(order.created_at)}</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${cfg.bg} ${cfg.text} border-current/20`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>

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

                {/* Delivery type badge */}
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
                  <span className="font-bold text-ink tabular-nums">RM {Number(order.total_price).toFixed(2)}</span>
                </div>
              </div>

              {/* ── Notes ── */}
              {order.notes && (
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
                  <span className="text-sm shrink-0 mt-0.5">📝</span>
                  <div>
                    <p className="text-xs font-semibold text-yellow-700 mb-0.5">Customer notes</p>
                    <p className="text-sm text-ink italic">"{order.notes}"</p>
                  </div>
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
  | { type: 'duitnow'; recipient_name: string; id: string; qr_url?: string }
  | { type: 'paynow';  recipient_name: string; id: string; qr_url?: string }
  | { type: 'bank';    bank_name: string; account_number: string; account_name: string; qr_url?: string }

const emptyDraft = (type: PMDraft['type']): PMDraft => {
  if (type === 'bank') return { type: 'bank', bank_name: '', account_number: '', account_name: '' }
  return { type, recipient_name: '', id: '' }
}

function SettingsTab({ userId, vendor, onSaved, supabase }: {
  userId: string
  vendor: Vendor
  onSaved: (v: Vendor) => void
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
    const { data, error } = await supabase.storage.from('payment-qr').upload(path, file, { upsert: true })
    if (error) {
      setUploadError(`Upload failed: ${error.message}`)
    } else if (data) {
      const { data: urlData } = supabase.storage.from('payment-qr').getPublicUrl(data.path)
      updateMethod(idx, { qr_url: urlData.publicUrl })
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
    <form onSubmit={handleSave} className="space-y-6">
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
              <QrUploadField qrUrl={m.qr_url} uploading={uploadingIdx === i} onUpload={(file) => handleQrUpload(file, i)} onRemove={() => updateMethod(i, { qr_url: undefined })} />
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

function QrUploadField({ qrUrl, uploading, onUpload, onRemove }: {
  qrUrl?: string; uploading: boolean; onUpload: (file: File) => void; onRemove: () => void
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
            <p className="text-xs text-green-700 font-semibold">QR uploaded ✓</p>
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
