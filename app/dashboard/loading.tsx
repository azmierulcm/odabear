// Instant skeleton while the dashboard's server component fetches the vendor,
// categories and items. Mirrors DashboardClient's title + tab bar + content.
export default function DashboardLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-7 w-48 bg-surface rounded-lg mb-6" />

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-border mb-8">
        {[64, 88, 72, 56, 64].map((w, i) => (
          <div key={i} className="h-4 bg-surface rounded-md mb-3" style={{ width: w }} />
        ))}
      </div>

      {/* Content cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-2xl p-5 space-y-3">
            <div className="h-4 w-1/3 bg-surface rounded-md" />
            <div className="h-3 w-full bg-surface rounded-md" />
            <div className="h-3 w-2/3 bg-surface rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
