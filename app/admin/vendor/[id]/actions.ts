'use server'

import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

// Fields that admin is allowed to update on vendors — prevents accidental writes to user_id etc.
const ALLOWED_VENDOR_FIELDS = new Set([
  'name', 'slug', 'phone_number', 'is_active', 'is_featured',
  'subscription_status', 'trial_ends_at', 'description', 'promo_text',
  'logo_url', 'gallery_urls', 'payment_methods', 'business_type', 'blocked_dates',
])

async function verifyAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) throw new Error('Unauthorized')
  return user.email!
}

export async function adminUpdateVendor(vendorId: string, payload: Record<string, unknown>) {
  const email = await verifyAdmin()
  const safePayload = Object.fromEntries(
    Object.entries(payload).filter(([k]) => ALLOWED_VENDOR_FIELDS.has(k))
  )
  if (Object.keys(safePayload).length === 0) throw new Error('No valid fields to update.')
  console.log(`[admin] updateVendor vendor=${vendorId} fields=${Object.keys(safePayload).join(',')} by=${email}`)
  const { data, error } = await adminSupabase.from('vendors').update(safePayload).eq('id', vendorId).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function adminUploadImage(vendorId: string, formData: FormData): Promise<string> {
  const email = await verifyAdmin()
  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('No file provided.')
  if (file.size > 5 * 1024 * 1024) throw new Error('File too large. Max 5 MB.')

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `admin/${vendorId}_${Date.now()}.${ext}`
  const { data, error } = await adminSupabase.storage.from('vendor-galleries').upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)

  console.log(`[admin] uploadImage vendor=${vendorId} path=${data.path} by=${email}`)
  const { data: urlData } = adminSupabase.storage.from('vendor-galleries').getPublicUrl(data.path)
  return urlData.publicUrl
}

export async function adminAddCategory(vendorId: string, name: string, sortOrder: number) {
  const email = await verifyAdmin()
  console.log(`[admin] addCategory vendor=${vendorId} name="${name}" by=${email}`)
  const { data, error } = await adminSupabase
    .from('categories').insert({ vendor_id: vendorId, name, sort_order: sortOrder }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function adminUpdateCategory(categoryId: string, name: string) {
  const email = await verifyAdmin()
  console.log(`[admin] updateCategory id=${categoryId} name="${name}" by=${email}`)
  const { error } = await adminSupabase.from('categories').update({ name }).eq('id', categoryId)
  if (error) throw new Error(error.message)
}

export async function adminDeleteCategory(categoryId: string) {
  const email = await verifyAdmin()
  console.log(`[admin] deleteCategory id=${categoryId} by=${email}`)
  const { error } = await adminSupabase.from('categories').delete().eq('id', categoryId)
  if (error) throw new Error(error.message)
}

export async function adminUpsertItem(itemId: string | null, payload: Record<string, unknown>) {
  const email = await verifyAdmin()
  console.log(`[admin] upsertItem id=${itemId ?? 'new'} by=${email}`)
  if (itemId) {
    const { data, error } = await adminSupabase.from('items').update(payload).eq('id', itemId).select().single()
    if (error) throw new Error(error.message)
    return data
  } else {
    const { data, error } = await adminSupabase.from('items').insert(payload).select().single()
    if (error) throw new Error(error.message)
    return data
  }
}

export async function adminDeleteItem(itemId: string) {
  const email = await verifyAdmin()
  console.log(`[admin] deleteItem id=${itemId} by=${email}`)
  const { error } = await adminSupabase.from('items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)
}

export async function adminToggleItem(itemId: string, isAvailable: boolean) {
  const email = await verifyAdmin()
  console.log(`[admin] toggleItem id=${itemId} available=${isAvailable} by=${email}`)
  const { error } = await adminSupabase.from('items').update({ is_available: isAvailable }).eq('id', itemId)
  if (error) throw new Error(error.message)
}
