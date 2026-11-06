'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ReturnsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100">
          <h1 className="text-4xl font-black text-gray-900 mb-8 text-left uppercase tracking-tight">RETURNS & EXCHANGES</h1>
          <div className="prose prose-blue max-w-none text-gray-600 space-y-8 text-left">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Return Policy</h2>
              <p>We want you to be completely satisfied with your purchase. If you are not happy with your item, you can return it within <strong>7 days</strong> of delivery for a full refund or exchange, provided the item is in its original condition and packaging.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Conditions for Returns</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Items must be unused and in the same condition that you received them.</li>
                <li>Items must be in the original packaging with all tags and labels intact.</li>
                <li>Proof of purchase (invoice/receipt) must be presented.</li>
                <li>Electronics and hygiene-sensitive items must not have been opened or used.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">How to Initiate a Return</h2>
              <p>To start a return, please contact our support team via WhatsApp at <strong>+880 1887-473720</strong>. Our team will guide you through the process and arrange for a pickup if applicable.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Refund Process</h2>
              <p>Once your return is received and inspected, we will notify you of the approval or rejection of your refund. If approved, your refund will be processed via your original payment method within 5-10 business days.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
