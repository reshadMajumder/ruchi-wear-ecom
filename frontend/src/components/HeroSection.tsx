'use client';

import React, { useEffect, useState } from 'react';
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

function offerText(card: DiscountCard) {
  return card.discount_type === 'percentage'
    ? `${Number(card.value)}% off`
    : `Tk ${Number(card.value).toLocaleString()} off`;
}

function OfferTile({ card, compact = false }: { card: DiscountCard; compact?: boolean }) {
  return (
    <Link href={`/discounts/${card.id}`} className="group relative block h-full overflow-hidden bg-[#eceae6]">
      <img
        src={card.image_url || `https://picsum.photos/seed/promo-${card.id}/1200/600`}
        alt={card.name}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className={cn('absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent', compact ? 'p-2' : 'p-3 md:p-4')}>
        <p className={cn('font-semibold leading-tight text-white', compact ? 'text-[11px]' : 'text-sm')}>{card.name}</p>
        <p className={cn('text-white/80', compact ? 'text-[10px]' : 'text-xs')}>{offerText(card)}</p>
      </div>
    </Link>
  );
}

function OfferLayout({ cards }: { cards: DiscountCard[] }) {
  if (cards.length <= 2) {
    return (
      <div className={cn('grid gap-2 md:gap-3', cards.length === 2 && 'md:grid-cols-2')}>
        {cards.map((card, index) => (
          <div key={card.id} className="aspect-[2/1]">
            <OfferTile card={card} />
          </div>
        ))}
      </div>
    );
  }

  const groups: DiscountCard[][] = [];
  for (let index = 0; index < cards.length; index += 3) {
    groups.push(cards.slice(index, index + 3));
  }

  return (
    <div className="flex flex-col gap-2 md:gap-3">
      {groups.map((group) => {
        if (group.length === 3) {
          return (
            <div key={group[0].id} className="grid grid-cols-2 grid-rows-2 gap-2 md:gap-3">
              <div className="row-span-2 min-h-[168px] md:min-h-[320px]">
                <OfferTile card={group[0]} />
              </div>
              <OfferTile card={group[1]} compact />
              <OfferTile card={group[2]} compact />
            </div>
          );
        }
        if (group.length === 2) {
          return (
            <div key={group[0].id} className="grid grid-cols-[1.6fr_1fr] gap-2 md:gap-3">
              <div className="aspect-[2/1]">
                <OfferTile card={group[0]} />
              </div>
              <OfferTile card={group[1]} compact />
            </div>
          );
        }
        return (
          <div key={group[0].id} className="aspect-[2/1]">
            <OfferTile card={group[0]} />
          </div>
        );
      })}
    </div>
  );
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
      <section>
        <div className="mx-auto max-w-[1440px] px-4 pt-3 md:py-4 lg:px-10">
          <div className="grid gap-2 md:grid-cols-2 md:gap-3">
            <Skeleton className="aspect-[2/1]" />
            <Skeleton className="aspect-[2/1]" />
          </div>
        </div>
      </section>
    );
  }

  if (cards.length === 0) return null;

  return (
    <section>
      <div className="mx-auto max-w-[1440px] px-4 pt-3 md:py-4 lg:px-10">
        <OfferLayout cards={cards} />
      </div>
    </section>
  );
}
