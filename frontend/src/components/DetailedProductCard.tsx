'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/mockData';

interface DetailedProductCardProps {
  product: Product;
}

export const DetailedProductCard = React.memo(function DetailedProductCard({ product }: DetailedProductCardProps) {
  const onSale = product.originalPrice > product.price;

  return (
    <article>
      <Link href={`/products/${product.id}`} className="relative block aspect-square overflow-hidden bg-white">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 hover:scale-[1.03]"
        />
      </Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {product.category && (
            <p className="text-[11px] uppercase tracking-wide text-gray-500">{product.category}</p>
          )}
          <Link href={`/products/${product.id}`}>
            <h3 className="mt-0.5 line-clamp-1 text-sm font-semibold uppercase tracking-wide">{product.name}</h3>
          </Link>
        </div>
        <div className="text-right">
          {onSale && (
            <p className="text-xs text-gray-400 line-through">Tk {product.originalPrice.toLocaleString()}</p>
          )}
          <p className="text-sm font-medium">Tk {product.price.toLocaleString()}</p>
        </div>
      </div>
    </article>
  );
});
