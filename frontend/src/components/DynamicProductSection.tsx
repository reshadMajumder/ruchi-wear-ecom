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
    <section className="border-b bg-white py-6 last:border-b-0">
      <div className="container mx-auto px-4 lg:px-12 xl:px-24">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-gray-950">{section.title}</h2>
          <Link href={`/sections/${section.id}`} className="text-sm text-gray-500 hover:text-gray-950">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-4">
          {mappedProducts.map((product) => (
            <DetailedProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
