'use client'

import { useRef } from 'react'

// Multi-upload gallery for booking-type items (rooms/services), up to 5 photos.
// Shared by the vendor dashboard and the admin vendor editor.
export default function RoomPhotoGallery({ urls, uploading, onUpload, onRemove }: {
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
