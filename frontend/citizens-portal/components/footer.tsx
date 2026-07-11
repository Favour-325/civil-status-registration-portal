import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-border bg-[#C1633B]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Grid Layout */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {/* About */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="font-heading font-semibold text-white">Cameroon Civil Status Registry</span>
            </div>
            <p className="text-sm text-[#e7c899]">
              Trusted government portal for civil status registration and certificate management.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 font-semibold text-white">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/birth"
                  className="text-sm text-[#e7c899] hover:text-primary transition-colors"
                >
                  Birth Certificates
                </Link>
              </li>
              <li>
                <Link
                  href="/marriage"
                  className="text-sm text-[#e7c899] hover:text-primary transition-colors"
                >
                  Marriage Certificates
                </Link>
              </li>
              <li>
                <Link
                  href="/apply"
                  className="text-sm text-[#e7c899] hover:text-primary transition-colors"
                >
                  Quick Apply
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 font-semibold text-white">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-[#e7c899] hover:text-primary transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-[#e7c899] hover:text-primary transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-[#e7c899] hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-semibold text-white">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-[#e7c899] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-[#e7c899]">+237 657-545-567</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-[#e7c899] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-[#e7c899]">support@ccsrp.cm</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-[#e7c899] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-[#e7c899]">Bonanjo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row">
          <p className="text-sm text-[#e7c899]">
            © {currentYear} Cameroon Civil Status Registration Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <button className="text-[#e7c899]" aria-label="Visit our social media">
              𝒻
            </button>
            <button className="text-[#e7c899]" aria-label="Follow us on Twitter">
              𝓍
            </button>
            <button className="text-[#e7c899]" aria-label="Connect on LinkedIn">
              in
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
