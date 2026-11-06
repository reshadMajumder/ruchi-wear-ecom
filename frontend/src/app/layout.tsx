
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { Toaster } from '@/components/ui/toaster';
import { WhatsAppBubble } from '@/components/WhatsAppBubble';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adurysgallery.com';

export const viewport: Viewport = {
  themeColor: '#005a9c',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'AdurysGallery | Your Ultimate Shopping Destination',
    template: '%s | AdurysGallery'
  },
  description: 'Shop the latest electronics, fashion, and home goods at AdurysGallery. Experience premium quality, fast delivery, and 24/7 support.',
  keywords: ['ecommerce', 'online shopping', 'electronics', 'fashion', 'home goods', 'AdurysGallery'],
  authors: [{ name: 'AdurysGallery Team' }],
  creator: 'AdurysGallery',
  publisher: 'AdurysGallery',
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
    title: 'AdurysGallery | Your Ultimate Shopping Destination',
    description: 'Shop the latest electronics, fashion, and home goods with unbeatable quality and service.',
    url: SITE_URL,
    siteName: 'AdurysGallery',
    images: [
      {
        url: 'https://picsum.photos/seed/seo/1200/630',
        width: 1200,
        height: 630,
        alt: 'AdurysGallery Shopping Experience',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdurysGallery | Your Ultimate Shopping Destination',
    description: 'Shop the latest electronics, fashion, and home goods at AdurysGallery.',
    images: ['https://picsum.photos/seed/seo/1200/630'],
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "AdurysGallery",
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
        <FavoritesProvider>
          <CartProvider>
            {children}
            <Toaster />
            <WhatsAppBubble />
          </CartProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}
