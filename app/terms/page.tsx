import Link from 'next/link'

export const metadata = { title: 'Terms of Service — Odabear' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="font-bold text-xl text-gray-900 tracking-tight">Odabear</Link>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Back to home</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: May 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. About Odabear</h2>
            <p>
              Odabear ("we", "us", "our") is an online platform that helps Malaysian businesses — including
              food & beverage operators, retailers, and homestay owners — create a digital storefront,
              receive orders, and manage bookings via WhatsApp. By accessing or using Odabear, you agree
              to be bound by these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Who Can Use Odabear</h2>
            <p>
              You must be at least 18 years old and legally able to enter into contracts under Malaysian
              law to register as a vendor. By creating an account, you confirm that the information you
              provide is accurate and that you are authorised to operate the business you are registering.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Vendor Accounts</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Each account corresponds to one business. You are responsible for keeping your login credentials secure.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must notify us immediately at <a href="mailto:holaodabear@gmail.com" className="text-red-600 underline">holaodabear@gmail.com</a> if you suspect unauthorised access.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Trial Period & Subscription</h2>
            <p>
              New vendors receive a free trial period to explore the platform. At the end of the trial,
              continued access requires an active subscription. We will notify you before your trial expires.
            </p>
            <p className="mt-2">
              Subscription fees, billing cycles, and cancellation terms are communicated at the time of
              purchase and may be updated with reasonable prior notice. All fees are in Malaysian Ringgit (RM)
              and are non-refundable unless required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Vendor Responsibilities</h2>
            <p>As a vendor, you agree to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Only list products, services, or rooms that you are legally authorised to sell or offer.</li>
              <li>Ensure all pricing, descriptions, and availability information is accurate and up to date.</li>
              <li>Honour orders and bookings that customers submit through your Odabear page.</li>
              <li>Handle all payments directly with your customers. Odabear is not a payment processor and does not handle any transaction funds between vendors and customers.</li>
              <li>Comply with all applicable Malaysian laws, including consumer protection, food safety, and lodging regulations relevant to your business type.</li>
              <li>Not use the platform for any illegal, fraudulent, or misleading activity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Customer Orders & Bookings</h2>
            <p>
              Odabear facilitates the communication of orders and booking requests between customers and
              vendors via WhatsApp. We do not guarantee fulfilment of any order or booking. The contract
              for goods or services is solely between the vendor and their customer. Odabear is not a party
              to that contract and accepts no liability for disputes arising from it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Prohibited Uses</h2>
            <p>You may not use Odabear to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>List prohibited, counterfeit, or illegal goods or services.</li>
              <li>Impersonate another business or individual.</li>
              <li>Scrape, crawl, or extract data from the platform without our written consent.</li>
              <li>Interfere with or disrupt the platform's infrastructure or security.</li>
              <li>Attempt to gain unauthorised access to other users' accounts or data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
            <p>
              You retain ownership of all content you upload to Odabear (photos, descriptions, logos).
              By uploading content, you grant Odabear a non-exclusive, royalty-free licence to display
              that content on your public page and in platform directories (e.g. Bazaar).
            </p>
            <p className="mt-2">
              The Odabear name, logo, and platform design are our intellectual property. You may not
              reproduce or use them without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by Malaysian law, Odabear shall not be liable for any
              indirect, incidental, special, or consequential damages arising from your use of the
              platform, including but not limited to loss of revenue, loss of data, or business interruption.
            </p>
            <p className="mt-2">
              Our total liability to you for any claim arising from these terms or your use of the
              platform shall not exceed the total subscription fees you paid to us in the three months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Termination</h2>
            <p>
              You may cancel your account at any time by contacting us at <a href="mailto:holaodabear@gmail.com" className="text-red-600 underline">holaodabear@gmail.com</a>.
              We may suspend or terminate your account immediately if you breach these terms or if we
              are required to do so by law. Upon termination, your public page will be unpublished and
              your data may be deleted after a reasonable retention period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Changes to These Terms</h2>
            <p>
              We may update these Terms of Service from time to time. We will notify you of material
              changes via email or a notice on your dashboard. Continued use of Odabear after changes
              take effect constitutes your acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Governing Law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of Malaysia.
              Any disputes shall be subject to the exclusive jurisdiction of the Malaysian courts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">13. Contact Us</h2>
            <p>
              For any questions regarding these Terms of Service, please contact us at{' '}
              <a href="mailto:holaodabear@gmail.com" className="text-red-600 underline">holaodabear@gmail.com</a>.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-6">
          <Link href="/terms" className="hover:text-gray-600 transition-colors font-medium text-gray-600">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Odabear. All rights reserved.</p>
      </footer>
    </div>
  )
}
