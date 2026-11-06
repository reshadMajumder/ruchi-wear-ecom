'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Heart, ShoppingCart, Menu, ChevronRight, LayoutGrid, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BASE_URL } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
}

interface ApiSection {
  id: number;
  title: string;
}

interface HeaderProps {
  onSearch?: (term: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const { totalItems } = useCart();
  const { totalFavorites } = useFavorites();
  
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [sections, setSections] = useState<ApiSection[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchData() {
      try {
        const [catRes, secRes] = await Promise.all([
          fetch(`${BASE_URL}/api/foundation/categories/`),
          fetch(`${BASE_URL}/api/products/sections/`)
        ]);
        
        if (catRes.ok) setCategories(await catRes.json());
        if (secRes.ok) setSections(await secRes.json());
      } catch (err) {
        // Handled silently
      }
    }
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchTerm);
  };

  return (
    <header className="w-full bg-[#005a9c] text-white shadow-md z-40 sticky top-0">
      <div className="container mx-auto px-4 lg:px-12 xl:px-24">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="flex items-center">
              {/*
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter italic">
                Adurys<span className="text-white">.com</span>
              </h1>
              */}
              <Image
                src="https://res.cloudinary.com/dy2wrwdwp/image/upload/v1777814890/ad-logo-w_t2m4il.png"
                alt="Adurys Gallery"
                width={140}
                height={40}
                priority
                className="h-10 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Desktop Search Bar (Hidden on mobile) */}
          <form 
            onSubmit={handleSearch}
            className="hidden md:flex flex-grow max-w-2xl relative mx-4"
          >
            <Input
              type="text"
              placeholder="Search products..."
              className="w-full pl-4 pr-12 h-11 text-foreground rounded-md focus-visible:ring-offset-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              suppressHydrationWarning
            />
            <Button 
              type="submit"
              size="icon" 
              variant="ghost"
              className="absolute right-0 top-0 h-11 w-11 text-gray-400 hover:text-primary"
              suppressHydrationWarning
            >
              <Search className="h-5 w-5" />
            </Button>
          </form>

          {/* Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/favorites" className="relative p-2 hover:bg-white/10 rounded-full transition-colors" title="Favorites">
              <Heart className="h-6 w-6" />
              {mounted && totalFavorites > 0 && (
                <span className="absolute top-1 right-0 bg-red-500 text-white border border-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                  {totalFavorites}
                </span>
              )}
            </Link>
            <Link href="/cart" className="relative p-2 hover:bg-white/10 rounded-full transition-colors" title="Shopping Cart">
              <ShoppingCart className="h-6 w-6" />
              {mounted && totalItems > 0 && (
                <span className="absolute top-1 right-0 bg-accent text-white border border-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button - Moved to Right */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white h-10 w-10 md:hidden p-0"
                  suppressHydrationWarning
                >
                  <Menu className="h-7 w-7" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-0 border-none bg-white">
                <SheetHeader className="p-6 bg-[#005a9c] text-white space-y-0">
                  <SheetTitle className="text-white text-left font-black flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5" />
                    NAVIGATION
                  </SheetTitle>
                </SheetHeader>
                
                <ScrollArea className="h-[calc(100vh-80px)]">
                  <div className="p-6 space-y-8">
                    {/* Sections */}
                    {sections.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5" />
                          FEATURED SECTIONS
                        </h3>
                        <div className="flex flex-col gap-1">
                          {sections.map(section => (
                            <Link 
                              key={section.id} 
                              href={`/sections/${section.id}`}
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50 group transition-colors"
                            >
                              <span className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">{section.title}</span>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Categories */}
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <LayoutGrid className="w-3.5 h-3.5" />
                        CATEGORIES
                      </h3>
                      <div className="flex flex-col gap-1">
                        <Link 
                          href="/categories/all"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50 group transition-colors"
                        >
                          <span className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">All Products</span>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                        </Link>
                        {categories.map(category => (
                          <Link 
                            key={category.id} 
                            href={`/categories/${category.slug}`}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50 group transition-colors"
                          >
                            <span className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">{category.name}</span>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden container mx-auto px-4">
        <form onSubmit={handleSearch} className="relative pb-3">
          <Input
            type="text"
            placeholder="Search here..."
            className="w-full pl-10 pr-4 h-11 text-foreground bg-white rounded-md border-none focus-visible:ring-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            suppressHydrationWarning
          />
          <Search className="absolute left-3 top-1/2 -translate-y-[calc(50%+6px)] h-5 w-5 text-gray-400" />
        </form>
      </div>
    </header>
  );
}
