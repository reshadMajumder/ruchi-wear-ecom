
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = Math.max(0, Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100));

  return (
    <div className="product-card group flex flex-col h-full bg-white relative">
      <Link href={`/products/${product.id}`} className="flex flex-col h-full">
        {/* Image Section */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            data-ai-hint="product image"
          />
          
          {discount > 0 && Number.isFinite(discount) && (
            <Badge className="absolute top-3 left-3 bg-accent hover:bg-accent font-bold z-10">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 flex-grow flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            {product.category}
          </span>
          <h4 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight min-h-[2.5rem]">
            {product.name}
          </h4>

          {/* Ratings and review count will be re-added later. */}

          <div className="flex items-center gap-2 mt-auto pt-2">
            <span className="text-lg font-bold text-primary">${product.price.toLocaleString()}</span>
            {product.originalPrice > product.price && (
              <span className="text-sm text-muted-foreground line-through">${product.originalPrice.toLocaleString()}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
