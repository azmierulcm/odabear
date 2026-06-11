'use client'

const comparisons = [
  {
    left: {
      icon: '😩',
      title: 'The Old Way',
      badge: 'Painful',
      badgeCls: 'text-red-500 bg-red-50',
      borderCls: 'border-red-100',
      content: (
        <div className="bg-[#ECE5DD] rounded-xl p-3 space-y-2 font-[system-ui] text-[12px]">
          {[
            { from: 'customer', text: 'Hye kak, ada ke nasi lemak?' },
            { from: 'vendor',   text: 'Ada! RM8 satu' },
            { from: 'customer', text: 'Nak 2 please, and 1 teh tarik' },
            { from: 'vendor',   text: 'Total RM23, transfer dulu ya' },
            { from: 'customer', text: 'transfer mana?' },
          ].map((b, i) => (
            <div key={i} className={`flex ${b.from === 'vendor' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-2.5 py-1.5 rounded-xl shadow-sm text-gray-800 text-[11px] ${b.from === 'vendor' ? 'bg-[#DCF8C6] rounded-tr-sm' : 'bg-white rounded-tl-sm'}`}>
                {b.text}
              </div>
            </div>
          ))}
          <p className="text-center text-[10px] text-gray-400">… 47 more messages today</p>
        </div>
      ),
      bullets: ['Manually calculating every order', 'Sharing bank details over and over', 'No record of transactions'],
      bulletIcon: '✕',
      bulletCls: 'text-red-400',
    },
    right: {
      icon: '✨',
      title: 'The New Way',
      badge: 'With Odabear',
      badgeCls: 'text-green-700 bg-green-50',
      borderCls: 'border-green-100',
      content: (
        <div className="bg-[#ECE5DD] rounded-xl p-3 font-[system-ui] text-[12px]">
          <div className="bg-white rounded-xl p-3 shadow-sm space-y-1.5 max-w-[90%]">
            <p className="font-bold text-[#128C7E] text-[11px]">New Order — Ahmad Razif</p>
            <p className="text-gray-500 text-[10px]">📞 60123456789</p>
            <div className="border-t border-gray-100 pt-1.5 space-y-0.5 text-[11px]">
              <p>2× Nasi Lemak — RM16.00</p>
              <p>2× Teh Tarik — RM7.00</p>
            </div>
            <div className="border-t border-gray-100 pt-1.5 flex justify-between font-bold text-[11px]">
              <span>Total</span><span>RM23.00</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 ml-1">10:42 AM ✓✓</p>
        </div>
      ),
      bullets: ['Orders arrive itemised & totalled', 'Full order history in dashboard', 'Works on any phone, no app needed'],
      bulletIcon: '✓',
      bulletCls: 'text-green-500',
    },
  },
  {
    left: {
      icon: '😤',
      title: 'The 30% Tax',
      badge: 'Delivery Apps',
      badgeCls: 'text-red-500 bg-red-50',
      borderCls: 'border-red-100',
      content: (
        <div className="bg-red-50 rounded-xl p-3 space-y-2">
          <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider px-0.5">Your October Statement</p>
          <div className="bg-white rounded-lg border border-red-100 overflow-hidden">
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">📦 You sold</span>
                <span className="text-[10px] font-bold text-gray-800">RM 3,000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-red-400">✂️ Commission (30%)</span>
                <span className="text-[10px] font-bold text-red-500">– RM 900</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-red-300">📦 Packaging fee</span>
                <span className="text-[10px] font-bold text-red-400">– RM 80</span>
              </div>
            </div>
            <div className="bg-red-50 border-t border-red-100 px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-700">You take home</span>
              <span className="text-[11px] font-black text-red-600">RM 2,020</span>
            </div>
          </div>
          <p className="text-[9px] text-red-500 font-semibold text-center leading-snug">You cooked everything. They kept RM 980.</p>
        </div>
      ),
      bullets: ['Up to 30% cut per order', 'More sales = more taken from you', 'You work, they earn'],
      bulletIcon: '✕',
      bulletCls: 'text-red-400',
    },
    right: {
      icon: '🤑',
      title: 'Your Full Plate',
      badge: 'With Odabear',
      badgeCls: 'text-green-700 bg-green-50',
      borderCls: 'border-green-100',
      content: (
        <div className="bg-green-50 rounded-xl p-3 space-y-2">
          <p className="text-[9px] font-bold text-green-500 uppercase tracking-wider px-0.5">Your October Statement</p>
          <div className="bg-white rounded-lg border border-green-100 overflow-hidden">
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">📦 You sold</span>
                <span className="text-[10px] font-bold text-gray-800">RM 3,000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">📋 Odabear flat fee</span>
                <span className="text-[10px] font-bold text-gray-500">– RM 150</span>
              </div>
            </div>
            <div className="bg-green-50 border-t border-green-100 px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-700">You take home</span>
              <span className="text-[11px] font-black text-green-600">RM 2,850</span>
            </div>
          </div>
          <div className="bg-green-100 rounded-lg px-3 py-1.5 text-center">
            <p className="text-[9px] font-bold text-green-700">💰 RM 830 more than delivery apps</p>
          </div>
        </div>
      ),
      bullets: ['RM 150 flat, no matter how much you sell', '0% commission always', '100% profit stays with you'],
      bulletIcon: '✓',
      bulletCls: 'text-green-500',
    },
  },
  {
    left: {
      icon: '😵',
      title: 'The Gallery Graveyard',
      badge: 'Painful',
      badgeCls: 'text-red-500 bg-red-50',
      borderCls: 'border-red-100',
      content: (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {/* Phone gallery chrome */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-gray-700/60">
            <span className="text-[9px]">📸</span>
            <span className="text-[9px] text-gray-300 font-semibold">Gallery · 847 items</span>
          </div>
          {/* Photo grid — no gap so it looks like a real phone gallery */}
          <div className="grid grid-cols-3 gap-[1.5px] bg-gray-800">
            {/* 1. Food photo */}
            <div className="aspect-square relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}>
              <div className="absolute inset-0 flex items-center justify-center text-[30px]">🍛</div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-1.5 pb-1 pt-4">
                <p className="text-[7px] font-bold text-white leading-tight">Done bang ✓</p>
                <p className="text-[6px] text-gray-300">Transfer RM23</p>
              </div>
            </div>
            {/* 2. Receipt screenshot */}
            <div className="aspect-square relative overflow-hidden bg-white">
              <div className="p-1.5 space-y-0.5">
                <p className="text-[6px] font-black text-blue-700 tracking-tight">MAYBANK2U</p>
                <div className="border-t border-gray-200 pt-0.5 space-y-0.5">
                  <p className="text-[5px] text-gray-500 font-mono">PEMINDAHAN</p>
                  <p className="text-[5px] text-gray-500 font-mono">BERJAYA</p>
                  <p className="text-[7px] font-black text-gray-800">RM 47.50</p>
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 pb-1 pt-2">
                <p className="text-[7px] font-bold text-white">Resit</p>
                <p className="text-[6px] text-gray-300">Maybank</p>
              </div>
            </div>
            {/* 3. Food photo */}
            <div className="aspect-square relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}>
              <div className="absolute inset-0 flex items-center justify-center text-[30px]">🥘</div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-1.5 pb-1 pt-4">
                <p className="text-[7px] font-bold text-white leading-tight">Bukti</p>
                <p className="text-[6px] text-gray-300">RM47.50</p>
              </div>
            </div>
            {/* 4. Blurry photo */}
            <div className="aspect-square relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#ec4899,#f43f5e)' }}>
              <div className="absolute inset-0 flex items-center justify-center text-[34px]" style={{ filter: 'blur(5px)', transform: 'scale(1.2)' }}>🍱</div>
              <div className="absolute inset-0 bg-white/10" />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 pb-1 pt-2">
                <p className="text-[7px] font-bold text-white">??</p>
                <p className="text-[6px] text-gray-300">blurry 😵</p>
              </div>
            </div>
            {/* 5. Bank notification */}
            <div className="aspect-square relative overflow-hidden bg-[#003087]">
              <div className="p-1.5">
                <p className="text-[6px] font-black text-white/80 tracking-tight">CIMB BANK</p>
                <p className="text-[5px] text-white/60 mt-0.5">Kredit Diterima</p>
                <p className="text-[10px] font-black text-white mt-1">RM15.00</p>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 pb-1 pt-2">
                <p className="text-[7px] font-bold text-white">Transfer</p>
                <p className="text-[6px] text-gray-300">RM15</p>
              </div>
            </div>
            {/* 6. Another receipt */}
            <div className="aspect-square relative overflow-hidden bg-gray-50">
              <div className="p-1.5 space-y-0.5">
                <p className="text-[6px] font-black text-red-600">RHB</p>
                <div className="border-t border-gray-200 pt-0.5 space-y-0.5">
                  <p className="text-[5px] text-gray-500 font-mono">TRANSFER</p>
                  <p className="text-[7px] font-black text-gray-800">RM 29.00</p>
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 pb-1 pt-2">
                <p className="text-[7px] font-bold text-white">Resit lagi</p>
                <p className="text-[6px] text-gray-300">RHB</p>
              </div>
            </div>
          </div>
          <p className="text-[8px] text-gray-500 text-center italic py-1.5 px-2">&ldquo;Which one was from Farah again...?&rdquo;</p>
        </div>
      ),
      bullets: ['Blurry screenshots as receipts', 'No idea who paid or how much', '"Is this your accounting system?"'],
      bulletIcon: '✕',
      bulletCls: 'text-red-400',
    },
    right: {
      icon: '📊',
      title: 'The Odabear Dashboard',
      badge: 'With Odabear',
      badgeCls: 'text-green-700 bg-green-50',
      borderCls: 'border-green-100',
      content: (
        <div className="bg-surface rounded-xl p-2.5 space-y-1.5">
          <p className="text-[9px] text-fog font-semibold px-1 pb-1 border-b border-border">Today&apos;s Orders · 14 total</p>
          {[
            { name: 'Ahmad Razif', items: '2× Nasi Lemak', total: 'RM 16.00', status: 'Paid' },
            { name: 'Siti Norehan', items: '1× Roti Canai, 2× Teh Tarik', total: 'RM 9.00', status: 'Paid' },
            { name: 'Haziq', items: '3× Mee Goreng', total: 'RM 24.00', status: 'New' },
          ].map((o, i) => (
            <div key={i} className="bg-white rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-ink truncate">{o.name}</p>
                <p className="text-[9px] text-fog truncate">{o.items}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold text-ink">{o.total}</p>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${o.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-brand/10 text-brand'}`}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      ),
      bullets: ['Every order tracked automatically', 'Green "Paid" badges, zero confusion', 'Professional tracking. Zero guesswork.'],
      bulletIcon: '✓',
      bulletCls: 'text-green-500',
    },
  },
  {
    left: {
      icon: '😬',
      title: 'The Amateur Look',
      badge: 'High Friction',
      badgeCls: 'text-red-500 bg-red-50',
      borderCls: 'border-red-100',
      content: (
        <div className="bg-white border border-border rounded-xl p-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 shrink-0" />
            <div>
              <p className="font-bold text-ink text-[11px]">@sitikhana_homemade</p>
              <p className="text-[10px] text-fog">Food · Home Business</p>
            </div>
          </div>
          <div className="text-[11px] text-ink space-y-0.5 leading-relaxed">
            <p>🍱 Homemade food, order online!</p>
            <p className="text-fog">DM to order or WhatsApp</p>
            <p className="font-semibold">012-XXXXXXX</p>
          </div>
          <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-center">
            <p className="text-[10px] text-gray-400 italic">No link. Just a phone number.</p>
          </div>
        </div>
      ),
      bullets: ['DM just to see a price', 'Most customers scroll past', 'Looks unserious'],
      bulletIcon: '✕',
      bulletCls: 'text-red-400',
    },
    right: {
      icon: '🔥',
      title: 'The Pro Look',
      badge: 'With Odabear',
      badgeCls: 'text-green-700 bg-green-50',
      borderCls: 'border-green-100',
      content: (
        <div className="bg-ink rounded-xl p-3 flex justify-center">
          <div className="w-32 bg-white rounded-2xl overflow-hidden shadow-xl border-4 border-gray-700">
            <div className="h-14 bg-gradient-to-r from-amber-400 to-orange-400 flex items-end p-1.5">
              <div className="w-7 h-7 rounded-full bg-white border-2 border-white shadow flex items-center justify-center text-base">🍱</div>
            </div>
            <div className="p-2 space-y-1.5">
              <p className="font-bold text-ink text-[10px]">Siti&apos;s Kitchen</p>
              <div className="bg-surface rounded-md p-1.5 space-y-1">
                {[{ e: '🍱', n: 'Nasi Lemak', p: 'RM 8.00' }, { e: '🥘', n: 'Ayam Masak Merah', p: 'RM 12.00' }].map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded bg-amber-100 text-[9px] flex items-center justify-center">{item.e}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-semibold text-ink truncate">{item.n}</p>
                      <p className="text-[7px] text-fog">{item.p}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-brand rounded-md py-1 text-center">
                <p className="text-[8px] font-bold text-white">Order Now →</p>
              </div>
            </div>
          </div>
        </div>
      ),
      bullets: ['Instant storefront link for bio', 'Browse, tap, order — no DMs needed', 'From side-hustle to brand in 5 min'],
      bulletIcon: '✓',
      bulletCls: 'text-green-500',
    },
  },
]

function ComparisonCard({ side }: { side: typeof comparisons[0]['left'] }) {
  return (
    <div className={`bg-white rounded-2xl border-2 ${side.borderCls} p-4 flex flex-col gap-3 w-64 shrink-0`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{side.icon}</span>
        <h3 className="font-bold text-ink text-sm">{side.title}</h3>
        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${side.badgeCls}`}>{side.badge}</span>
      </div>
      <div className="flex-1">{side.content}</div>
      <ul className="space-y-1">
        {side.bullets.map((b) => (
          <li key={b} className="flex items-start gap-1.5 text-xs text-fog">
            <span className={`${side.bulletCls} mt-0.5 shrink-0 text-[10px]`}>{side.bulletIcon}</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ComparisonSlider() {
  const pairs = [...comparisons, ...comparisons]

  return (
    <div className="overflow-hidden">
      <div className="flex gap-4 animate-marquee" style={{ width: 'max-content' }}>
        {pairs.map((pair, i) => (
          <div key={i} className="flex gap-3 items-stretch">
            <ComparisonCard side={pair.left} />
            <div className="flex items-center shrink-0">
              <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center text-sm font-bold text-fog">→</div>
            </div>
            <ComparisonCard side={pair.right} />
          </div>
        ))}
      </div>
    </div>
  )
}
