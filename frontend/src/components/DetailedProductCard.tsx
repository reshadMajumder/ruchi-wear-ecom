
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/mockData';

interface DetailedProductCardProps {
  product: Product;
}

export const DetailedProductCard = React.memo(function DetailedProductCard({ product }: DetailedProductCardProps) {
  const off = product.discountPercent ? Math.round(product.discountPercent) : 0;

  return (
    <article className="group flex h-full flex-col">
      <Link href={`/products/${product.id}`} className="relative block aspect-[3/4] overflow-hidden rounded-lg bg-gray-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded bg-black px-1.5 py-0.5 text-[11px] font-semibold text-white">
            −{off}%
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 pt-2">
        <Link href={`/products/${product.id}`}>
          <h3 className="line-clamp-2 text-sm leading-snug text-gray-900">{product.name}</h3>
        </Link>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900">Tk {product.price.toLocaleString()}</span>
          {product.originalPrice > product.price && (
            <span className="text-xs text-gray-400 line-through">Tk {product.originalPrice.toLocaleString()}</span>
          )}
        </div>
      </div>
    </article>
  );
});
