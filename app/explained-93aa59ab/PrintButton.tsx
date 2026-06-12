'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden fixed top-4 right-4 z-50 bg-ink text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg hover:opacity-90 transition-opacity"
    >
      Save as PDF
    </button>
  )
}
