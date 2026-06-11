<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Odabear Product Vision

**Goal:** Be the #1 web-based mobile platform for e-commerce and service businesses in Malaysia.

## Non-negotiable rules for every build

### 1. Mobile-first, always
- Design for a 390px screen (iPhone 15 Pro) first. Desktop is a bonus, not the starting point.
- Every new component must be fully usable with one thumb. If it requires precise tapping or tiny text on mobile, it is not done.
- Touch targets must be ≥ 44px tall. No exceptions.
- Test on mobile viewport before considering any feature complete.

### 2. Performance
- No layout shift on load. Use fixed heights or skeleton states for async content.
- Images must have explicit width/height or use `aspect-*` to avoid CLS.
- Prefer server components (RSC) for data fetching — never fetch on the client what can be fetched on the server.

### 3. Clarity over cleverness
- Every UI element must be immediately understandable to a 50-year-old restaurant owner with no tech background.
- Error messages must say what went wrong AND what to do next, in plain Malay-friendly English.
- Avoid jargon (no "slug", "RLS", "UUID" visible to end users).

### 4. WhatsApp-native
- WhatsApp is the primary communication channel. Every order/booking flow must end in a clean, readable WhatsApp message.
- Never break the WhatsApp link format.

### 5. Ship quality, not just speed
- No feature is merged without passing `npx tsc --noEmit`.
- Security rules from TECH_SUMMARY.md (DEFCON 1–4) apply to every new server action and API route.
