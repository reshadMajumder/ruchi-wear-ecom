'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface FeaturedProduct {
  slug: string;
  name: string;
  image: string;
}

interface CollectionHeroProps {
  title: string;
  sectionId: number;
  products: FeaturedProduct[];
}

export function CollectionHero({ title, sectionId, products }: CollectionHeroProps) {
  const [start, setStart] = useState(0);

  const slides = products.filter((product) => product.image);
  const visible = slides.length
    ? [slides[start % slides.length], slides[(start + 1) % slides.length]].filter(
        (product, index, list) => list.findIndex((item) => item.slug === product.slug) === index
      )
    : [];

  return (
    <section className="mx-auto grid max-w-[1440px] items-end gap-8 px-4 py-8 lg:grid-cols-[minmax(300px,0.9fr)_1.1fr] lg:px-10">
      <div>
        <h2 className="font-headline text-[clamp(4.25rem,7vw,6.75rem)] uppercase leading-[0.78] text-gray-950">
          {title.trim().split(/\s+/).map((word, index) => (
            <span key={`${word}-${index}`} className="block">{word}</span>
          ))}
        </h2>
        <p className="mt-4 text-lg leading-tight text-gray-900">Reflection of Taste</p>
        <div className="mt-8 flex items-center gap-3">
          <Link href={`/sections/${sectionId}`} className="inline-flex h-11 items-center gap-3 bg-[#e4e2de] px-4 text-sm">
            Go to shop
            <ArrowRight className="h-4 w-4" />
          </Link>
          {slides.length > 2 && (
            <div className="flex">
              <button onClick={() => setStart((value) => (value + slides.length - 1) % slides.length)} className="flex h-11 w-11 items-center justify-center border border-black/10" aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setStart((value) => (value + 1) % slides.length)} className="flex h-11 w-11 items-center justify-center border border-l-0 border-black/10" aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {visible.map((product) => (
          <Link key={product.slug} href={`/products/${product.slug}`} className="relative aspect-[3/2] overflow-hidden bg-[#eceae6] lg:aspect-[4/5]">
            <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 45vw, 480px" className="object-cover" />
          </Link>
        ))}
      </div>
    </section>
  );
}
