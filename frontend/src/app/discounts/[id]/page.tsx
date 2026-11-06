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
import { ChevronRight, Loader2 } from 'lucide-react';
import { BASE_URL } from '@/lib/constants';
import { Product } from '@/data/mockData';
import { Skeleton } from '@/components/ui/skeleton';

export default function DiscountProductsPage() {
  const params = useParams();
  const router = useRouter();
  const discountId = params.id as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [discountInfo, setDiscountInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<string>('new');

  const fetchDiscountData = useCallback(async () => {
    if (!discountId) return;

    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${BASE_URL}/api/discount/cards/${discountId}/products/`);
      if (sortBy) url.searchParams.append('sort', sortBy);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Promotion not found');
        throw new Error('Failed to fetch promotional products');
      }
      
      const data = await response.json();
      setDiscountInfo(data.discount);

      const mapped = (data.products || []).map((p: any) => ({
        id: p.slug,
        name: p.name,
        price: parseFloat(p.price_data.final_price),
        originalPrice: parseFloat(p.price_data.original_price),
        image: p.primary_image || 'https://placehold.co/400x400?text=No+Image',
        category: data.discount?.name || 'Offer',
        rating: p.rating || 0,
        reviews: p.reviews || 0,
        discountAmount: p.price_data.discount_value,
        discountPercent: p.price_data.discount_percent,
        soldCount: p.sold_count
      }));

      setProducts(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [discountId, sortBy]);

  useEffect(() => {
    fetchDiscountData();
  }, [fetchDiscountData]);

  const displayTitle = discountInfo?.name || 'Special Offers';

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 lg:px-12 xl:px-24 py-6">
        <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-6">
          <button onClick={() => router.push('/')} className="hover:text-primary">Home</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">Offers</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">{displayTitle}</span>
        </nav>

        <div className="flex gap-6 relative">
          <aside className={`
            lg:w-[240px] flex-shrink-0 bg-white border border-gray-200 p-5 hidden lg:block rounded-lg shadow-sm
          `}>
            <div className="mb-8">
              <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-100">
                Offer Details
              </h3>
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                <p className="text-[13px] font-bold text-primary leading-tight">
                  {discountInfo?.name}
                </p>
                <p className="text-[11px] text-gray-500 mt-2 font-medium">
                  {discountInfo?.discount_type === 'percentage' 
                    ? `Save ${discountInfo?.value}% on selected items.` 
                    : `Flat Tk ${discountInfo?.value} off.`}
                </p>
              </div>
            </div>
          </aside>

          <div className="flex-grow pb-20">
            <div className="bg-white border border-gray-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">{displayTitle}</h1>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest">{products.length} Items</span>
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

            {loading ? (
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
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {products.length > 0 ? (
                  products.map((product) => (
                    <DetailedProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold mb-2">No products found</h2>
                    <p className="text-muted-foreground mb-8">We couldn't find any products in this selection at the moment.</p>
                    <button onClick={() => router.push('/')} className="text-primary font-black hover:underline uppercase tracking-widest text-xs">
                      Continue Shopping
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
