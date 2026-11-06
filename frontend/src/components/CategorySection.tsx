'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BASE_URL } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutGrid } from 'lucide-react';

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
    <section className="py-6 bg-white border-b overflow-x-auto no-scrollbar md:overflow-visible">
      <div className="container mx-auto px-4 lg:px-12 xl:px-24">
        <div className="flex items-start justify-start md:justify-between gap-6 md:gap-2 min-w-max md:min-w-full">
          <Link 
            href="/categories/all"
            className="flex flex-col items-center gap-3 w-[80px] md:w-auto group"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full ring-1 ring-inset ring-gray-100 overflow-hidden bg-gray-50 relative flex items-center justify-center group-hover:ring-primary transition-all duration-300 shadow-sm group-hover:shadow-md isolate">
              <LayoutGrid className="w-7 h-7 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
            <span className="text-[11px] md:text-[13px] font-bold text-center text-gray-700 uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              View All
            </span>
          </Link>

          {loading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 w-[80px] md:w-auto">
                <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))
          ) : (
            categories.map((category) => (
              <Link 
                key={category.id} 
                href={`/categories/${category.slug}`}
                className="flex flex-col items-center gap-3 w-[80px] md:w-auto group"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full ring-1 ring-inset ring-gray-100 overflow-hidden bg-white relative group-hover:ring-primary transition-all duration-300 shadow-sm group-hover:shadow-md isolate">
                  <Image
                    src={category.image_url || 'https://placehold.co/150x150?text=No+Image'}
                    alt={category.name}
                    fill
                    sizes="(max-width: 768px) 64px, 80px"
                    className="object-cover p-1 rounded-full transition-transform duration-500 group-hover:scale-110"
                    data-ai-hint="category thumbnail"
                  />
                </div>
                <span className="text-[11px] md:text-[13px] font-bold text-center text-gray-700 uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {category.name}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
});
