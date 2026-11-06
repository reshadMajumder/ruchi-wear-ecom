'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { CategorySection } from '@/components/CategorySection';
import { HeroSection } from '@/components/HeroSection';
import { TrustBadges } from '@/components/TrustBadges';
import { DynamicProductSection } from '@/components/DynamicProductSection';
import { ProductGrid } from '@/components/ProductGrid';
import { Footer } from '@/components/Footer';
import { BASE_URL } from '@/lib/constants';
import { Product } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface ApiSection {
  id: number;
  title: string;
  priority: number;
  products: any[];
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [sections, setSections] = useState<ApiSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSections() {
      try {
        setSectionsLoading(true);
        const response = await fetch(`${BASE_URL}/api/products/sections/`);
        if (response.ok) {
          const data = await response.json();
          setSections(data.sort((a: ApiSection, b: ApiSection) => b.priority - a.priority));
        }
      } catch (e) {
        // Silent catch
      } finally {
        setSectionsLoading(false);
      }
    }
    fetchSections();
  }, []);

  const fetchProducts = useCallback(async (url: string, isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      const mapped = (data.results || []).map((p: any) => ({
        id: p.slug,
        name: p.name,
        price: p.price_data.final_price,
        originalPrice: p.price_data.original_price,
        image: p.primary_image || 'https://placehold.co/400x400?text=No+Image',
        category: 'Product',
        rating: p.rating || 0,
        reviews: p.reviews || 0,
        discountAmount: p.price_data.discount_value,
        discountPercent: p.price_data.discount_percent,
        soldCount: p.sold_count
      }));

      setProducts(prev => isLoadMore ? [...prev, ...mapped] : mapped);
      setNextCursor(data.next);
    } catch (error) {
      // Handled by UI
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const initialUrl = `${BASE_URL}/api/products/?search=${encodeURIComponent(searchQuery)}`;
      fetchProducts(initialUrl);
    } else {
      setProducts([]);
      setNextCursor(null);
      setLoading(false);
    }
  }, [searchQuery, fetchProducts]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      fetchProducts(nextCursor, true);
    }
  }, [nextCursor, fetchProducts]);

  const onSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const renderedSections = useMemo(() => {
    return sections.map((section) => (
      <DynamicProductSection key={section.id} section={section} />
    ));
  }, [sections]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={onSearch} />

      <main className="flex-grow" role="main">
        <h1 className="sr-only">AdurysGallery - Best Online Shopping for Electronics, Fashion and Home</h1>

        {!searchQuery && <CategorySection />}

        {!searchQuery && (
          <>
            <HeroSection />
            
            {sectionsLoading ? (
              <div className="container mx-auto px-4 lg:px-12 xl:px-24 py-8 space-y-12">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, j) => (
                        <Skeleton key={j} className="aspect-[3/4] rounded-lg" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <section aria-label="Featured Product Sections">
                {renderedSections}
              </section>
            )}
          </>
        )}

        <div className="bg-background pb-20">
          {searchQuery && (
            <article>
              {loading && !loadingMore ? (
                <div className="container mx-auto px-4 lg:px-12 xl:px-24 py-8">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <ProductGrid 
                    title={`Search Results for "${searchQuery}"`} 
                    products={products} 
                  />
                  
                  {nextCursor && (
                    <div className="container mx-auto px-4 lg:px-12 xl:px-24 flex justify-center mt-4">
                      <Button 
                        onClick={handleLoadMore} 
                        disabled={loadingMore}
                        variant="outline"
                        className="min-w-[200px] h-12 font-bold border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                        suppressHydrationWarning
                      >
                        {loadingMore ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Loading...</>
                        ) : (
                          "Load More Results"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </article>
          )}
          
          {!searchQuery && (
            <aside aria-label="Additional Information">
              <div className="mt-12">
                <TrustBadges />
              </div>
            </aside>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
