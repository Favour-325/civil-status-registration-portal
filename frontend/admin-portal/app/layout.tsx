import React from "react"
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Source_Serif_4, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import AmplifyProvider from '@/components/amplify-provider'
import './globals.css'

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: '--font-dm-sans',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({ 
  subsets: ["latin"],
  variable: '--font-source-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CCSRP - Cameroon Civil Status Registration Portal',
  description: 'Apply for and manage civil status certificates including birth, and marriage certificates through our secure government portal.',
  icons: {
    icon: [
      {
        url: '/icon1-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon1-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon1.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon1.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0D9488',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <AmplifyProvider>
          {children}
        </AmplifyProvider>
        <Analytics />
      </body>
    </html>
  )
}
