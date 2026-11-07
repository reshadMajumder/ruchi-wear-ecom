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
      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-12 xl:px-24 py-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="aspect-[16/9] md:aspect-[2/1] rounded-xl" />
            <Skeleton className="hidden aspect-[2/1] rounded-xl md:block" />
          </div>
        </div>
      </section>
    );
  }

  if (cards.length === 0) return null;

  const banners = cards.slice(0, 2);

  return (
    <section className="bg-white">
      <div className="container mx-auto px-4 lg:px-12 xl:px-24 py-3">
        <div className={cn("grid gap-3", banners.length > 1 && "md:grid-cols-2")}>
          {banners.map((card, index) => {
            const offer = card.discount_type === "percentage"
              ? `${Number(card.value)}% off`
              : `Tk ${Number(card.value).toLocaleString()} off`;
            return (
              <Link key={card.id} href={`/discounts/${card.id}`} className="group block">
                <div className="relative aspect-[16/9] md:aspect-[2/1] overflow-hidden rounded-xl bg-gray-100">
                  <Image
                    src={card.image_url || `https://picsum.photos/seed/promo-${card.id}/1200/600`}
                    alt={card.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    priority={index === 0}
                    sizes={banners.length > 1 ? "(max-width: 768px) 100vw, 50vw" : "100vw"}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-sm font-semibold text-white">{card.name}</p>
                    <p className="text-xs text-white/80">{offer}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
