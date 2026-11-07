'use client';

import React from 'react';
import { Truck, ShieldCheck, Headphones } from 'lucide-react';

export function TrustBadges() {
  const badges = [
    {
      icon: <Truck className="h-4 w-4" />,
      title: "1–3 days in Dhaka",
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      title: "7-day returns",
    },
    {
      icon: <Headphones className="h-4 w-4" />,
      title: "WhatsApp support",
    }
  ];

  return (
    <div className="container mx-auto px-4 py-4 lg:px-12 xl:px-24">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-black/10 pt-4 text-sm text-gray-600">
        {badges.map((badge) => (
          <span key={badge.title} className="inline-flex items-center gap-2">
            {badge.icon}
            {badge.title}
          </span>
        ))}
      </div>
    </div>
  );
}