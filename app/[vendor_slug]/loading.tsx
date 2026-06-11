// Instant skeleton while the server fetches the storefront (vendor + menu).
// Mirrors MenuClient's structure so the swap to real content is seamless.
export default function StorefrontLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-border h-14 flex items-center px-4 gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-surface shrink-0" />
        <div className="h-4 w-32 bg-surface rounded-md" />
      </div>

      {/* Hero gallery */}
      <div className="lg:hidden aspect-[4/3] bg-surface animate-pulse mb-4" />
      <div className="hidden lg:block max-w-7xl mx-auto px-8 pt-10">
        <div className="h-[460px] rounded-2xl bg-surface animate-pulse" />
      </div>

      {/* Menu items */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-pulse">
        <div className="h-6 w-40 bg-surface rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-surface rounded-md" />
              <div className="h-3 w-full bg-surface rounded-md" />
              <div className="h-4 w-20 bg-surface rounded-md" />
            </div>
            <div className="w-24 h-24 bg-surface rounded-xl shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
