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
      <div className="container mx-auto px-4 lg:px-12 xl:px-24">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {title}
            </h2>
            <div className="h-1 w-12 bg-accent rounded-full"></div>
          </div>
        </div>
        
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {products.map((product) => (
              <DetailedProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white border border-gray-100 rounded-lg">
            <p className="text-muted-foreground">No products found at the moment.</p>
          </div>
        )}
      </div>
    </section>
  );
}