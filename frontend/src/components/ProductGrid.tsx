'use client';

import React from 'react';
import { Product } from '@/data/mockData';
import { DetailedProductCard } from './DetailedProductCard';

interface ProductGridProps {
  title: string;
  products: Product[];
}

export function ProductGrid({ title, products }: ProductGridProps) {
  return (
    <section className="py-8">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-10">
        <h2 className="mb-5 font-headline text-3xl uppercase tracking-tight">{title}</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {products.map((product) => (
              <DetailedProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-gray-500">No matches.</p>
        )}
      </div>
    </section>
  );
}