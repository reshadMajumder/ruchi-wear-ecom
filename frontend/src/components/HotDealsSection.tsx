
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart, Heart, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HOT_DEALS_LARGE, HOT_DEALS_SMALL, Product } from '@/data/mockData';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export function HotDealsSection() {
  return (
    <section className="py-8 bg-[#f8f9fa]">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-red-600">Hot Deals of the Day</h2>
          <button className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            More Products <span className="text-lg">→</span>
          </button>
        </div>

        {/* Top Carousel Section */}
        <div className="mb-10">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {HOT_DEALS_LARGE.map((product) => (
                <CarouselItem key={product.id} className="pl-4 md:basis-1/2">
                  <LargeProductCard product={product} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Bottom Grid Section - Double row on phone view */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-8">
          {HOT_DEALS_SMALL.map((product) => (
            <SmallProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LargeProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white border-2 border-[#3b82f6]/20 rounded-xl p-6 flex flex-col sm:flex-row gap-6 hover:shadow-lg transition-all h-full relative group">
      {/* Promo Badge Overlay (Simulated) */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="bg-blue-900 text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm">
          Signature price
        </div>
      </div>

      {/* Image Section */}
      <Link href={`/products/${product.id}`} className="relative w-full sm:w-2/5 aspect-square bg-white rounded-lg overflow-hidden flex-shrink-0">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-4"
          data-ai-hint="featured hot deal product"
        />
      </Link>

      {/* Content Section */}
      <div className="flex-grow flex flex-col justify-center py-2">
        <div className="space-y-3">
          <Link href={`/products/${product.id}`}>
            <h3 className="text-lg font-bold text-foreground leading-tight hover:text-primary cursor-pointer transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
          
          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'text-orange-400 fill-orange-400' : 'text-gray-300'}`} 
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({product.reviews} Reviews)</span>
          </div>

          <div className="flex items-baseline gap-3 pt-2">
            <span className="text-2xl font-black text-foreground">Tk {product.price.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground line-through italic">Tk {product.originalPrice.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <Button className="flex-grow bg-white border-2 border-foreground text-foreground hover:bg-foreground hover:text-white font-black h-12 uppercase text-xs tracking-widest transition-colors rounded-none">
              <ShoppingCart className="h-5 w-5 mr-2" />
              BUY NOW
            </Button>
            <div className="flex items-center gap-2">
              <button className="h-10 w-10 flex items-center justify-center rounded-full border border-border hover:bg-muted text-muted-foreground transition-colors group/heart">
                <Heart className="h-5 w-5 group-hover/heart:text-red-500 transition-colors" />
              </button>
              <button className="h-10 w-10 flex items-center justify-center rounded-full border border-border hover:bg-muted text-muted-foreground transition-colors">
                <Scale className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SmallProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`} className="flex flex-col sm:flex-row gap-2 sm:gap-4 group cursor-pointer">
      <div className="relative w-full sm:w-20 aspect-square sm:aspect-auto sm:h-20 bg-white border border-border rounded-md overflow-hidden flex-shrink-0 transition-shadow group-hover:shadow-sm">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-2"
          data-ai-hint="deal product small"
        />
      </div>
      <div className="flex flex-col justify-between py-0.5">
        <h4 className="text-[12px] sm:text-[13px] font-medium text-muted-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {product.name}
        </h4>
        <div className="flex items-center gap-0.5 sm:gap-1 my-1">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${i < Math.floor(product.rating) ? 'text-orange-400 fill-orange-400' : 'text-gray-200'}`} 
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Tk {product.price.toLocaleString()}</span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-through">Tk {product.originalPrice.toLocaleString()}</span>
        </div>
      </div>
    </Link>
  );
}
