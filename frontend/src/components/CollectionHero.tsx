'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { BASE_URL } from '@/lib/constants';

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
}

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
  const router = useRouter();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [query, setQuery] = useState('');
  const [start, setStart] = useState(0);

  useEffect(() => {
    fetch(`${BASE_URL}/api/foundation/categories/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => {});
  }, []);

  const slides = products.filter((product) => product.image);
  const visible = slides.length
    ? [slides[start % slides.length], slides[(start + 1) % slides.length]].filter(
        (product, index, list) => list.findIndex((item) => item.slug === product.slug) === index
      )
    : [];

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/?search=${encodeURIComponent(term)}` : '/categories/all');
  };

  return (
    <section className="mx-auto grid max-w-[1440px] gap-8 px-4 py-6 lg:grid-cols-[240px_1fr] lg:px-10 lg:py-8">
      <div>
        <div className="mb-6 flex flex-col gap-1 text-sm uppercase tracking-[0.14em] text-gray-800">
          {categories.map((category) => (
            <Link key={category.id} href={`/categories/${category.slug}`} className="w-fit hover:opacity-60">
              {category.name}
            </Link>
          ))}
        </div>
        <form onSubmit={search} className="mb-8 flex h-11 items-center gap-2 bg-[#eceae6] px-3">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search products"
            className="w-full bg-transparent text-sm outline-none"
          />
        </form>
        <h2 className="font-headline text-5xl font-semibold uppercase leading-[0.9] tracking-tight text-gray-950 md:text-6xl">
          {title}
        </h2>
        <p className="mt-3 text-sm text-gray-600">Reflection of Taste</p>
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
          <Link key={product.slug} href={`/products/${product.slug}`} className="relative aspect-[4/5] overflow-hidden bg-white">
            <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 45vw, 480px" className="object-cover" />
          </Link>
        ))}
      </div>
    </section>
  );
}
