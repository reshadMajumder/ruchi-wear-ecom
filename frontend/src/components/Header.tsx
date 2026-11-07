'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingCart, Menu, ChevronRight, LayoutGrid, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';
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

export function Header() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const { totalItems } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  
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

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!searchAreaRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formValue = new FormData(e.currentTarget).get('q');
    const term = String(formValue ?? searchTerm).trim();
    setSearchTerm(term);
    const target = term ? `/?search=${encodeURIComponent(term)}` : '/';
    if (pathname === '/') router.replace(target, { scroll: false });
    else router.push(target);
  };

  return (
    <header className="w-full bg-black text-white shadow-md z-40 sticky top-0">
      <div className="container mx-auto px-4 lg:px-12 xl:px-24">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-4 py-2">
          {/* Logo */}
          <Link href="/" className="flex flex-shrink-0 items-center gap-2" aria-label="Ruchi Wear home">
            <Image
              src="/brand/mark-white.png"
              alt=""
              width={52}
              height={58}
              priority
              className="h-11 w-auto object-contain"
            />
            <span className={cn("flex-col items-start leading-none", searchOpen ? "hidden sm:flex" : "flex")}>
              <Image
                src="/brand/wordmark-white.png"
                alt="Ruchi Wear"
                width={132}
                height={28}
                priority
                className="h-[22px] w-auto object-contain"
              />
              <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#1890F8]">
                Reflection of Taste
              </span>
            </span>
          </Link>

          <div ref={searchAreaRef} className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
            {searchOpen && (
              <form onSubmit={handleSearch} className="min-w-0 flex-1 sm:max-w-xl">
                <Input
                  ref={searchInputRef}
                  name="q"
                  type="search"
                  placeholder="Search products..."
                  aria-label="Search products"
                  className="h-10 w-full bg-white text-foreground rounded-md focus-visible:ring-offset-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  suppressHydrationWarning
                />
              </form>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label={searchOpen ? "Close search" : "Search"}
              aria-expanded={searchOpen}
            >
              <Search className="h-6 w-6" />
            </button>
            <Link href="/cart" className="relative p-2 hover:bg-white/10 rounded-full transition-colors" title="Shopping Cart">
              <ShoppingCart className="h-6 w-6" />
              {mounted && totalItems > 0 && (
                <span className="absolute top-1 right-0 bg-[#1890F8] text-white border border-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
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
                <SheetHeader className="p-6 bg-black text-white space-y-0">
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
    </header>
  );
}
