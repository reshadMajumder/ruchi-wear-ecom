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
import { ChevronRight, Loader2, Filter, Tag } from 'lucide-react';
import { BASE_URL } from '@/lib/constants';
import { Product } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';

export default function SectionProductsPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.id as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sectionTitle, setSectionTitle] = useState<string>('Section Products');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort States
  const [sortBy, setSortBy] = useState<string>('new');
  const [discountedOnly, setDiscountedOnly] = useState<boolean>(false);

  const buildUrl = useCallback((cursor?: string | null) => {
    const url = new URL(cursor || `${BASE_URL}/api/products/sections/${sectionId}/products/`);
    if (!cursor) {
      if (sortBy) url.searchParams.append('sort', sortBy);
      if (discountedOnly) url.searchParams.append('discounted_only', 'true');
    }
    return url.toString();
  }, [sectionId, sortBy, discountedOnly]);

  const fetchProducts = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const targetUrl = buildUrl(isLoadMore ? nextCursor : null);
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error('Failed to fetch section products');
      
      const data = await response.json();
      const mapped = (data.results || []).map((p: any) => ({
        id: p.slug,
        name: p.name,
        price: parseFloat(p.price_data.final_price),
        originalPrice: parseFloat(p.price_data.original_price),
        image: p.primary_image || 'https://placehold.co/400x400?text=No+Image',
        category: 'Section',
        rating: p.rating || 0,
        reviews: p.reviews || 0,
        discountAmount: p.price_data.discount_value,
        discountPercent: p.price_data.discount_percent,
        soldCount: p.sold_count
      }));

      setProducts(prev => isLoadMore ? [...prev, ...mapped] : mapped);
      setNextCursor(data.next);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildUrl, nextCursor]);

  useEffect(() => {
    async function fetchSectionInfo() {
      try {
        const response = await fetch(`${BASE_URL}/api/products/sections/`);
        if (response.ok) {
          const sections = await response.json();
          const currentSection = sections.find((s: any) => s.id.toString() === sectionId);
          if (currentSection) setSectionTitle(currentSection.title);
        }
      } catch (e) {
        // Handled silently
      }
    }
    
    if (sectionId) {
      fetchSectionInfo();
      fetchProducts();
    }
  }, [sectionId, sortBy, discountedOnly, fetchProducts]);

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchProducts(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 lg:px-12 xl:px-24 py-6">
        <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-6">
          <button onClick={() => router.push('/')} className="hover:text-primary transition-colors">Home</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">Sections</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">{sectionTitle}</span>
        </nav>

        <div className="flex gap-6 relative">
          <aside className="lg:w-[240px] flex-shrink-0 bg-white border border-gray-200 p-5 hidden lg:block h-fit rounded-lg shadow-sm">
            <div className="mb-8">
              <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-100">
                Browse
              </h3>
              <ul className="space-y-3">
                <li className="text-[13px] font-black text-primary border-l-2 border-primary pl-3">All in {sectionTitle}</li>
                <li className="text-[13px] font-bold text-gray-600 hover:text-primary cursor-pointer pl-3 transition-colors">New Arrivals</li>
                <li className="text-[13px] font-bold text-gray-600 hover:text-primary cursor-pointer pl-3 transition-colors">Best Sellers</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-100">
                Quick Filters
              </h3>
              <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => setDiscountedOnly(!discountedOnly)}>
                <Checkbox id="discounted-sec" checked={discountedOnly} onCheckedChange={(val) => setDiscountedOnly(!!val)} />
                <label htmlFor="discounted-sec" className="text-[13px] font-bold text-gray-600 group-hover:text-primary cursor-pointer flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5" />
                  On Sale Only
                </label>
              </div>
            </div>
          </aside>

          <div className="flex-grow pb-20">
            <div className="bg-white border border-gray-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">{sectionTitle}</h1>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest">{products.length} Products Shown</span>
              </div>

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
            </div>

            {loading && !loadingMore ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <div className="py-20 text-center bg-white border border-gray-200 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Oops!</h2>
                <p className="text-muted-foreground mb-8">{error}</p>
                <button onClick={() => router.push('/')} className="text-primary font-bold hover:underline">
                  Back to Home
                </button>
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
                      <p className="text-muted-foreground mb-8">Try adjusting your filters or sort order.</p>
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
