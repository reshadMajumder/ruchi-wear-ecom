
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/mockData';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { cn } from '@/lib/utils';

interface DetailedProductCardProps {
  product: Product;
}

export const DetailedProductCard = React.memo(function DetailedProductCard({ product }: DetailedProductCardProps) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorite = isFavorite(product.id);
  
  const showDiscountBadge = product.discountPercent && product.discountPercent > 0;

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-100 group relative flex flex-col h-full hover:shadow-md transition-shadow overflow-hidden isolate">
      {/* Image Container */}
      <Link 
        href={`/products/${product.id}`} 
        className="relative aspect-[4/5] bg-white overflow-hidden block"
        aria-label={`View details for ${product.name}`}
      >
        <Image
          src={product.image}
          alt={`Image of ${product.name}`}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {showDiscountBadge && (
          <div className="absolute top-1 right-1 z-10 w-11 h-11 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#ed1c24] fill-current drop-shadow-sm">
              <path d="M50,2.5 L55.5,5.8 L61.5,4.3 L66.3,8.4 L72.6,8.2 L76.4,13.2 L82.5,14.2 L85.1,19.9 L90.5,22.1 L91.8,28.2 L96.1,31.6 L96,37.8 L99,42.4 L97.4,48.5 L99,54.6 L96,59.2 L96.1,65.4 L91.8,68.8 L90.5,74.9 L85.1,77.1 L82.5,82.8 L76.4,83.8 L72.6,88.8 L66.3,88.6 L61.5,92.7 L55.5,91.2 L50,94.5 L44.5,91.2 L38.5,92.7 L33.7,88.6 L27.4,88.8 L23.6,83.8 L17.5,82.8 L14.9,77.1 L9.5,74.9 L8.2,68.8 L3.9,65.4 L4,59.2 L1,54.6 L2.6,48.5 L1,42.4 L4,37.8 L3.9,31.6 L8.2,28.2 L9.5,22.1 L14.9,19.9 L17.5,14.2 L23.6,13.2 L27.4,8.2 L33.7,8.4 L38.5,4.3 L44.5,5.8 Z" />
            </svg>
            <div className="relative flex flex-col items-center justify-center leading-none text-white font-black drop-shadow-sm">
              <span className="text-[10px]">{product.discountPercent}%</span>
              <span className="text-[6px] uppercase tracking-tighter">OFF</span>
            </div>
          </div>
        )}
      </Link>

      <div className="p-3 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-col gap-1.5 flex-grow">
            <Link href={`/products/${product.id}`}>
              <h3 className="text-[13px] font-medium text-gray-800 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                {product.name}
              </h3>
            </Link>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(product);
            }}
            aria-label={favorite ? "Remove from wishlist" : "Add to wishlist"}
            className={cn(
              "transition-colors pt-0.5",
              favorite ? "text-red-500" : "text-gray-300 hover:text-red-500"
            )}
          >
            <Heart className={cn("w-4 h-4", favorite && "fill-current")} />
          </button>
        </div>

        {/* Ratings and review count will be re-added later. */}

        <div className="mt-auto flex items-center gap-2">
          <span className="text-[15px] font-bold text-gray-900">
            Tk {product.price.toLocaleString()}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-[12px] text-gray-400 line-through">
              Tk {product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </article>
  );
});
