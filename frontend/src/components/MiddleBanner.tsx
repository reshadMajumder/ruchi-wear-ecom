'use client';

import React from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function MiddleBanner() {
  const bannerImage = PlaceHolderImages.find(img => img.id === 'middle-banner');
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="relative w-full aspect-[1400/400] rounded-xl overflow-hidden shadow-sm">
        <Image
          src={bannerImage?.imageUrl || "https://picsum.photos/seed/middle-eid/1400/400"}
          alt={bannerImage?.description || "Grand Eid Fest Banner"}
          fill
          className="object-cover"
          data-ai-hint="promotion banner"
        />
      </div>
    </div>
  );
}
