'use client';

import React from 'react';
import { Truck, ShieldCheck, CreditCard, Headphones } from 'lucide-react';

export function TrustBadges() {
  const badges = [
    {
      icon: <Truck className="h-8 w-8 text-muted-foreground" />,
      title: "Cancellation & Returns",
      description: "If products not matched"
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-muted-foreground" />,
      title: "Privacy Policy",
      description: "Check before dealing"
    },
    {
      icon: <CreditCard className="h-8 w-8 text-muted-foreground" />,
      title: "EMI Policy",
      description: "We provide 0% EMI facilities*"
    },
    {
      icon: <Headphones className="h-8 w-8 text-muted-foreground" />,
      title: "Customer Support",
      description: "WhatsApp us at +880 1887-473720"
    }
  ];

  return (
    <div className="container mx-auto px-4 lg:px-12 xl:px-24 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-white border border-border rounded-lg p-6">
        {badges.map((badge, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {badge.icon}
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">{badge.title}</h4>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}