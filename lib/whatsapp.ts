// Build a wa.me deep link with a pre-filled message.
//
// IMPORTANT: the app never sends WhatsApp messages on anyone's behalf. These links
// open the *user's own* WhatsApp, pre-filled, for them to send with one tap. That is
// the WhatsApp-native handoff this product is built around.
//
// Malaysian numbers are normalised to E.164-ish (no leading '+'), which is what wa.me
// expects: "0123456789" -> "60123456789", "+60 12-345 6789" -> "60123456789".
export function waUrl(phone: string, text: string): string {
  const raw = (phone ?? '').replace(/\D/g, '')
  const e164 = raw.startsWith('60') ? raw : raw.startsWith('0') ? '60' + raw.slice(1) : raw
  return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`
}
