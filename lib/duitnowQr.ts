// Pure EMVCo / DuitNow QR helpers — no DOM, no dependencies. Runs in the browser
// or on the server.
//
// Turns a vendor's STATIC DuitNow QR into a DYNAMIC one with the order amount baked
// in, so the customer's banking app pre-fills the amount instead of making them type
// it. Verified in the wild against Maybank, CIMB and ShopeePay.
//
// Two hard-won rules from real-device testing:
//   1. Proprietary signature fields (tag >= 65, e.g. tag 82) MUST be removed. Editing
//      the payload makes that signature stale, and apps like Maybank reject the QR
//      unless it's gone.
//   2. Touch 'n Go (and likely other e-wallets) cannot pay a *personal* DuitNow QR at
//      all — they reject even the untouched original. Always offer the static QR +
//      manual amount as a fallback; don't assume the dynamic QR reaches everyone.

export interface TLVField {
  tag: string
  len: number
  val: string
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — the checksum EMVCo stores in tag 63.
export function crc16(input: string): string {
  let crc = 0xffff
  for (let c = 0; c < input.length; c++) {
    crc ^= input.charCodeAt(c) << 8
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Split a top-level EMVCo string into fields. Nested values (e.g. tag 26, 62) are
// left opaque — we never need to crack them open for amount injection.
export function parseTLV(payload: string): TLVField[] {
  const out: TLVField[] = []
  let i = 0
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2)
    i += 2
    const len = parseInt(payload.slice(i, i + 2), 10)
    i += 2
    if (Number.isNaN(len)) break
    out.push({ tag, len, val: payload.slice(i, i + len) })
    i += len
  }
  return out
}

const encodeField = (tag: string, val: string): string =>
  `${tag}${String(val.length).padStart(2, '0')}${val}`

// Serialise fields (any order) and append the trailing "63 04 <CRC>".
export function buildPayload(fields: { tag: string; val: string }[]): string {
  const body = fields.map((f) => encodeField(f.tag, f.val)).join('') + '6304'
  return body + crc16(body)
}

// Recompute the trailing CRC and compare — confirms a payload is well-formed.
export function verifyCRC(payload: string): boolean {
  if (payload.length < 8) return false
  const base = payload.slice(0, -4)
  if (!base.endsWith('6304')) return false
  return payload.slice(-4).toUpperCase() === crc16(base)
}

// Heuristic: is this an upgradeable DuitNow / EMVCo merchant QR? Used at upload time
// to tell the vendor whether customers will get the amount filled in automatically.
export function isDuitNowQr(payload: string): boolean {
  const fields = parseTLV(payload)
  const hasFormat = fields.some((f) => f.tag === '00')
  const hasMerchant = fields.some((f) => Number(f.tag) >= 26 && Number(f.tag) <= 51)
  return hasFormat && hasMerchant && verifyCRC(payload)
}

export interface DynamicQrOptions {
  amount: number
  reference?: string
}

// STATIC payload -> DYNAMIC payload with the amount (and optional reference) injected.
// Strips the old CRC and any proprietary signature fields (tag >= 65) so banking apps
// accept the edit, flips the point-of-initiation flag to dynamic, ensures currency is
// MYR, then re-appends a freshly computed CRC.
export function toDynamicPayload(staticPayload: string, opts: DynamicQrOptions): string {
  const fields: { tag: string; val: string }[] = parseTLV(staticPayload)
    .filter((f) => f.tag !== '63' && Number(f.tag) < 65)
    .map((f) => ({ tag: f.tag, val: f.val }))

  const set = (tag: string, val: string) => {
    const existing = fields.find((f) => f.tag === tag)
    if (existing) existing.val = val
    else fields.push({ tag, val })
  }

  set('01', '12') // point of initiation -> dynamic
  if (!fields.find((f) => f.tag === '53')) set('53', '458') // ensure currency = MYR (458)
  set('54', opts.amount.toFixed(2)) // transaction amount

  if (opts.reference) {
    // Reference label lives in tag 62, sub-field 05. Append rather than clobber any
    // existing additional-data the QR already carried.
    const ref = encodeField('05', opts.reference)
    const f62 = fields.find((f) => f.tag === '62')
    if (f62) f62.val += ref
    else fields.push({ tag: '62', val: ref })
  }

  fields.sort((a, b) => Number(a.tag) - Number(b.tag)) // EMVCo ascending-tag convention
  return buildPayload(fields)
}
