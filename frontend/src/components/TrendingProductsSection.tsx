
'use client';

import React from 'react';
import { TRENDING_PRODUCTS } from '@/data/mockData';
import { ProductCard } from './ProductCard';

export function TrendingProductsSection() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        {/* Header Style similar to Hot Deals but distinct */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-foreground">Trending Products</h2>
            <div className="h-1 w-16 bg-accent rounded-full"></div>
          </div>
          <button className="text-sm font-semibold text-primary hover:text-accent transition-colors flex items-center gap-1 group">
            See More Trending <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRENDING_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
