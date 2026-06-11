# Odabear — Technical Summary
*Last updated: May 2026*

---

## Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Framework   | Next.js (App Router, Server Actions)            |
| Database    | Supabase (PostgreSQL + Row Level Security)      |
| Auth        | Supabase Auth (magic link, email/password)      |
| Storage     | Supabase Storage (vendor-galleries, item-images, payment-qr) |
| Email       | Resend                                          |
| Deployment  | Vercel                                          |
| Styling     | Tailwind CSS                                    |
| Types       | TypeScript                                      |

---

## Pages & Routes

| Route                    | File                                          | Who sees it         |
|--------------------------|-----------------------------------------------|---------------------|
| `/`                      | `app/page.tsx`                                | Public — landing    |
| `/bazaar`                | `app/bazaar/`                                 | Public — directory  |
| `/login`                 | `app/login/page.tsx`                          | Unauthenticated     |
| `/register`              | `app/register/page.tsx`                       | Unauthenticated     |
| `/welcome`               | `app/welcome/page.tsx`                        | Post email confirm  |
| `/dashboard`             | `app/dashboard/DashboardClient.tsx`           | Authenticated vendor|
| `/[vendor_slug]`         | `app/[vendor_slug]/page.tsx`                  | Public customers    |
| `/admin`                 | `app/admin/AdminClient.tsx`                   | Admin only          |
| `/admin/vendor/[id]`     | `app/admin/vendor/[id]/AdminVendorEditor.tsx` | Admin only          |

---

## Business Types

Every vendor chooses one business type at setup. It controls which tabs, labels, and features appear.

| Type        | Public Page       | Dashboard Tabs                                        |
|-------------|-------------------|-------------------------------------------------------|
| `restaurant`| MenuClient.tsx    | Profile, Menu, Orders, Settings                       |
| `retail`    | MenuClient.tsx    | Profile, Products, Orders, Settings                   |
| `booking`   | BookingClient.tsx | Profile, Rooms & Services, Availability, Bookings, Settings |

---

## Database Tables

### `vendors`
Core vendor record. One per business.

