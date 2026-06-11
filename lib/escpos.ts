// ESC/POS receipt builder for 58mm thermal printers.
//
// 58mm paper has ~384 printable dots. In Font A (12 dots wide) that is exactly
// 32 characters per line — every layout helper below assumes WIDTH = 32.
//
// The output is a flat Uint8Array of ESC/POS commands + text, ready to be
// streamed to a Bluetooth printer characteristic (see lib/btPrinter.ts).

const ESC = 0x1b
const GS  = 0x1d
const LF  = 0x0a
const WIDTH = 32

export interface ReceiptItem {
  name: string
  quantity: number
  price: number
}

export interface ReceiptData {
  shopName: string
  shopPhone?: string | null
  orderId: string
  dateStr: string
  customerName: string
  customerPhone?: string | null
  mode: string            // e.g. "Self Pickup" or "Delivery"
  address?: string | null
  items: ReceiptItem[]
  total: number
  notes?: string | null
}

// Map a JS string to printable bytes. Thermal printers default to an ASCII /
// CP437-ish codepage, so anything outside ASCII is replaced with '?' rather
// than risking garbage output.
function textBytes(s: string): number[] {
  const out: number[] = []
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0x3f
    out.push(code < 128 ? code : 0x3f)
  }
  return out
}

// Wrap `text` to the given width, breaking on spaces where possible.
function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (w.length > width) {
      // A single word longer than the line — hard-split it.
      if (cur) { lines.push(cur); cur = '' }
      let rest = w
      while (rest.length > width) { lines.push(rest.slice(0, width)); rest = rest.slice(width) }
      cur = rest
      continue
    }
    if (!cur) cur = w
    else if (cur.length + 1 + w.length <= width) cur += ' ' + w
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
}

// "Name ............ RM 8.00" — left text wrapped, right value pinned to the
// right edge on the first line.
function twoCol(left: string, right: string): string[] {
  const maxLeft = WIDTH - right.length - 1
  const wrapped = wrap(left, Math.max(1, maxLeft))
  return wrapped.map((l, i) => {
    if (i < wrapped.length - 1) return l
    const pad = WIDTH - l.length - right.length
    return l + ' '.repeat(Math.max(1, pad)) + right
  })
}

export function buildReceipt(data: ReceiptData): Uint8Array {
  const b: number[] = []
  const raw  = (...bytes: number[]) => b.push(...bytes)
  const text = (s: string) => b.push(...textBytes(s))
  const line = (s = '') => { text(s); raw(LF) }
  const rule = () => line('-'.repeat(WIDTH))

  const alignCenter = () => raw(ESC, 0x61, 0x01)
  const alignLeft   = () => raw(ESC, 0x61, 0x00)
  const boldOn      = () => raw(ESC, 0x45, 0x01)
  const boldOff     = () => raw(ESC, 0x45, 0x00)
  const sizeTall    = () => raw(GS, 0x21, 0x01) // double height, normal width
  const sizeNormal  = () => raw(GS, 0x21, 0x00)

  // ── Init ──
  raw(ESC, 0x40) // ESC @  (reset)

  // ── Header ──
  alignCenter()
  boldOn(); sizeTall()
  line(data.shopName)
  sizeNormal(); boldOff()
  if (data.shopPhone) line(data.shopPhone)

  alignLeft()
  rule()

  // ── Order meta ──
  line(`Order : ${data.orderId}`)
  line(data.dateStr)
  line(`Name  : ${data.customerName}`)
  if (data.customerPhone) line(`Phone : ${data.customerPhone}`)
  line(data.mode)
  if (data.address) for (const l of wrap(data.address, WIDTH)) line(l)
  rule()

  // ── Items ──
  for (const it of data.items) {
    const left  = `${it.quantity}x ${it.name}`
    const right = `RM ${(it.price * it.quantity).toFixed(2)}`
    for (const l of twoCol(left, right)) line(l)
  }
  rule()

  // ── Total ──
  boldOn(); sizeTall()
  for (const l of twoCol('TOTAL', `RM ${data.total.toFixed(2)}`)) line(l)
  sizeNormal(); boldOff()
  rule()

  // ── Notes ──
  if (data.notes) {
    line('Notes:')
    for (const l of wrap(data.notes, WIDTH)) line(l)
    rule()
  }

  // ── Footer ──
  alignCenter()
  line('Thank you!')
  line('Powered by Odabear')
  alignLeft()

  // Feed and (optionally) cut.
  raw(LF, LF, LF, LF)
  raw(GS, 0x56, 0x01) // GS V 1 — partial cut (ignored by cutter-less printers)

  return Uint8Array.from(b)
}
