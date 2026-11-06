'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ShippingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100">
          <h1 className="text-4xl font-black text-gray-900 mb-8 text-left uppercase tracking-tight">SHIPPING POLICY</h1>
          <div className="prose prose-blue max-w-none text-gray-600 space-y-8 text-left">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Shipping Methods</h2>
              <p>We offer standard and express shipping options to ensure your products reach you as quickly as possible. We partner with leading courier services to provide reliable delivery nationwide.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Delivery Times</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border">
                  <h3 className="font-bold text-gray-900">Inside Dhaka</h3>
                  <p className="text-sm">Delivery within 24-48 hours.</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border">
                  <h3 className="font-bold text-gray-900">Outside Dhaka</h3>
                  <p className="text-sm">Delivery within 3-5 business days.</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Shipping Costs</h2>
              <p>Shipping costs are calculated at checkout based on the weight and dimensions of your order, as well as the delivery location. We frequently offer <strong>Free Shipping</strong> on orders above a certain value.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Tracking Your Order</h2>
              <p>Once your order has been dispatched, you will receive an SMS and/or email with a tracking number and a link to monitor your shipment's progress in real-time.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