| Column               | Type      | Notes                                      |
|----------------------|-----------|--------------------------------------------|
| id                   | uuid PK   |                                            |
| vendor_number        | integer   | Stable sequential number (#1, #2…)         |
| user_id              | uuid FK   | Links to auth.users — null until claimed   |
| name                 | text      |                                            |
| slug                 | text      | Unique — used as URL path                  |
| phone_number         | text      | Digits only — used for WhatsApp links      |
| business_type        | text      | restaurant / retail / booking              |
| is_active            | boolean   | Controls public visibility                 |
| is_featured          | boolean   | Featured in Bazaar                         |
| subscription_status  | text      | trial / active / expired                   |
| trial_ends_at        | timestamptz|                                           |
| logo_url             | text      | Stored in vendor-galleries bucket          |
| gallery_urls         | text[]    | Up to 5 hero photos                        |
| payment_methods      | jsonb     | Array of DuitNow / PayNow / Bank objects   |
| description          | text      |                                            |
| promo_text           | text      | Booking type does not use this             |
| blocked_dates        | text[]    | Dates unavailable for booking              |
| location_address     | text      | Booking type only — display address        |
| location_lat         | float     | Booking type only — precise pin            |
| location_lng         | float     | Booking type only — precise pin            |

### `categories`
Groups items/rooms under a vendor.

| Column     | Type    |
|------------|---------|
| id         | uuid PK |
| vendor_id  | uuid FK |
| name       | text    |
| sort_order | integer |

### `items`
Menu items, products, or rooms/services.

| Column      | Type    | Notes                                  |
|-------------|---------|----------------------------------------|
| id          | uuid PK |                                        |
| category_id | uuid FK |                                        |
| name        | text    |                                        |
| description | text    |                                        |
| price       | numeric | Per unit / per night                   |
| image_url   | text    | Single image (restaurant/retail)       |
| image_urls  | text[]  | Gallery of photos (booking type)       |
| is_available| boolean |                                        |
| sort_order  | integer |                                        |

### `orders`
Restaurant / retail orders placed via WhatsApp checkout.

| Column         | Type    | Notes                          |
|----------------|---------|--------------------------------|
| id             | uuid PK |                                |
| short_order_id | text    | e.g. ORD-R4MK — shown to vendor/customer |
| vendor_id      | uuid FK |                                |
| customer_name  | text    |                                |
| customer_phone | text    |                                |
| items          | jsonb   | Snapshot of cart at time of order |
| total_price    | numeric | Server-derived — never trusted from client |
| delivery_type  | text    | pickup / delivery              |
| delivery_address| text   |                                |
| status         | text    | pending / accepted / cancelled / completed |
| notes          | text    |                                |

### `bookings`
Reservation requests for booking-type vendors.

| Column           | Type    | Notes                              |
|------------------|---------|------------------------------------|
| id               | uuid PK |                                    |
| short_booking_id | text    | e.g. BKG-R4MK — in WhatsApp + dashboard |
| vendor_id        | uuid FK |                                    |
| customer_name    | text    |                                    |
| customer_phone   | text    |                                    |
| service_name     | text    | Snapshot of room/service name      |
| start_date       | date    |                                    |
| end_date         | date    |                                    |
| status           | text    | pending / confirmed / cancelled    |
| notes            | text    |                                    |

### `vendor_stats` (VIEW)
Used by admin page. Joins vendors + categories + items to produce item_count.
Includes vendor_number for display.

---

## Storage Buckets

| Bucket           | Who can upload          | Public read |
|------------------|-------------------------|-------------|
| vendor-galleries | Authenticated vendor    | Yes         |
| item-images      | Authenticated vendor    | Yes         |
| payment-qr       | Authenticated vendor    | Yes         |

All buckets enforce `split_part(name, '/', 1) = auth.uid()::text` — vendors can only write to their own folder.
File size limit: **5 MB** enforced client-side before upload.

---

## Security Hardening (DEFCON 1–4)

### DEFCON 1 — Critical
- **Price manipulation** — checkout re-derives total server-side; client value never trusted
- **Cron secret in URL** — moved to `Authorization: Bearer` header
- **No HTTP security headers** — added via `vercel.json` (X-Frame-Options, CSP, HSTS, etc.)
- **Sensitive env vars** — `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` marked Sensitive in Vercel

### DEFCON 2 — High
- **RLS bypass on orders** — removed conflicting policy that had `WITH CHECK (true)`
- **No rate limiting** — checkout limited to 3 orders per customer per vendor per 60s

### DEFCON 3 — Medium
- **Phone validation** — digits-only, 8–15 chars, enforced in Settings tab before DB write
- **URL scheme validation** — logo and item image URLs must start with `https://`
- **Admin field whitelist** — `adminUpdateVendor` only allows known safe columns
- **Admin audit trail** — every admin action logs `[admin] action fields by=email` to Vercel Functions log

### DEFCON 4 — Low
- **Open redirect** — auth callback `?next=` validated: must start with `/` but not `//`
- **Upload size limit** — 5 MB guard on all 4 upload handlers

---

## Key Architecture Rules

1. **Never use `adminSupabase` for public-facing writes** — only `createClient()` (user-scoped)
2. **Never trust client-submitted prices** — always re-derive server-side
3. **All API routes authenticate via `Authorization` header**, not query params
4. **All new file uploads must check `file.size <= 5MB`** before calling Supabase
5. **All redirect handlers must validate destination** starts with `/` but not `//`
6. **All admin server actions call `verifyAdmin()` first** and log the action

---

## Environment Variables

| Variable                      | Sensitive | Used In                              |
|-------------------------------|-----------|--------------------------------------|
| NEXT_PUBLIC_SUPABASE_URL      | No        | Client + Server Supabase client      |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | No        | Client + Server Supabase client      |
| SUPABASE_SERVICE_ROLE_KEY     | YES       | adminSupabase (server only)          |
| NEXT_PUBLIC_SITE_URL          | No        | Email redirect base URL              |
| RESEND_API_KEY                | YES       | Email sending (Resend)               |
| CRON_SECRET                   | YES       | expire-trials cron auth header       |
| ADMIN_EMAIL                   | No        | Admin panel access check             |

---

## Wireframes

### 1. Public Landing Page `/`
```
┌─────────────────────────────────────────────────────┐
│  ODABEAR                              [Login] [Start] │
├─────────────────────────────────────────────────────┤
│                                                      │
│         Your shop. Your orders.                      │
│         No middleman.                                │
│                                                      │
│         [Get started free]                           │
│                                                      │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │  Comparison slider: Odabear vs other apps     │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  3 Steps and 5 Minutes                               │
│  1. Register  2. Set up your shop  3. Share link     │
├─────────────────────────────────────────────────────┤
│  Feature comparison cards (30% tax, gallery, etc.)  │
└─────────────────────────────────────────────────────┘
```

### 2. Public Menu Page `/[slug]` — Restaurant / Retail
```
┌─────────────────────────────────────────────────────┐
│  [Logo] Vendor Name              [🛒 Cart (2)]       │
├─────────────────────────────────────────────────────┤
│  ┌──────── Hero Gallery ────────────────────────┐   │
│  │  [Photo 1]  [Photo 2]  [Photo 3]  ●○○        │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Description text                                    │
│  🏷️ Promo banner                                     │
├──────────────────────────┬──────────────────────────┤
│  Category tabs           │  🛒 Cart                 │
│  [Cat A] [Cat B] [Cat C] │  ─────────────────────   │
│                          │  Item A x1   RM 12.00    │
│  ┌─────────────────────┐ │  Item B x2   RM 24.00    │
│  │ [img] Item name     │ │  ─────────────────────   │
│  │       RM 12.00  [+] │ │  Total       RM 36.00    │
│  └─────────────────────┘ │                          │
│  ┌─────────────────────┐ │  Name: ____________      │
│  │ [img] Item name     │ │  Phone: ___________      │
│  │       RM 8.00   [+] │ │  Notes: ___________      │
│  └─────────────────────┘ │                          │
│                          │  [Order via WhatsApp]    │
└──────────────────────────┴──────────────────────────┘
```

### 3. Public Booking Page `/[slug]` — Homestay / Booking
```
┌─────────────────────────────────────────────────────┐
│  [Logo] Property Name              [Book now]        │
├─────────────────────────────────────────────────────┤
│  ┌──────── Hero Gallery ────────────────────────┐   │
│  │  [Photo 1]  [Photo 2]  [Photo 3]  ●○○        │   │
│  └──────────────────────────────────────────────┘   │
├──────────────────────────┬──────────────────────────┤
│  Description             │  ┌─────────────────────┐ │
│                          │  │  Booking Widget      │ │
│  📍 Location             │  │  Service: [select ▼] │ │
│  Address text            │  │  Check-in:  [date]   │ │
│  ┌──── Google Map ─────┐ │  │  Check-out: [date]   │ │
│  │                     │ │  │  ─────────────────── │ │
│  │    [map embed]      │ │  │  3 nights × RM 200   │ │
│  │                     │ │  │  Total: RM 600        │ │
│  └─────────────────────┘ │  │                      │ │
│  [Get Directions ↗]      │  │  Name: ____________  │ │
│                          │  │  Phone: ___________  │ │
│  Rooms & Services        │  │  Notes: ___________  │ │
│  ┌─────────────────────┐ │  │                      │ │
│  │ [img] Room name     │ │  │  [Request via WA]    │ │
│  │ Description         │ │  └─────────────────────┘ │
│  │ RM 200/night        │ │                          │
│  └─────────────────────┘ │                          │
└──────────────────────────┴──────────────────────────┘
```

### 4. Vendor Dashboard `/dashboard`
```
┌─────────────────────────────────────────────────────┐
│  My Shop Name                          [Logout]      │
├─────────────────────────────────────────────────────┤
│  [Profile] [Rooms & Services] [Availability]         │
│  [Bookings] [Settings]                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  PROFILE TAB                                         │
│  ┌──────────────────────────────────────────────┐   │
│  │ Business details                             │   │
│  │ Business Name: [________________]            │   │
│  │ URL Slug:      [________________]            │   │
│  │ Logo:          [○ Upload / Remove]           │   │
│  │ Description:   [                  ]          │   │
│  │                [                  ]          │   │
│  │ Location:      [________________] (booking)  │   │
│  │ Lat: [_______]  Lng: [_______]   (booking)  │   │
│  │                                              │   │
│  │                    [Save changes]            │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │ Property photos                              │   │
│  │ [+] [img1] [img2] [img3]                     │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ROOMS & SERVICES TAB                                │
│  ┌──────────────────────────────────────────────┐   │
│  │ [+ Add service type]                         │   │
│  │ ── Deluxe Room ────────────────────────────  │   │
│  │  [🏡] Room A  RM 200/night  Available  [Edit]│   │
│  │  [🏡] Room B  RM 150/night  Available  [Edit]│   │
│  │ [+ Add room/service]                         │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  BOOKINGS TAB                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ Ahmad Ali  BKG-R4MK          [Pending]       │   │
│  │ 60123456789 · Deluxe Room                    │   │
│  │ 📅 2026-06-01 → 2026-06-04  (3 nights)       │   │
│  │ [Confirm]  [Decline]                         │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  SETTINGS TAB                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ Phone Number: [________________]             │   │
│  │ Payment Methods: [DuitNow] [Bank] [PayNow]   │   │
│  │   QR Code: [Upload image]                    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 5. Admin Panel `/admin`
```
┌─────────────────────────────────────────────────────┐
│  Vendor Management          8 registered  [Logout]   │
├─────────────────────────────────────────────────────┤
│  ▼ Create listing for a customer                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Name: [__________]  Slug: [__________]       │   │
│  │ Type: [Restaurant ▼]  Phone: [__________]    │   │
│  │ Description: [____________________________]  │   │
│  │ ┌── Customer Email (optional) ─────────────┐ │   │
│  │ │ customer@email.com                       │ │   │
│  │ │ Invite email sent automatically          │ │   │
│  │ └──────────────────────────────────────────┘ │   │
│  │ [Create listing]  [Cancel]                   │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  [🔍 Search by #, name, slug or phone…          ]    │
├──────┬──────────────────┬────────┬───────┬──────────┤
│  #   │ VENDOR           │ PLAN   │ ITEMS │ PUBLISHED│
├──────┼──────────────────┼────────┼───────┼──────────┤
│  #1  │ Demo Kopitiam    │ Trial  │  12   │ ● Live   │
│      │ 60123456789      │ 14d    │       │          │
├──────┼──────────────────┼────────┼───────┼──────────┤
│  #2  │ Lumina Furniture │ ★ Sub  │   8   │ ● Live   │
│      │ 60198765432      │        │       │          │
├──────┼──────────────────┼────────┼───────┼──────────┤
│  #3  │ Alpine Loft      │ Trial  │   3   │ ○ Hidden │
│      │ 60111234567      │ ended  │       │          │
└──────┴──────────────────┴────────┴───────┴──────────┘
```

### 6. Admin Vendor Editor `/admin/vendor/[id]`
```
┌─────────────────────────────────────────────────────┐
│  ← Admin   Demo Kopitiam                            │
├─────────────────────────────────────────────────────┤
│  [Profile]  [Menu / Items]                           │
├─────────────────────────────────────────────────────┤
│  PROFILE TAB                                         │
│  Name:     [Demo Kopitiam      ]                     │
│  Slug:     [demo-kopitiam      ]                     │
│  Phone:    [60123456789        ]                     │
│  Active:   [● ON]                                    │
│  Featured: [○ OFF]                                   │
│  Plan:     [active ▼]                                │
│  Trial ends: [2026-07-01       ]                     │
│  Description: [               ]                     │
│  Promo text:  [               ]                     │
│                    [Save changes]                    │
├─────────────────────────────────────────────────────┤
│  MENU TAB                                            │
│  [+ Add category]                                    │
│  ── Mains ──────────────────── [Rename] [Delete]    │
│   Nasi Lemak  RM 8.00  ✓  [Edit] [Delete]           │
│   Mee Goreng  RM 7.00  ✓  [Edit] [Delete]           │
│  [+ Add item]                                        │
└─────────────────────────────────────────────────────┘
```

---

## Features Shipped (Chronological)

| # | Feature / Fix                                    | Commit     |
|---|--------------------------------------------------|------------|
| 1 | Initial full app                                 | 4e883f0    |
| 2 | WhatsApp message includes name + phone           | c995589    |
| 3 | Email confirmation → /welcome redirect           | 2c28957    |
| 4 | Homepage comparison slider + feature cards       | c051107    |
| 5 | Item description textarea (supports Enter)       | 31cb0ce    |
| 6 | Security DEFCON 1 — Zod validation, checkout fix | f286b66    |
| 7 | Security DEFCON 2 — rate limiting                | d4f698a    |
| 8 | Security DEFCON 3 — input validation, audit log  | db42521    |
| 9 | Security DEFCON 4 — open redirect, upload limit  | 21fbcb5    |
|10 | Expand item description textarea                 | 99c224e    |
|11 | Enter key guard on all forms                     | e633359    |
|12 | Fix: phone validation blocking new vendors       | 3d539fe    |
|13 | Fix: UUID error when adding first room           | 2dcc34a    |
|14 | Payment QR — storage RLS policies               | bcec374    |
|15 | Logo upload (replaces URL input)                 | e9e4c91    |
|16 | Room photo carousel — click to navigate          | e30fb60    |
|17 | Location address + Google Maps embed             | a54eda6    |
|18 | Lat/Lng precise location pin                     | 6dfd73d    |
|19 | Admin: create listing for premium customers      | e0b39cc    |
|20 | Booking ref numbers (BKG-XXXX)                   | 6fa10e2    |
|21 | Admin listing numbers + search bar               | 6fa10e2    |
|22 | Fix: vendor_number in vendor_stats view          | 923723e    |
