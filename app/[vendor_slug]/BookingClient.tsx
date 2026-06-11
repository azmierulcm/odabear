'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { createBooking } from '@/app/actions/booking'
import type { Vendor, CategoryWithItems, Item } from '@/types/menu'

interface BookingRecord {
  start_date: string
  end_date: string
  service_name: string
}

interface Props {
  vendor: Vendor
  categories: CategoryWithItems[]
  bookings?: BookingRecord[]  // non-cancelled bookings with service name
}

export default function BookingClient({ vendor, categories, bookings = [] }: Props) {
  const router   = useRouter()
  const services = categories.flatMap((c) => c.items.filter((i) => i.is_available))
  const allItems  = categories.flatMap((c) => c.items)

  const [selectedService, setSelectedService] = useState<Item | null>(null)
  const [previewItem, setPreviewItem] = useState<Item | null>(null)
  const [checkIn,  setCheckIn]   = useState('')
  const [checkOut, setCheckOut]  = useState('')
  const [guestName,  setGuestName]  = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [notes, setNotes]           = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Live blocked_dates — initialised from SSR data, updated via realtime
  const [liveBlockedDates, setLiveBlockedDates] = useState<string[]>(vendor.blocked_dates ?? [])

  useEffect(() => {
    // Subscribe to any UPDATE on this vendor row so that when the vendor
    // blocks/unblocks a date in the dashboard, the customer calendar
    // reflects it immediately without a page refresh.
    const channel = supabase
      .channel(`vendor-availability:${vendor.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vendors', filter: `id=eq.${vendor.id}` },
        (payload) => {
          const updated = payload.new as Partial<Vendor>
          if (Array.isArray(updated.blocked_dates)) {
            setLiveBlockedDates(updated.blocked_dates)
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [vendor.id, supabase])

  // Expand booked date ranges for the currently selected room only.
  // If no room is selected the calendar isn't shown, so this returns [].
  const bookedDatesForService = useMemo(() => {
    if (!selectedService) return []
    const DAY = 86400000
    const dates: string[] = []
    for (const b of bookings) {
      if (b.service_name !== selectedService.name) continue
      const startMs = new Date(b.start_date + 'T00:00:00Z').getTime()
      const endMs   = new Date(b.end_date   + 'T00:00:00Z').getTime()
      for (let ms = startMs; ms <= endMs; ms += DAY) {
        dates.push(new Date(ms).toISOString().split('T')[0])
      }
    }
    return dates
  }, [selectedService, bookings])

  // All unavailable dates = vendor-blocked (all rooms) + room-blocked (this room) + already-booked (this room)
  const unavailableDates = useMemo(
    () => [...liveBlockedDates, ...(selectedService?.blocked_dates ?? []), ...bookedDatesForService],
    [liveBlockedDates, selectedService, bookedDatesForService],
  )

  // When the customer switches room, reset any date selection so stale dates
  // from a different room's availability don't carry over.
  const handleSelectService = (service: Item) => {
    if (service.id !== selectedService?.id) {
      setCheckIn('')
      setCheckOut('')
    }
    setSelectedService(service)
  }

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    // Use UTC midnight to avoid DST shifting the result by ±1 day
    const a = new Date(checkIn  + 'T00:00:00Z').getTime()
    const b = new Date(checkOut + 'T00:00:00Z').getTime()
    return Math.max(0, Math.round((b - a) / 86400000))
  }, [checkIn, checkOut])

  const blockedSet = useMemo(() => new Set(unavailableDates), [unavailableDates])

  const hasConflict = useMemo(() => {
    if (!checkIn || !checkOut || nights <= 0) return false
    const DAY = 86400000
    const startMs = new Date(checkIn  + 'T00:00:00Z').getTime()
    const endMs   = new Date(checkOut + 'T00:00:00Z').getTime()
    for (let ms = startMs; ms < endMs; ms += DAY) {
      if (blockedSet.has(new Date(ms).toISOString().split('T')[0])) return true
    }
    return false
  }, [checkIn, checkOut, nights, blockedSet])

  const total = selectedService ? selectedService.price * nights : 0
  const today = new Date().toISOString().split('T')[0]

  const canRequest = !!selectedService && !!checkIn && !!checkOut && nights > 0 && !!guestName.trim() && !hasConflict

  const handleRequest = async () => {
    if (!canRequest || !selectedService) return
    setSubmitting(true)
    setSubmitError(null)

    const result = await createBooking({
      vendor_id:      vendor.id,
      customer_name:  guestName.trim(),
      customer_phone: guestPhone.trim(),
      service_name:   selectedService.name,
      service_price:  selectedService.price,
      start_date:     checkIn,
      end_date:       checkOut,
      notes:          notes.trim(),
      nights,
      total_price:    total,
    })

    if (!result.success) {
      setSubmitError(result.error ?? 'Could not place your booking. Please try again.')
      setSubmitting(false)
      return
    }

    // Redirect to the payment page
    router.push('/booking/' + result.booking_token)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Mobile header ─────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-border h-14 flex items-center px-4 gap-3">
        {vendor.logo_url
          ? <Image src={vendor.logo_url} alt={vendor.name} width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-border shrink-0" />
          : <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-xs shrink-0">{(vendor.name?.[0] ?? '?').toUpperCase()}</div>
        }
        <p className="font-bold text-ink text-sm flex-1 truncate">{vendor.name}</p>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 bg-brand text-white text-xs font-semibold rounded-full px-3 py-1.5 shrink-0"
        >
          Book now
        </button>
      </header>

      {/* ── Desktop title ──────────────────────────────────── */}
      <div className="hidden lg:block max-w-7xl mx-auto px-8 pt-10 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {vendor.logo_url && (
              <Image src={vendor.logo_url} alt={vendor.name} width={64} height={64} className="w-16 h-16 rounded-full object-cover border border-border shrink-0" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-ink">{vendor.name}</h1>
              <p className="text-sm text-fog mt-0.5">{allItems.length} service{allItems.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero gallery ───────────────────────────────────── */}
      <HeroCarousel gallery={vendor.gallery_urls ?? []} vendorName={vendor.name} />

      {/* ── Main layout ────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-12 lg:items-start">

        {/* Left: description + service listings */}
        <div className="pb-40 lg:pb-16 space-y-8">
          {(vendor.description || vendor.promo_text) && (
            <div className="pb-8 border-b border-border space-y-4">
              {vendor.description && (
                <p className="text-base text-ink leading-relaxed whitespace-pre-line">{vendor.description}</p>
              )}
              {vendor.promo_text && (
                <div className="flex items-start gap-3 bg-brand/5 border border-brand/15 rounded-2xl px-5 py-4">
                  <span className="text-xl shrink-0">🏷️</span>
                  <p className="text-sm font-semibold text-ink">{vendor.promo_text}</p>
                </div>
              )}
            </div>
          )}

          {/* Service categories */}
          {categories.map((cat) => (
            <div key={cat.id}>
              <h2 className="text-xl font-bold text-ink mb-4">{cat.name}</h2>
              <div className="space-y-3">
                {cat.items.map((item) => (
                  <ServiceCard
                    key={item.id}
                    item={item}
                    selected={selectedService?.id === item.id}
                    onSelect={() => {
                      if (!item.is_available) return
                      setPreviewItem(item)
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          {(vendor.location_address || (vendor.location_lat && vendor.location_lng)) && (() => {
            const hasCoords = vendor.location_lat && vendor.location_lng
            const mapQuery  = hasCoords
              ? `${vendor.location_lat},${vendor.location_lng}`
              : encodeURIComponent(vendor.location_address ?? '')
            const directionsQuery = hasCoords
              ? `${vendor.location_lat},${vendor.location_lng}`
              : encodeURIComponent(vendor.location_address ?? '')
            return (
              <div className="pt-2 border-t border-border space-y-3">
                <h2 className="text-base font-semibold text-ink">📍 Location</h2>
                {vendor.location_address && (
                  <p className="text-sm text-fog">{vendor.location_address}</p>
                )}
                <div className="rounded-2xl overflow-hidden border border-border aspect-video w-full">
                  <iframe
                    title="Property location"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                  />
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${directionsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline underline-offset-2"
                >
                  Get Directions ↗
                </a>
              </div>
            )
          })()}
        </div>

        {/* Right: desktop booking widget */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <BookingWidget
              vendor={vendor}
              services={services}
              selectedService={selectedService}
              onSelectService={handleSelectService}
              checkIn={checkIn}
              checkOut={checkOut}
              onCheckIn={setCheckIn}
              onCheckOut={setCheckOut}
              guestName={guestName}
              onGuestName={setGuestName}
              guestPhone={guestPhone}
              onGuestPhone={setGuestPhone}
              notes={notes}
              onNotes={setNotes}
              nights={nights}
              total={total}
              today={today}
              canRequest={canRequest}
              hasConflict={hasConflict}
              unavailableDates={unavailableDates}
              onRequest={handleRequest}
              submitting={submitting}
              submitError={submitError}
            />
          </div>
        </div>
      </div>

      {/* ── Service image preview modal ───────────────────── */}
      {previewItem && (
        <ItemPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onBook={() => {
            handleSelectService(previewItem)
            setPreviewItem(null)
            setDrawerOpen(true)
          }}
        />
      )}

      {/* ── Submission error banner ────────────────────────── */}
      {submitError && (
        <div className="fixed inset-x-0 top-16 z-50 px-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
            <span className="text-xl shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">Could not place your booking</p>
              <p className="text-xs text-fog mt-0.5">{submitError}</p>
            </div>
            <button onClick={() => setSubmitError(null)} className="text-fog hover:text-ink text-lg leading-none shrink-0">×</button>
          </div>
        </div>
      )}

      {/* ── Mobile sticky bar (unmounted while drawer open to avoid compositing conflicts) */}
      {!drawerOpen && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-4 pb-6 pt-2 bg-white border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-full bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-3.5 flex items-center justify-between px-5 hover:opacity-90 transition-opacity"
          >
            <span className="text-base">Request to Book</span>
            {selectedService && nights > 0
              ? <span className="tabular-nums font-bold">RM {total.toFixed(2)}</span>
              : <span className="text-sm opacity-80">Select dates →</span>
            }
          </button>
        </div>
      )}

      {/* ── Mobile booking drawer ──────────────────────────── */}
      {drawerOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => { setDrawerOpen(false) }} />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <h2 className="text-lg font-bold text-ink">Request to Book</h2>
              <button onClick={() => { setDrawerOpen(false) }}
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-fog hover:text-ink text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5">
              <BookingWidget
                vendor={vendor}
                services={services}
                selectedService={selectedService}
                onSelectService={handleSelectService}
                checkIn={checkIn}
                checkOut={checkOut}
                onCheckIn={setCheckIn}
                onCheckOut={setCheckOut}
                guestName={guestName}
                onGuestName={setGuestName}
                guestPhone={guestPhone}
                onGuestPhone={setGuestPhone}
                notes={notes}
                onNotes={setNotes}
                nights={nights}
                total={total}
                today={today}
                canRequest={canRequest}
                hasConflict={hasConflict}
                unavailableDates={unavailableDates}
                onRequest={handleRequest}
                submitting={submitting}
                submitError={submitError}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Service Card ─────────────────────────────────────────────

function ServiceCard({ item, selected, onSelect }: { item: Item; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      disabled={!item.is_available}
      className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
        selected
          ? 'border-brand bg-brand/5'
          : item.is_available
          ? 'border-border hover:border-ink hover:shadow-sm'
          : 'border-border opacity-50 cursor-not-allowed'
      }`}
    >
      {(item.image_urls?.[0] ?? item.image_url) && (
        <div className="relative shrink-0">
          <Image src={item.image_urls?.[0] ?? item.image_url!} alt={item.name} width={80} height={64} className="w-20 h-16 rounded-xl object-cover" />
          {(item.image_urls?.length ?? 0) > 1 && (
            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1 rounded">
              +{item.image_urls!.length}
            </span>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-ink text-sm">{item.name}</p>
          <p className="font-bold text-ink text-sm tabular-nums shrink-0">RM {item.price.toFixed(2)}<span className="font-normal text-fog text-xs">/night</span></p>
        </div>
        {item.description && <p className="text-xs text-fog mt-1 line-clamp-2 whitespace-pre-line">{item.description}</p>}
        {!item.is_available && <p className="text-xs text-brand font-semibold mt-1">Unavailable</p>}
      </div>
      {selected && <span className="text-brand shrink-0 text-lg">✓</span>}
    </button>
  )
}

// ─── Item Preview Modal ───────────────────────────────────────

function ItemPreviewModal({ item, onClose, onBook }: { item: Item; onClose: () => void; onBook: () => void }) {
  const images = [...(item.image_urls ?? []), ...(item.image_url && !item.image_urls?.includes(item.image_url) ? [item.image_url] : [])].filter(Boolean) as string[]
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

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full lg:max-w-lg bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 shrink-0 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white text-lg leading-none"
        >
          ×
        </button>

        {/* Image carousel */}
        {images.length > 0 ? (
          <div
            className="relative w-full aspect-[4/3] overflow-hidden shrink-0 group"
            style={{ touchAction: 'pan-y' }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {images.map((url, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(${(i - activeIdx) * 100}%)`,
                  visibility: i === activeIdx ? 'visible' : 'hidden',
                  pointerEvents: i === activeIdx ? 'auto' : 'none',
                }}
              >
                <Image src={url} alt={item.name} fill sizes="(max-width: 1024px) 100vw, 480px" className="object-cover select-none" draggable={false} />
              </div>
            ))}

            {/* Click zones — left half prev, right half next */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(activeIdx - 1)}
                  className="absolute inset-y-0 left-0 w-1/2 z-10 flex items-center justify-start pl-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Previous photo"
                >
                  <span className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white text-lg leading-none">‹</span>
                </button>
                <button
                  type="button"
                  onClick={() => goTo(activeIdx + 1)}
                  className="absolute inset-y-0 right-0 w-1/2 z-10 flex items-center justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Next photo"
                >
                  <span className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white text-lg leading-none">›</span>
                </button>
              </>
            )}

            {/* Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-all duration-200 pointer-events-auto ${i === activeIdx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`}
                  />
                ))}
              </div>
            )}
            {/* Counter */}
            {images.length > 1 && (
              <div className="absolute top-3 left-3 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full">
                {activeIdx + 1} / {images.length}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center shrink-0">
            <p className="text-7xl font-black text-brand/20 select-none">{item.name[0]?.toUpperCase()}</p>
          </div>
        )}

        {/* Details */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-ink leading-snug">{item.name}</h2>
              <p className="text-xl font-bold text-ink tabular-nums shrink-0">
                RM {item.price.toFixed(2)}
                <span className="text-sm font-normal text-fog">/night</span>
              </p>
            </div>
            {item.description && (
              <p className="mt-2 text-sm text-fog leading-relaxed whitespace-pre-line">{item.description}</p>
            )}
          </div>

          <button
            onClick={onBook}
            className="w-full bg-gradient-to-r from-brand-dark to-brand text-white font-semibold rounded-xl py-3.5 text-base hover:opacity-90 transition-opacity"
          >
            Select &amp; Book →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Booking Widget ───────────────────────────────────────────

interface BookingWidgetProps {
  vendor: Vendor
  services: Item[]
  selectedService: Item | null
  onSelectService: (s: Item) => void
  checkIn: string
  checkOut: string
  onCheckIn: (v: string) => void
  onCheckOut: (v: string) => void
  guestName: string
  onGuestName: (v: string) => void
  guestPhone: string
  onGuestPhone: (v: string) => void
  notes: string
  onNotes: (v: string) => void
  nights: number
  total: number
  today: string
  canRequest: boolean
  hasConflict: boolean
  unavailableDates: string[]
  onRequest: () => void
  submitting: boolean
  submitError: string | null
}

function BookingWidget({
  vendor, services, selectedService, onSelectService,
  checkIn, checkOut, onCheckIn, onCheckOut,
  guestName, onGuestName, guestPhone, onGuestPhone,
  notes, onNotes, nights, total, today, canRequest, hasConflict, unavailableDates, onRequest,
  submitting, submitError,
}: BookingWidgetProps) {

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      {/* Price header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        {selectedService ? (
          <p className="text-ink">
            <span className="text-2xl font-bold">RM {selectedService.price.toFixed(2)}</span>
            <span className="text-fog text-sm"> / night</span>
          </p>
        ) : (
          <p className="text-fog text-sm">Select a service to see pricing</p>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Step 1 — Service selector */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
              Choose a room or service
            </span>
          </label>
          <select
            value={selectedService?.id ?? ''}
            onChange={(e) => {
              const s = services.find((i) => i.id === e.target.value)
              if (s) onSelectService(s)
            }}
            className={inputCls}
          >
            <option value="" disabled>Select a room / service…</option>
            {services.length === 0 && <option value="" disabled>No services available</option>}
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — RM {s.price.toFixed(2)}/night</option>
            ))}
          </select>
        </div>

        {/* Step 2 — Date picker (only shown after a room is selected) */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${selectedService ? 'bg-brand text-white' : 'bg-border text-fog'}`}>2</span>
              Pick your dates
            </span>
          </label>
          {selectedService ? (
            <DateRangePicker
              checkIn={checkIn}
              checkOut={checkOut}
              onCheckIn={onCheckIn}
              onCheckOut={onCheckOut}
              today={today}
              blockedDates={unavailableDates}
            />
          ) : (
            <div className="border-2 border-dashed border-border rounded-xl py-6 px-4 text-center">
              <p className="text-sm text-fog">Select a room above to see available dates</p>
            </div>
          )}
        </div>

        {/* Night count */}
        {nights > 0 && (
          <div className="bg-surface rounded-xl px-4 py-3 flex justify-between text-sm">
            <span className="text-fog">{nights} night{nights !== 1 ? 's' : ''}</span>
            <span className="font-bold text-ink tabular-nums">RM {total.toFixed(2)}</span>
          </div>
        )}

        {/* Guest details */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Your name <span className="text-brand">*</span></label>
            <input type="text" value={guestName} onChange={(e) => onGuestName(e.target.value)}
              placeholder="Your full name" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Phone number</label>
            <input type="tel" value={guestPhone} onChange={(e) => onGuestPhone(e.target.value)}
              placeholder="60123456789 (optional)" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Special requests</label>
            <textarea value={notes} onChange={(e) => onNotes(e.target.value)}
              placeholder="Early check-in, dietary needs, extra beds…" rows={3}
              className={`${inputCls} resize-none`} />
          </div>
        </div>

        {/* CTA */}
        {submitError && (
          <p className="text-xs text-brand bg-red-50 border border-red-200 rounded-xl px-4 py-3">{submitError}</p>
        )}
        <button
          onClick={onRequest}
          disabled={!canRequest || submitting}
          className="w-full bg-gradient-to-r from-brand-dark to-brand disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors hover:opacity-90"
        >
          {submitting ? 'Preparing your booking...' : 'Continue to Payment →'}
        </button>

        <p className="text-center text-xs text-fog">You will complete payment on the next page.</p>
      </div>
    </div>
  )
}

// ─── Hero Carousel (mobile) + Grid (desktop) ──────────────────

function HeroCarousel({ gallery, vendorName }: { gallery: string[]; vendorName: string }) {
  const images = gallery.filter(Boolean)
  const [activeIdx, setActiveIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const goTo = (i: number) => setActiveIdx(Math.max(0, Math.min(i, images.length - 1)))

  // Touch events instead of Pointer + setPointerCapture.
  // setPointerCapture on Android Chrome suppresses click events site-wide
  // until the next paint cycle, making every button on the page unresponsive.
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
      {/* Mobile carousel */}
      <div className="lg:hidden relative aspect-[4/3] overflow-hidden mb-4"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
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

      {/* Desktop grid */}
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

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// ─── Date Range Picker ────────────────────────────────────────

function DateRangePicker({
  checkIn, checkOut, onCheckIn, onCheckOut, today, blockedDates,
}: {
  checkIn: string
  checkOut: string
  onCheckIn: (v: string) => void
  onCheckOut: (v: string) => void
  today: string
  blockedDates: string[]
}) {
  const blocked = useMemo(() => new Set(blockedDates), [blockedDates])

  const [displayMonth, setDisplayMonth] = useState<{ year: number; month: number }>(() => {
    const ref = checkIn || today
    const [y, m] = ref.split('-').map(Number)
    return { year: y, month: m - 1 }
  })

  const { year, month } = displayMonth
  const firstDow    = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const monthLabel  = new Date(Date.UTC(year, month, 1)).toLocaleString('default', { month: 'long', year: 'numeric' })

  const prevMonth = () => setDisplayMonth(({ year: y, month: m }) => ({ year: m === 0 ? y - 1 : y, month: m === 0 ? 11 : m - 1 }))
  const nextMonth = () => setDisplayMonth(({ year: y, month: m }) => ({ year: m === 11 ? y + 1 : y, month: m === 11 ? 0 : m + 1 }))

  // When check-in is set and check-out isn't, find the first blocked date after check-in.
  // Any check-out date at or beyond that point would span a blocked day, so disable it.
  const checkOutCutoff = useMemo(() => {
    if (!checkIn || checkOut) return null
    const DAY = 86400000
    const startMs = new Date(checkIn + 'T00:00:00Z').getTime()
    for (let ms = startMs + DAY; ms <= startMs + 730 * DAY; ms += DAY) {
      const d = new Date(ms).toISOString().split('T')[0]
      if (blocked.has(d)) return d
    }
    return null
  }, [checkIn, checkOut, blocked])

  const handleDay = (dateStr: string) => {
    if (dateStr < today || blocked.has(dateStr)) return
    if (!checkIn || (checkIn && checkOut)) {
      onCheckIn(dateStr); onCheckOut('')
    } else if (dateStr <= checkIn) {
      onCheckIn(dateStr); onCheckOut('')
    } else if (checkOutCutoff && dateStr >= checkOutCutoff) {
      // Would span a blocked date — restart selection from here
      onCheckIn(dateStr); onCheckOut('')
    } else {
      onCheckOut(dateStr)
    }
  }

  const fmt = (d: string) => d ? `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—'
  const selectingCheckout = !!(checkIn && !checkOut)

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-surface border-b border-border">
        <button type="button" onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-border text-fog hover:text-ink transition-colors text-base">‹</button>
        <span className="text-sm font-semibold text-ink">{monthLabel}</span>
        <button type="button" onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-border text-fog hover:text-ink transition-colors text-base">›</button>
      </div>

      <div className="p-2">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-fog py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr   = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isPast    = dateStr < today
            const isBlocked = blocked.has(dateStr)
            const isCutoff  = !!(selectingCheckout && checkOutCutoff && dateStr >= checkOutCutoff)
            const isStart   = dateStr === checkIn
            const isEnd     = dateStr === checkOut
            const inRange   = !!(checkIn && checkOut && dateStr > checkIn && dateStr < checkOut)
            const isToday   = dateStr === today
            const disabled  = isPast || isBlocked || isCutoff

            return (
              <div
                key={day}
                onClick={() => !disabled && handleDay(dateStr)}
                className={[
                  'relative flex items-center justify-center h-9 select-none',
                  // Range highlight (strip behind selected dates)
                  inRange ? 'bg-brand/10' : '',
                  isStart && checkOut ? 'rounded-l-full' : '',
                  isEnd ? 'rounded-r-full' : '',
                  // Unavailable: fill the whole cell with a gray block,
                  // exactly matching how the vendor dashboard shows blocked dates
                  (isBlocked || isCutoff) && !isStart && !isEnd ? 'bg-surface rounded-xl' : '',
                ].join(' ')}
              >
                <div className={[
                  'w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors',
                  isStart || isEnd
                    ? 'bg-brand text-white font-semibold'
                    : isBlocked || isCutoff
                    ? 'text-fog/40 line-through cursor-not-allowed select-none'
                    : isPast
                    ? 'text-fog/30 cursor-not-allowed'
                    : 'text-ink hover:bg-brand/15 cursor-pointer',
                  isToday && !isStart && !isEnd ? 'ring-1 ring-ink/30' : '',
                ].join(' ')}>
                  {day}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-2.5 border-t border-border bg-surface flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-fog shrink-0">
          <span className="w-3 h-3 rounded-sm bg-fog/10 border border-fog/30 inline-block" style={{ textDecoration: 'line-through', fontSize: 8 }} />
          Unavailable
        </span>
        <span className="text-fog text-right">
          {!checkIn ? 'Select check-in date' : !checkOut ? 'Now select check-out' : `${fmt(checkIn)} → ${fmt(checkOut)}`}
        </span>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition bg-white'
