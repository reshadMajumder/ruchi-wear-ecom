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
    <section className="py-6">
      <div className="container mx-auto px-4 lg:px-12 xl:px-24">
        <h2 className="mb-3 text-lg font-semibold text-gray-950">{title}</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-4">
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