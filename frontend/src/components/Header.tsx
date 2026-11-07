'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingCart, Menu, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
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

  const newest = sections[0];

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-[#f6f5f2]">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-4 px-4 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button className="text-gray-950 md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-[#f6f5f2] p-0">
              <SheetHeader className="px-5 pb-2 pt-6">
                <SheetTitle className="text-left text-sm font-medium">Menu</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-72px)]">
                <div className="space-y-6 px-5 pb-8">
                  <div className="flex flex-col text-sm">
                    <Link href="/" onClick={() => setIsMenuOpen(false)} className="py-2">Home</Link>
                    <Link href="/categories/all" onClick={() => setIsMenuOpen(false)} className="py-2">Collections</Link>
                    {newest && <Link href={`/sections/${newest.id}`} onClick={() => setIsMenuOpen(false)} className="py-2">New</Link>}
                  </div>
                  <Separator />
                  <div className="flex flex-col">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/categories/${category.slug}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between py-2 text-sm uppercase tracking-wide"
                      >
                        {category.name}
                        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          <nav className="hidden items-center gap-6 text-sm text-gray-950 md:flex">
            <Link href="/" className="hover:opacity-60">Home</Link>
            <Link href="/categories/all" className="hover:opacity-60">Collections</Link>
            {newest && <Link href={`/sections/${newest.id}`} className="hover:opacity-60">New</Link>}
          </nav>
        </div>

        <Link href="/" aria-label="Ruchi Wear home" className="flex items-center gap-2">
          <Image src="/brand/mark-black.png" alt="" width={40} height={44} priority className="h-9 w-auto" />
          <span className="hidden flex-col leading-none sm:flex">
            <Image src="/brand/wordmark.png" alt="Ruchi Wear" width={120} height={26} priority className="h-5 w-auto" />
          </span>
        </Link>

        <div ref={searchAreaRef} className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white"
            aria-label={searchOpen ? "Close search" : "Search"}
            aria-expanded={searchOpen}
          >
            <Search className="h-4 w-4" />
          </button>
          <Link href="/cart" className="inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm text-white">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {mounted && totalItems > 0 && <span>{totalItems}</span>}
          </Link>
        </div>
      </div>
      {searchOpen && (
        <form onSubmit={handleSearch} className="border-t border-black/5 px-4 py-3 lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 bg-[#eceae6] px-3">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              ref={searchInputRef}
              name="q"
              type="search"
              placeholder="Search"
              aria-label="Search products"
              className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>
      )}
    </header>
  );
}
