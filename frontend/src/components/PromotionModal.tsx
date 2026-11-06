
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PromotionModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has already seen the promotion in this browser
    const hasSeenPromotion = localStorage.getItem('has_seen_promotion_v1');
    
    if (!hasSeenPromotion) {
      // Show modal after 2 seconds if they haven't seen it yet
      const timer = setTimeout(() => {
        setIsOpen(true);
        // Mark as seen immediately so it doesn't trigger again on refresh
        localStorage.setItem('has_seen_promotion_v1', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Content */}
      <div className="relative bg-white rounded-2xl overflow-hidden max-w-4xl w-full shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 z-10 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors md:text-gray-400 md:bg-transparent md:hover:bg-gray-100"
        >
          <X className="h-5 w-5 md:h-6 md:w-6" />
        </button>

        {/* Left Side: Image */}
        <div className="md:w-1/2 relative h-48 md:h-auto">
          <Image
            src="https://picsum.photos/seed/300/800/600"
            alt="Promotion Banner"
            fill
            className="object-cover"
            data-ai-hint="promotion sale"
          />
        </div>

        {/* Right Side: Content */}
        <div className="md:w-1/2 p-6 md:p-12 flex flex-col justify-center text-center md:text-left bg-white">
          <span className="text-accent font-bold tracking-widest uppercase mb-1 text-xs md:text-sm">Exclusive Offer</span>
          <h2 className="text-2xl md:text-4xl font-black text-primary mb-3 leading-tight">
            GRAND EID <span className="text-accent">FESTIVAL</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mb-6">
            Subscribe to our newsletter and get <span className="font-bold text-foreground">20% OFF</span> on your first order.
          </p>
          
          <div className="space-y-3">
            <Input 
              type="email" 
              placeholder="Enter your email address" 
              className="h-11 md:h-12 text-center md:text-left"
            />
            <Button className="w-full h-11 md:h-12 bg-primary hover:bg-primary/90 text-white font-bold text-base md:text-lg">
              Get My Discount
            </Button>
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mt-2 md:mt-4">
              * Terms and conditions apply
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
