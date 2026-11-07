
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from '@/components/ui/toaster';
import { WhatsAppBubble } from '@/components/WhatsAppBubble';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adurysgallery.com';

export const viewport: Viewport = {
  themeColor: '#f6f5f2',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Ruchi Wear | Reflection of Taste',
    template: '%s | Ruchi Wear'
  },
  description: 'Shop clothing at Ruchi Wear. A reflection of taste, with quality pieces, reliable delivery, and support when you need it.',
  keywords: ['Ruchi Wear', 'clothing', 'fashion', 'apparel', 'online shopping', 'reflection of taste'],
  authors: [{ name: 'Ruchi Wear' }],
  creator: 'Ruchi Wear',
  publisher: 'Ruchi Wear',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Ruchi Wear | Reflection of Taste',
    description: 'Shop clothing at Ruchi Wear. Quality pieces, chosen with taste.',
    url: SITE_URL,
    siteName: 'Ruchi Wear',
    images: [
      {
        url: '/brand/og.png',
        width: 1200,
        height: 630,
        alt: 'Ruchi Wear',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ruchi Wear | Reflection of Taste',
    description: 'Shop clothing at Ruchi Wear. Quality pieces, chosen with taste.',
    images: ['/brand/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { Suspense } from 'react';
import AnalyticsTracker from '@/components/AnalyticsTracker';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Ruchi Wear",
              "url": SITE_URL,
              "potentialAction": {
                "@type": "SearchAction",
                "target": `${SITE_URL}/?search={search_term_string}`,
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body className="font-body antialiased min-h-screen bg-background">
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <CartProvider>
          {children}
          <Toaster />
          <WhatsAppBubble />
        </CartProvider>
      </body>
    </html>
  );
}
