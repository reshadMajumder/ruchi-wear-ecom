'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Phone, MapPin, MessageCircle, Clock } from 'lucide-react';

export default function ContactPage() {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/8801887473720', '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Get in Touch</h1>
            <p className="text-lg text-muted-foreground">Have a question? We'd love to hear from you.</p>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-12 md:py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="space-y-6">
              {/* WhatsApp */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="text-green-600 w-6 h-6" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-gray-900 mb-1">WhatsApp Us</h3>
                    <a href="https://wa.me/8801887473720" className="text-green-600 font-medium hover:underline">
                      +880 1887-473720
                    </a>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Mon - Sat: 9am - 6pm
                    </p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-blue-600 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Visit Us</h3>
                    <p className="text-muted-foreground">Baroicha Bazar</p>
                    <p className="text-muted-foreground">Belabo, Narsingdi</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-8 text-center">
              <Button
                onClick={handleWhatsAppClick}
                size="lg"
                className="bg-primary text-white font-semibold rounded-lg"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Message on WhatsApp
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
