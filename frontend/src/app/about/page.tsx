'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';
import { Target, Eye, ShieldCheck, Award, Zap, HeartHandshake, Sparkles, ArrowRight, BadgeCheck, Globe2, Truck, Users2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5f7fb_40%,_#eef2f7_100%)]">
      <Header />
      <main className="flex-grow pb-20">
        <section className="relative overflow-hidden border-b border-white/60 bg-white/70 backdrop-blur-sm">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 right-[-4rem] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-28 left-[-6rem] h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />
          </div>
          <div className="container mx-auto px-4 py-16 md:py-24 max-w-6xl relative z-10">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-primary shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                About AdurysGallery
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-gray-950 leading-[0.95] tracking-tight">
                A cleaner way to shop,
                <span className="block text-primary">built around trust.</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl">
                AdurysGallery curates products with a focus on quality, accessibility, and dependable service.
                We keep the experience simple, the selection intentional, and the support easy to reach.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">
                  Contact us
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/privacy" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-800 transition-colors hover:border-primary hover:text-primary">
                  Read policies
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-12">
              <StatCard icon={<Globe2 className="h-5 w-5" />} title="Curated selection" text="Focused product ranges instead of clutter." />
              <StatCard icon={<BadgeCheck className="h-5 w-5" />} title="Quality-led" text="We prioritize reliable products and clear value." />
              <StatCard icon={<Truck className="h-5 w-5" />} title="Support ready" text="Fast help through WhatsApp when you need it." />
              <StatCard icon={<Users2 className="h-5 w-5" />} title="Customer-first" text="Built to be straightforward and responsive." />
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 -mt-8 md:-mt-12 max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 mb-6">
            <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 text-primary">
                <Target className="h-5 w-5" />
                <span className="text-[11px] font-black uppercase tracking-[0.25em]">Our Mission</span>
              </div>
              <h2 className="text-3xl font-black text-gray-950 mb-4">Make shopping feel confident again.</h2>
              <p className="text-gray-600 leading-relaxed text-base md:text-lg">
                Our mission is to provide a dependable shopping experience that balances product quality,
                transparent information, and support that actually feels accessible.
              </p>
            </div>

            <div className="bg-gray-950 text-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-gray-950/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.25),_transparent_45%)]" />
              <div className="relative z-10 flex items-center gap-3 mb-6 text-blue-300">
                <Eye className="h-5 w-5" />
                <span className="text-[11px] font-black uppercase tracking-[0.25em]">Our Vision</span>
              </div>
              <h2 className="text-3xl font-black mb-4">A store people return to.</h2>
              <p className="text-white/75 leading-relaxed text-base md:text-lg">
                We aim to become a trusted destination where the product selection is useful, the process is clear,
                and the support is consistent across every touchpoint.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 mb-3">How we work</h3>
              <div className="space-y-4">
                <ProcessItem title="Selection first" text="We choose products we can stand behind." />
                <ProcessItem title="Support that’s reachable" text="WhatsApp is the fastest way to get in touch." />
                <ProcessItem title="Information that matters" text="Clear policies and contact details across the site." />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 mb-3">What we value</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <ValueBadge icon={<Award className="h-4 w-4" />} label="Quality First" />
                <ValueBadge icon={<ShieldCheck className="h-4 w-4" />} label="Integrity" />
                <ValueBadge icon={<Zap className="h-4 w-4" />} label="Speed" />
                <ValueBadge icon={<HeartHandshake className="h-4 w-4" />} label="Reliability" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative z-10 grid md:grid-cols-[1fr_auto] gap-10 items-center">
              <div className="space-y-5 text-left">
                <h3 className="text-3xl md:text-4xl font-black text-gray-950 leading-tight">
                  Built for trust,
                  <span className="block text-primary">not just transactions.</span>
                </h3>
                <p className="text-gray-600 leading-relaxed text-base md:text-lg max-w-2xl">
                  Every part of the experience is designed to be direct: what we sell, how to reach us,
                  and what to expect after you order.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link href="/faq" className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">
                    View FAQs
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-800 transition-colors hover:border-primary hover:text-primary">
                    Reach support
                  </Link>
                </div>
              </div>

              <div className="hidden md:block">
                <div className="relative aspect-square w-64 rounded-[2rem] border border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
                  <div className="text-center p-8">
                    <ShieldCheck className="w-20 h-20 text-primary/20 mx-auto mb-4" />
                    <p className="text-xs font-black text-gray-300 uppercase tracking-[0.35em]">Trusted platform</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-black uppercase tracking-wide text-gray-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
    </div>
  );
}

function ProcessItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
      <div>
        <h4 className="font-bold text-gray-950">{title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
      </div>
    </div>
  );
}

function ValueBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-bold text-gray-800">{label}</span>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left group">
      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
        {icon}
      </div>
      <h4 className="font-bold text-gray-900 mb-3 uppercase tracking-tight">{title}</h4>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
