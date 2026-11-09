'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BASE_URL } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  image_url: string;
  subcategories_count: number;
}

export const CategorySection = React.memo(function CategorySection() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch(`${BASE_URL}/api/foundation/categories/`);
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        setCategories(data.slice(0, 8));
      } catch (err) {
        setError('Could not load categories');
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  if (error) return null;

  return (
    <section aria-labelledby="home-categories" className="mx-auto max-w-[1440px] px-4 py-6 lg:px-10">
      <h2 id="home-categories" className="mb-5 font-headline text-[clamp(4.25rem,7vw,6.75rem)] uppercase leading-[0.78] text-gray-950 md:mb-6">
        Categories
      </h2>

      <div className="flex flex-col gap-7 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_0.9fr] items-center gap-4">
                <Skeleton className="aspect-[3/2]" />
                <Skeleton className="h-12 w-3/4" />
              </div>
            ))
          : categories.map((category, index) => {
              const photo = (
                <div className="relative aspect-[3/2] overflow-hidden bg-[#eceae6]">
                  <Image
                    src={category.image_url || 'https://placehold.co/600x800?text=No+Image'}
                    alt=""
                    fill
                    sizes="45vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              );
              const label = (
                <div className={index % 2 === 0 ? 'text-left' : 'text-right'}>
                  <p className="font-headline text-[clamp(2.15rem,8vw,3.4rem)] uppercase leading-[0.78] text-gray-950">
                    {category.name}
                  </p>
                </div>
              );
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className={cn(
                    "group grid items-center gap-4",
                    index % 2 === 0 ? "grid-cols-[1.4fr_0.9fr]" : "grid-cols-[0.9fr_1.4fr]"
                  )}
                >
                  {index % 2 === 0 ? photo : label}
                  {index % 2 === 0 ? label : photo}
                </Link>
              );
            })}
      </div>

      <div className="hidden snap-x snap-mandatory gap-6 overflow-x-auto no-scrollbar md:flex">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/2] w-auto flex-1" />
            ))
          : categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group relative aspect-[3/2] w-auto min-w-0 flex-1 shrink-0 snap-start overflow-hidden bg-[#eceae6]"
              >
                <Image
                  src={category.image_url || 'https://placehold.co/600x800?text=No+Image'}
                  alt=""
                  fill
                  sizes="25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-5 font-headline text-5xl uppercase leading-[0.78] text-white md:text-6xl md:leading-[0.78]">
                  {category.name}
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
});
