import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { CurrencyProvider } from '@/contexts/currency-context'
import { ThemeProvider } from '@/components/theme-provider'
import { AiChatButton } from '@/components/ai-chat-button'
import { OfflineSyncProvider } from '@/components/offline-sync-provider'
import './globals.css'

const font = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#10b981' },
    { media: '(prefers-color-scheme: dark)', color: '#059669' },
  ],
}

export const metadata: Metadata = {
  title: 'Life OS - Mobile-First Dashboard',
  description: 'Mobile-first personal finance and life management system',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Life OS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="tap-transparent smooth-scroll">

      <body className={`min-h-screen bg-background font-sans antialiased tracking-tight touch-manipulation safe-bottom ${font.variable}`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <CurrencyProvider>
            <OfflineSyncProvider>
              {children}
              <AiChatButton />
              <Toaster />
              <Analytics />
            </OfflineSyncProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
