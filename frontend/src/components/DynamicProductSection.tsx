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
}

export function DynamicProductSection({ section }: DynamicProductSectionProps) {
  if (!section.products || section.products.length === 0) return null;

  const mappedProducts: Product[] = section.products.map((p: any) => ({
    id: p.slug,
    name: p.name,
    price: parseFloat(p.price_data.final_price),
    originalPrice: parseFloat(p.price_data.original_price),
    image: p.primary_image || 'https://placehold.co/400x400?text=No+Image',
    category: section.title,
    rating: p.rating || 0,
    reviews: p.reviews || 0,
    discountAmount: p.price_data.discount_value,
    discountPercent: p.price_data.discount_percent,
    soldCount: p.sold_count,
    warranty: p.warranty_text,
    hasEMI: p.has_emi
  }));

  return (
    <section className="py-8 bg-white border-b last:border-b-0">
      <div className="container mx-auto px-4 lg:px-12 xl:px-24">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">{section.title}</h2>
            <div className="h-1 w-12 bg-accent rounded-full"></div>
          </div>
          <Link href={`/sections/${section.id}`} className="text-sm font-semibold text-primary hover:text-accent transition-colors flex items-center gap-1 group">
            See More <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {mappedProducts.map((product) => (
            <DetailedProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
