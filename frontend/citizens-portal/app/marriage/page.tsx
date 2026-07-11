'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { TermsModal } from '@/components/terms-modal'
import { ChevronRight, CheckCircle2 } from 'lucide-react'

export default function MarriageCertificate() {
  const [step, setStep] = useState<'info' | 'requirements' | 'apply'>('info')
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  const handleAccept = () => {
    setModalOpen(false)
    router.push('/apply?type=marriage&subtype=new')
  }

  return (
    <>
      <Header />
      <main className="flex flex-col min-h-[calc(100vh-80px)]">
        {/* Hero Section */}
        <section className="relative overflow-hidden w-full py-12 md:py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="relative z-10 mx-auto max-w-5xl px-6">
            <div className="grid gap-8 md:grid-cols-2 items-center">
              <div className="rounded-[4px] border border-slate-200 bg-white/95 p-8 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
                <div className="space-y-4">
                  <div>
                    <h1 className="my-3 text-xl font-semibold text-foreground sm:text-xl">
                      Start Your Application
                    </h1>
                    <p className="text-sm font-semibold text-primary/90">
                      Please ensure you have the following information ready before starting the digital submission process.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        title: "Spouses' Personal Information",
                        description:
                          'Full names, dates of birth, and government-issued ID numbers for both parties.',
                      },
                      {
                        title: 'Marriage Details',
                        description:
                          'Date and place of marriage, officiant information, and witness details.',
                      },
                      {
                        title: 'Supporting Documents',
                        description:
                          'Proof of residency, previous marriage records if applicable, and any required declarations.',
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                        <div className="flex gap-4">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-primary">
                            <CheckCircle2 className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">{item.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
                  >
                    Start Application
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
          <div className="absolute inset-0 z-0">
            <Image
              src="/marriage.jpg"
              alt="Marriage"
              fill
              className="object-cover"
              priority
            />
          </div>
        </section>

        <TermsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onAccept={handleAccept}
        />
      </main>
      <Footer />
    </>
  )
}
