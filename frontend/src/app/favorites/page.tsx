'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { DetailedProductCard } from '@/components/DetailedProductCard';
import { useFavorites } from '@/context/FavoritesContext';
import { ChevronRight, Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">My Favorites</span>
        </nav>

        <h1 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-3">
          <Heart className="w-8 h-8 text-red-500 fill-current" />
          MY WISHLIST
        </h1>

        {favorites.length === 0 ? (
          <div className="bg-white rounded-2xl p-20 text-center border border-gray-100 shadow-sm">
            <div className="mb-6 opacity-20">
              <Heart className="w-24 h-24 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Save your favorite items here to keep track of them and buy them later!
            </p>
            <Link href="/">
              <Button className="h-14 px-10 text-lg font-bold bg-primary hover:bg-primary/90 rounded-xl">
                Explore Products
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {favorites.map((product) => (
              <DetailedProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
