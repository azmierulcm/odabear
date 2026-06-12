// Shared by upload handlers across the dashboard, admin, and receipt flows so
// a replaced/removed *_url can be turned back into a storage path and deleted.
const PUBLIC_MARKER = '/storage/v1/object/public/'

export function storagePath(bucket: string, url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `${PUBLIC_MARKER}${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}
