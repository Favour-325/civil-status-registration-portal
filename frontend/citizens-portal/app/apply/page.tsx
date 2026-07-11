'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ApplicationWizard } from '@/components/application-wizard'
import { AuthGuard } from '@/components/auth-guard'

function ApplyContent() {
  const searchParams = useSearchParams()
  const type = (searchParams?.get('type') || 'birth') as 'birth' | 'marriage'
  const subtype = (searchParams?.get('subtype') || 'new') as 'new' | 'copy'

  return (
    <>
      <Header />
      <main className="flex flex-col min-h-[calc(100vh-80px)]">
        <div className="flex-1 w-full py-8 bg-secondary">
          <div className="mx-auto max-w-2xl">
            <ApplicationWizard type={type} subtype={subtype} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function ApplyPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <>
            <Header />
            <main className="flex flex-col min-h-[calc(100vh-80px)] items-center justify-center">
              <p className="text-muted-foreground">Loading application...</p>
            </main>
            <Footer />
          </>
        }
      >
        <ApplyContent />
      </Suspense>
    </AuthGuard>
  )
}
