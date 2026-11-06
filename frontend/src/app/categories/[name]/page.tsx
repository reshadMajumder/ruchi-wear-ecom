'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { DetailedProductCard } from '@/components/DetailedProductCard';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Filter, Loader2, Tag } from 'lucide-react';
import { BASE_URL } from '@/lib/constants';
import { Product } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';

interface Subcategory {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  parent: number;
  parent_slug: string;
}

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categorySlug = decodeURIComponent(params.name as string);
  
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  
  // Filter & Sort States
  const [sortBy, setSortBy] = useState<string>('new');
  const [discountedOnly, setDiscountedOnly] = useState<boolean>(false);

  const buildUrl = useCallback((baseUrl: string, cursor?: string | null) => {
    const url = new URL(cursor || baseUrl);
    if (!cursor) {
      if (categorySlug !== 'all') {
        url.searchParams.append('category', categorySlug);
      }
      if (sortBy) url.searchParams.append('sort', sortBy);
      if (discountedOnly) url.searchParams.append('discounted_only', 'true');
    }
    return url.toString();
  }, [categorySlug, sortBy, discountedOnly]);

  const fetchProducts = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const targetUrl = isLoadMore && nextCursor 
        ? nextCursor 
        : buildUrl(`${BASE_URL}/api/products/`);

      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      const mapped = (data.results || []).map((p: any) => ({
        id: p.slug,
        name: p.name,
        price: p.price_data.final_price,
        originalPrice: p.price_data.original_price,
        image: p.primary_image || 'https://placehold.co/400x400?text=No+Image',
        category: categorySlug === 'all' ? 'All' : categorySlug,
        rating: p.rating || 0,
        reviews: p.reviews || 0,
        discountAmount: p.price_data.discount_value,
        discountPercent: p.price_data.discount_percent,
        soldCount: p.sold_count
      }));

      setProducts(prev => isLoadMore ? [...prev, ...mapped] : mapped);
      setNextCursor(data.next);
    } catch (error) {
      // Error handled by UI state
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildUrl, nextCursor, categorySlug]);

  useEffect(() => {
    fetchProducts();
    
    // Fetch subcategories
    if (categorySlug !== 'all') {
      fetch(`${BASE_URL}/api/foundation/categories/${categorySlug}/subcategories/`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setSubcategories(data);
        })
        .catch(() => {});
    } else {
      setSubcategories([]);
    }
  }, [categorySlug, sortBy, discountedOnly, fetchProducts]);

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchProducts(true);
    }
  };

  const displayTitle = categorySlug === 'all' 
    ? 'All Products' 
    : categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1).replace(/-/g, ' ');

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 lg:px-12 xl:px-24 py-6">
        <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-6">
          <button onClick={() => router.push('/')} className="hover:text-primary transition-colors">Home</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">{displayTitle}</span>
        </nav>

        <div className="flex gap-6 relative">
          <aside className={`
            lg:w-[240px] flex-shrink-0 bg-white border border-gray-200 p-5 hidden lg:block h-fit rounded-lg shadow-sm
            ${showFilters ? 'block absolute top-0 left-0 z-50 w-full' : 'hidden'}
          `}>
            {categorySlug !== 'all' && subcategories.length > 0 && (
              <div className="mb-8">
                <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-100">
                  Subcategories
                </h3>
                <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  <ul className="space-y-1">
                    {subcategories.map((sub) => (
                      <li key={sub.id}>
                        <button 
                          onClick={() => router.push(`/categories/${sub.slug}`)}
                          className="w-full text-left text-[13px] font-bold text-gray-600 hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md transition-colors flex items-center justify-between group"
                        >
                          {sub.name}
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-100">
                Quick Filters
              </h3>
              <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => setDiscountedOnly(!discountedOnly)}>
                <Checkbox id="discounted" checked={discountedOnly} onCheckedChange={(val) => setDiscountedOnly(!!val)} />
                <label htmlFor="discounted" className="text-[13px] font-bold text-gray-600 group-hover:text-primary cursor-pointer flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5" />
                  On Sale Only
                </label>
              </div>
            </div>
          </aside>

          <div className="flex-grow pb-20">
            <div className="bg-white border border-gray-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-tight text-gray-500">Sort by</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[170px] h-10 text-[13px] font-bold rounded-md">
                      <SelectValue placeholder="New Arrivals" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Arrivals</SelectItem>
                      <SelectItem value="price_low_to_high">Price: Low to High</SelectItem>
                      <SelectItem value="price_high_to_low">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button 
                  className="lg:hidden flex items-center gap-2 text-sm font-bold text-gray-600 border px-4 py-2 rounded-md hover:bg-gray-50"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4" /> Filters
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-tight text-gray-500">Show</span>
                <Select defaultValue="40">
                  <SelectTrigger className="w-[80px] h-10 text-[13px] font-bold rounded-md">
                    <SelectValue placeholder="40" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="40">40</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading && !loadingMore ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {products.length > 0 ? (
                    products.map((product) => (
                      <DetailedProductCard key={product.id} product={product} />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                      <h2 className="text-xl font-bold mb-2">No products found</h2>
                      <p className="text-muted-foreground mb-8">We couldn't find any products matching your selection.</p>
                      <button 
                        onClick={() => {setSortBy('new'); setDiscountedOnly(false);}} 
                        className="text-primary font-black hover:underline uppercase tracking-widest text-xs"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>

                {nextCursor && (
                  <div className="mt-10 flex justify-center">
                    <Button 
                      onClick={handleLoadMore} 
                      disabled={loadingMore}
                      variant="outline"
                      className="min-w-[220px] h-14 font-black uppercase tracking-widest border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all rounded-xl"
                    >
                      {loadingMore ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...</>
                      ) : (
                        "Load More Products"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
