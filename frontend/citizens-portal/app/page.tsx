'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import ContactSection from '@/components/contact-section'
import ApplicationCardGrid from '@/components/application-card-grid'
import ApplicationProcess from '@/components/application-process'
import FAQSection from '@/components/faq'
import { ChevronDown, FileText, Heart, Zap, Shield, Clock, Users } from 'lucide-react'

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <>
      <Header />
      <main className="flex flex-col min-h-[calc(100vh-80px)]">
        {/* Hero Section */}
        <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/cameroon.jpg"
              alt="Government building"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-primary/50 to-primary/40" />
          </div>

          {/* Content */}
          <div className="relative z-10 w-full max-w-5xl px-6 py-20">
            <div className="space-y-8 max-w-2xl">
              <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-secondary-foreground leading-tight">
                Your Life Events,{' '}
                <span className="block leading-tight italic">Officially Recorded.</span>
              </h1>

              <p className="text-lg md:text-xl text-secondary-foreground/90">
                Apply for birth certificates and marriage certificates through our secure digital platform. Simple, transparent, and efficient civil services at your fingertips.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-4 sm:flex-row pt-4">
                <Link
                  href="/birth"
                  className="rounded-md bg-accent px-8 py-3 font-semibold text-accent-foreground hover:bg-accent/90 transition-colors text-center text-base"
                >
                  Apply for Birth Certificate
                </Link >
                <Link href="/marriage" className="rounded-md border-2 border-[#e7c899] px-8 py-3 font-semibold text-[#e7c899] hover:bg-secondary-foreground/10 transition-colors text-center">
                  Apply for Marriage Certificate
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <ApplicationProcess />

        {/* GET STARTED Section */}
        <ApplicationCardGrid />

        {/* FAQ Section */}
        <FAQSection />

        {/* Contact Section */}
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}
