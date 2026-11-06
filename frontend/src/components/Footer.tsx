'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, MapPin, MessageCircle } from 'lucide-react';

export function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-white border-t pt-16 pb-8">
      <div className="container mx-auto px-4 lg:px-12 xl:px-24">
        {/* Responsive Grid: 2 columns on mobile/tablet, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 mb-12">
          {/* Company Info - Span 2 columns on smallest screens for readability */}
          <section className="col-span-2 lg:col-span-1 flex flex-col gap-6">
            <Link href="/" aria-label="AdurysGallery Home">
              <div className="flex items-center">
                {/*
                <h2 className="text-2xl font-bold tracking-tight text-primary">
                  Adurys<span className="text-accent">Gallery</span>
                </h2>
                */}
                <Image
                  src="https://res.cloudinary.com/dy2wrwdwp/image/upload/v1777815207/ad-logo-b_olawip.png"
                  alt="AdurysGallery"
                  width={160}
                  height={48}
                  priority
                  className="h-12 w-auto object-contain"
                />
              </div>
            </Link>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              Experience the future of shopping with AdurysGallery. We bring you the best selection of electronics, fashion, and home products with unbeatable quality and service.
            </p>
            <nav className="flex gap-4" aria-label="Social Media Links">
              <SocialIcon
                href="https://www.facebook.com/share/1DxDFaBN3W/"
                icon={<Facebook className="h-5 w-5" />}
                label="Facebook"
              />
            </nav>
          </section>

          {/* Quick Links - Side by side with Customer Support on mobile */}
          <nav aria-labelledby="footer-quick-links" className="col-span-1">
            <h4 id="footer-quick-links" className="text-lg font-bold mb-6 text-foreground text-left uppercase tracking-wider text-[11px]">Quick Links</h4>
            <ul className="flex flex-col gap-4">
              <FooterLink href="/about" label="About Us" />
              <FooterLink href="/contact" label="Contact Us" />
              <FooterLink href="/favorites" label="Wishlist" />
            </ul>
          </nav>

          {/* Customer Support - Side by side with Quick Links on mobile */}
          <nav aria-labelledby="footer-support" className="col-span-1">
            <h4 id="footer-support" className="text-lg font-bold mb-6 text-foreground text-left uppercase tracking-wider text-[11px]">Customer Support</h4>
            <ul className="flex flex-col gap-4">
              {/* <FooterLink href="/returns" label="Returns & Exchanges" /> */}
              {/* <FooterLink href="/shipping" label="Shipping" /> */}
              <FooterLink href="/privacy" label="Privacy Policy" />
              <FooterLink href="/terms" label="Terms" />
              <FooterLink href="/faq" label="FAQ" />
            </ul>
          </nav>

          {/* Contact Info - Span 2 columns on mobile to ensure address is clear */}
          <section aria-labelledby="footer-contact" className="col-span-2 lg:col-span-1 pt-6 lg:pt-0 border-t border-gray-100 lg:border-none">
            <h4 id="footer-contact" className="text-lg font-bold mb-6 text-foreground text-left uppercase tracking-wider text-[11px]">Contact Info</h4>
            <ul className="flex flex-col gap-6">
              <li className="flex gap-4">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold mb-1">Our Location</span>
                  <address className="not-italic text-sm text-muted-foreground">Baroicha Bazar, Belabo, Narsingdi</address>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold mb-1">WhatsApp</span>
                  <a href="https://wa.me/8801887473720" className="text-sm text-muted-foreground hover:text-primary transition-colors">+880 1887-473720</a>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {year ?? '...'} AdurysGallery. All rights reserved.
          </p>
          <div className="flex gap-4" aria-label="Supported Payment Methods">
            <PaymentIcon src="https://placehold.co/40x25?text=VISA" alt="Visa" />
            <PaymentIcon src="https://placehold.co/40x25?text=MC" alt="MasterCard" />
            <PaymentIcon src="https://placehold.co/40x25?text=PayPal" alt="PayPal" />
            <PaymentIcon src="https://placehold.co/40x25?text=Apple" alt="Apple Pay" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} target="_blank" rel="noreferrer" className="h-9 w-9 bg-muted hover:bg-primary hover:text-white rounded-full flex items-center justify-center transition-all" aria-label={`Follow us on ${label}`}>
      {icon}
    </Link>
  );
}

function FooterLink({ href, label }: { href: string, label: string }) {
  return (
    <li className="text-left">
      <Link href={href} className="text-muted-foreground hover:text-primary transition-all inline-block text-sm font-medium">
        {label}
      </Link>
    </li>
  );
}

function PaymentIcon({ src, alt }: { src: string, alt: string }) {
  return (
    <div className="h-6 w-10 relative overflow-hidden rounded opacity-60 hover:opacity-100 transition-opacity">
      <img src={src} alt={alt} className="object-contain" />
    </div>
  );
}
