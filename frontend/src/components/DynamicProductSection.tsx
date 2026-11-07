'use client';

import React from 'react';
import Link from 'next/link';
import { DetailedProductCard } from './DetailedProductCard';
import { Product } from '@/data/mockData';

interface DynamicProductSectionProps {
  section: {
    id: number;
    title: string;
    products: any[];
  };
  showTitle?: boolean;
}

export function DynamicProductSection({ section, showTitle = true }: DynamicProductSectionProps) {
  if (!section.products || section.products.length === 0) return null;

  const mappedProducts: Product[] = section.products.map((p: any) => ({
    id: p.slug,
    name: p.name,
    price: parseFloat(p.price_data.final_price),
    originalPrice: parseFloat(p.price_data.original_price),
    image: p.primary_image || 'https://placehold.co/400x400?text=No+Image',
    category: p.category_name || p.product_type || '',
    rating: p.rating || 0,
    reviews: p.reviews || 0,
    discountAmount: p.price_data.discount_value,
    discountPercent: p.price_data.discount_percent,
    soldCount: p.sold_count,
    warranty: p.warranty_text,
    hasEMI: p.has_emi
  }));

  return (
    <section className="py-8">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-10">
        {showTitle && (
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="font-headline text-3xl uppercase tracking-tight">{section.title}</h2>
            <Link href={`/sections/${section.id}`} className="text-sm text-gray-500 hover:text-gray-950">
              See all
            </Link>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {mappedProducts.map((product) => (
            <DetailedProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
