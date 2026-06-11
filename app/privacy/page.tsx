import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Odabear' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="font-bold text-xl text-gray-900 tracking-tight">Odabear</Link>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Back to home</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: May 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Overview</h2>
            <p>
              Odabear ("we", "us", "our") is committed to protecting your personal data in accordance
              with the Personal Data Protection Act 2010 (PDPA) of Malaysia. This Privacy Policy
              explains what data we collect, how we use it, and your rights regarding that data.
            </p>
            <p className="mt-2">
              This policy applies to vendors who register on Odabear and to customers who interact
              with vendor pages hosted on our platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Data We Collect</h2>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">From Vendors</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account data:</strong> email address, password (stored as a secure hash).</li>
              <li><strong>Business profile:</strong> business name, URL slug, phone number, logo, photos, description, payment method details.</li>
              <li><strong>Location data:</strong> address text, latitude and longitude (if provided voluntarily for the map feature).</li>
              <li><strong>Usage data:</strong> login times, dashboard activity, subscription status.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">From Customers</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Order data:</strong> name, phone number, delivery address (if applicable), items ordered, and notes — collected when a customer places an order or booking request.</li>
              <li>We do not collect payment card details. All payments are handled directly between the customer and the vendor.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">Automatically Collected</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Log data:</strong> IP address, browser type, pages visited, and timestamps — collected by our hosting provider (Vercel) for security and performance monitoring.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and operate the Odabear platform and your vendor dashboard.</li>
              <li>To display your public business page to customers.</li>
              <li>To transmit order and booking details to you via your dashboard and WhatsApp.</li>
              <li>To send transactional emails (account verification, password reset, subscription notices) via Resend.</li>
              <li>To detect and prevent fraud, abuse, and security incidents.</li>
              <li>To comply with applicable Malaysian laws and regulations.</li>
            </ul>
            <p className="mt-3">
              We do not sell, rent, or share your personal data with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p>We use the following trusted third-party services to operate the platform:</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Service</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Purpose</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Data shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-medium">Supabase</td>
                    <td className="px-4 py-3">Database & authentication</td>
                    <td className="px-4 py-3">All account and order data</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Vercel</td>
                    <td className="px-4 py-3">Hosting & CDN</td>
                    <td className="px-4 py-3">Access logs, IP addresses</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Resend</td>
                    <td className="px-4 py-3">Transactional email</td>
                    <td className="px-4 py-3">Email address only</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Google Maps</td>
                    <td className="px-4 py-3">Map embed on booking pages</td>
                    <td className="px-4 py-3">Address or coordinates (if set by vendor)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Each of these providers has their own privacy policy governing how they handle data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Storage & Security</h2>
            <p>
              Your data is stored on Supabase's infrastructure, which is hosted in secure data centres.
              We implement the following security measures:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>All data transmitted over HTTPS (TLS encryption in transit).</li>
              <li>Database access controlled by Row Level Security (RLS) — vendors can only access their own data.</li>
              <li>Sensitive API keys stored as encrypted environment variables.</li>
              <li>Admin actions logged with email and timestamp for audit purposes.</li>
            </ul>
            <p className="mt-2">
              While we take reasonable steps to protect your data, no system is completely secure.
              Please use a strong, unique password for your Odabear account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Vendor accounts:</strong> retained for as long as your account is active, plus a reasonable period after closure for legal and audit purposes.</li>
              <li><strong>Order and booking records:</strong> retained for a minimum of 7 years in compliance with Malaysian commercial record-keeping requirements.</li>
              <li><strong>Uploaded files (photos, QR codes):</strong> retained until you delete them from your dashboard or your account is closed.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Your Rights (PDPA)</h2>
            <p>Under the Personal Data Protection Act 2010, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Access</strong> the personal data we hold about you.</li>
              <li><strong>Correct</strong> inaccurate or incomplete data.</li>
              <li><strong>Withdraw consent</strong> for processing where consent is the basis (note: this may affect your ability to use the platform).</li>
              <li><strong>Request deletion</strong> of your account and associated data, subject to our legal retention obligations.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:holaodabear@gmail.com" className="text-red-600 underline">holaodabear@gmail.com</a>.
              We will respond within 21 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>
              Odabear uses session cookies to keep you logged in to your dashboard. We do not use
              tracking cookies or advertising cookies. No third-party analytics scripts are loaded
              on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
            <p>
              Odabear is not directed at children under the age of 18. We do not knowingly collect
              personal data from minors. If you believe a minor has provided us with their data,
              please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes via email or a notice on your dashboard. The date at the top of this page
              reflects the most recent update.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p>
              For any privacy-related questions, requests, or concerns, please contact our data
              protection contact at:{' '}
              <a href="mailto:holaodabear@gmail.com" className="text-red-600 underline">holaodabear@gmail.com</a>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-6">
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-600 transition-colors font-medium text-gray-600">Privacy</Link>
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Odabear. All rights reserved.</p>
      </footer>
    </div>
  )
}
