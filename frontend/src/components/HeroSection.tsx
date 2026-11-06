'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BASE_URL } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DiscountCard {
  id: number;
  name: string;
  image_url: string | null;
  discount_type: string;
  value: string;
  scope: string;
  is_active: boolean;
  priority: number;
  make_card?: boolean;
}

interface BannerGroup {
  mainBanner: DiscountCard;
  smallBanners: DiscountCard[];
}

export function HeroSection() {
  const [cards, setCards] = useState<DiscountCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiscountCards() {
      try {
        const response = await fetch(`${BASE_URL}/api/discount/cards/`);
        if (!response.ok) throw new Error('Failed to fetch discount cards');
        const data = await response.json();
        
        const activeCards = data
          .filter((card: DiscountCard) => card.is_active)
          .sort((a: DiscountCard, b: DiscountCard) => b.priority - a.priority);
        
        setCards(activeCards);
      } catch (err) {
        // Handled silently
      } finally {
        setLoading(false);
      }
    }

    fetchDiscountCards();
  }, []);

  if (loading) {
    return (
      <section className="py-2 bg-white">
        <div className="container mx-auto px-2 lg:px-12 xl:px-24">
          <Skeleton className="w-full h-[180px] md:h-[400px] rounded-lg mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (cards.length === 0) return null;

  const bannerGroups: BannerGroup[] = [];
  for (let i = 0; i < cards.length; i += 5) {
    bannerGroups.push({
      mainBanner: cards[i],
      smallBanners: cards.slice(i + 1, i + 5),
    });
  }

  return (
    <section className="py-2 bg-white">
      <div className="container mx-auto px-2 lg:px-12 xl:px-24">
        {bannerGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6 last:mb-2">
            {/* Main Hero Banner */}
            <div className="mb-3">
              <Link href={`/discounts/${group.mainBanner.id}`}>
                <div className="relative w-full aspect-[16/7.5] md:aspect-[16/5] rounded-lg overflow-hidden shadow-sm ring-1 ring-inset ring-gray-100 bg-gray-50 group isolate">
                  <Image
                    src={group.mainBanner.image_url || `https://picsum.photos/seed/promo-${group.mainBanner.id}/1200/500`}
                    alt={group.mainBanner.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority={groupIndex === 0}
                    sizes="(max-width: 1536px) 100vw, 1536px"
                    data-ai-hint="main promotion banner"
                  />
                  {groupIndex === 0 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      <div className="w-10 h-1 bg-primary rounded-full"></div>
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-white/60 rounded-full"></div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </div>

            {/* Smaller Support Banners */}
            {group.smallBanners.length > 0 && (
              <div className={cn(
                "grid gap-2",
                group.smallBanners.length === 1 ? "grid-cols-1" :
                group.smallBanners.length === 2 ? "grid-cols-2" :
                group.smallBanners.length === 3 ? "grid-cols-2 md:grid-cols-3" :
                "grid-cols-2 md:grid-cols-4"
              )}>
                {group.smallBanners.map((card) => (
                  <Link key={card.id} href={`/discounts/${card.id}`} className="group block">
                    <div className="relative aspect-video rounded-lg overflow-hidden shadow-sm ring-1 ring-inset ring-gray-100 bg-white isolate">
                      <Image
                        src={card.image_url || `https://picsum.photos/seed/card-${card.id}/600/340`}
                        alt={card.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 400px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        data-ai-hint="horizontal discount banner"
                      />
                      {!card.image_url && (
                        <div className="absolute inset-0 bg-black/40 flex items-end p-3">
                          <h3 className="text-white text-[11px] font-bold uppercase leading-tight line-clamp-2">
                            {card.name}
                          </h3>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
