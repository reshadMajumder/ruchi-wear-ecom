'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Star, Truck, ShieldCheck, RotateCcw, Loader2, ChevronRight, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BASE_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { DetailedProductCard } from '@/components/DetailedProductCard';
import { Product } from '@/data/mockData';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { tracker } from '@/lib/tracking';

interface Attribute {
  attribute: string;
  value: string;
}

interface Variant {
  id: number;
  sku: string;
  stock: number;
  attributes: Attribute[];
}

interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  selling_price: string;
  images: Array<{
    id: number;
    image_url: string;
    is_primary: boolean;
  }>;
  price_data: {
    original_price: number;
    final_price: number;
    discount_percent: number;
    discount_value: number;
    is_discounted: boolean;
  };
  variants: Variant[];
  rating?: number;
  reviews?: number;
}

export default function ProductDetailsPage() {
  const params = useParams();
  const slug = params.id as string;
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProductDetails() {
      try {
        setLoading(true);
        const response = await fetch(`${BASE_URL}/api/products/${slug}/`);
        if (!response.ok) {
          if (response.status === 404) throw new Error('Product not found');
          throw new Error('Failed to fetch product details');
        }
        const data = await response.json();
        setProduct(data);
        const primary = data.images.find((img: any) => img.is_primary)?.image_url || data.images[0]?.image_url;
        setSelectedImage(primary);
        
        // Track product view - wrapped in try-catch to ensure zero UI impact
        try { tracker.trackProductView(data.id, data.name); } catch (e) {}
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchProductDetails();
  }, [slug]);

  useEffect(() => {
    async function fetchRelatedProducts() {
      try {
        const response = await fetch(`${BASE_URL}/api/products/related/${slug}/`);
        if (response.ok) {
          const data = await response.json();
          const rawItems = Array.isArray(data) ? data : data.results || [];
          
          if (Array.isArray(rawItems)) {
            const mapped = rawItems.map((p: any) => ({
              id: p.slug,
              name: p.name,
              price: parseFloat(p.price_data?.final_price || '0'),
              originalPrice: parseFloat(p.price_data?.original_price || '0'),
              image: p.primary_image || 'https://placehold.co/400x400?text=No+Image',
              category: 'Related',
              rating: p.rating || 0,
              reviews: p.reviews || 0,
              discountAmount: p.price_data?.discount_value,
              discountPercent: p.price_data?.discount_percent,
              soldCount: p.sold_count
            }));
            setRelatedProducts(mapped);
          }
        }
      } catch (err) {
        // Silent fail for related products
      }
    }
    if (slug) fetchRelatedProducts();
  }, [slug]);

  const attributesMap = useMemo(() => {
    if (!product) return {};
    const map: Record<string, Set<string>> = {};
    product.variants.forEach(variant => {
      variant.attributes.forEach(attr => {
        if (!map[attr.attribute]) map[attr.attribute] = new Set();
        map[attr.attribute].add(attr.value);
      });
    });
    return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, Array.from(value)]));
  }, [product]);

  const attributeNames = useMemo(() => Object.keys(attributesMap), [attributesMap]);

  const currentVariant = useMemo(() => {
    if (!product || Object.keys(selections).length !== attributeNames.length) return null;
    return product.variants.find(variant => 
      attributeNames.every(name => 
        variant.attributes.some(a => a.attribute === name && a.value === selections[name])
      )
    );
  }, [product, attributeNames, selections]);

  const handleSelect = (attrName: string, attrValue: string) => {
    setSelections(prev => ({ ...prev, [attrName]: attrValue }));
  };

  const handleAddToCart = () => {
    if (!product || !currentVariant) return;
    const variantName = currentVariant.attributes.map(a => a.value).join(' / ');
    addToCart({
      id: product.slug,
      name: product.name,
      variant_id: currentVariant.id,
      variant_name: variantName,
      price: product.price_data.final_price,
      image: product.images.find(img => img.is_primary)?.image_url || product.images[0]?.image_url || '',
      quantity: quantity
    });
    
    // Track add to cart - wrapped in try-catch to ensure zero UI impact
    try { tracker.trackAddToCart(product.id, quantity); } catch (e) {}
    
    toast({ title: "Added to cart", description: `${quantity}x ${product.name} (${variantName}) added.` });
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]"><Header />
      <main className="flex-grow container mx-auto px-4 lg:px-12 xl:px-24 py-8"><Skeleton className="h-[600px] w-full rounded-xl" /></main>
    <Footer /></div>
  );

  if (error || !product) return (
    <div className="min-h-screen flex flex-col"><Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="text-center"><h1 className="text-2xl font-bold mb-4">{error || "Product Not Found"}</h1><Link href="/"><Button suppressHydrationWarning>Return to Shop</Button></Link></div>
      </main>
    <Footer /></div>
  );

  const displayImage = selectedImage || product.images[0]?.image_url;
  const allSelected = Object.keys(selections).length === attributeNames.length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Header />
      <main className="flex-grow pb-20">
        <div className="container mx-auto px-4 lg:px-12 xl:px-24 py-4 md:py-6">
          <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-6">
            <Link href="/" className="hover:text-primary">Home</Link><ChevronRight className="w-3 h-3" />
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
          </nav>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
            {/* Left: Product Images */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative aspect-square shadow-sm isolate">
                <Image src={displayImage || ''} alt={product.name} fill className="object-contain p-8" priority />
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar h-[88px]">
                {product.images.map((img) => (
                  <button 
                    key={img.id} 
                    onClick={() => setSelectedImage(img.image_url)} 
                    className={cn(
                      "w-20 h-20 flex-shrink-0 border-2 rounded-lg bg-white overflow-hidden relative transition-all", 
                      selectedImage === img.image_url ? "border-primary ring-2 ring-primary/20" : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <Image 
                      src={img.image_url} 
                      alt={product.name} 
                      fill 
                      className="object-contain p-1" 
                    />
                  </button>
                ))}
              </div>
            </div>
            
            {/* Right: Product Actions */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">{product.name}</h1>
                  <div className="flex items-center gap-4">
                    {/* <div className="flex text-orange-400"><Star className="h-4 w-4 fill-current" /> <span className="text-xs font-bold text-gray-600 ml-1">4.0</span></div> */}
                    <Badge variant="outline" className={cn("font-bold", allSelected ? (currentVariant && currentVariant.stock > 0 ? "text-green-600" : "text-red-600") : "text-gray-400")}>
                      {!allSelected ? 'SELECT VARIANT' : (currentVariant && currentVariant.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK')}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-gray-900">Tk {product.price_data.final_price.toLocaleString()}</span>
                  {product.price_data.is_discounted && <span className="text-lg text-gray-400 line-through">Tk {product.price_data.original_price.toLocaleString()}</span>}
                </div>

                {attributeNames.map(attrName => (
                  <div key={attrName} className="space-y-2">
                    <p className="text-xs font-black text-gray-900 uppercase">Select {attrName}</p>
                    <div className="flex flex-wrap gap-2">
                      {attributesMap[attrName].map(val => (
                        <button key={val} onClick={() => handleSelect(attrName, val)} className={cn("px-4 py-2 text-xs border-2 rounded-xl font-bold transition-all", selections[attrName] === val ? "border-primary bg-primary/5 text-primary" : "border-gray-200 bg-white text-gray-700")}>{val}</button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-4 pt-4">
                  <div className="flex items-center border border-gray-200 bg-white h-11 rounded-sm">
                    <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="w-10 h-full border-r text-gray-500"><Minus className="w-4 h-4 mx-auto" /></button>
                    <div className="w-10 text-center font-bold">{quantity}</div>
                    <button onClick={() => setQuantity(q => q+1)} className="w-10 h-full border-l text-gray-500"><Plus className="w-4 h-4 mx-auto" /></button>
                  </div>
                  <Button onClick={handleAddToCart} disabled={!allSelected || (currentVariant?.stock ?? 0) <= 0} className="h-11 px-8 bg-primary hover:bg-primary/90 rounded-md font-bold" suppressHydrationWarning>Add to cart</Button>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-6 border-t">
                  <div className="flex flex-col items-center text-center"><Truck className="h-6 w-6 text-primary mb-1" /><span className="text-[10px] font-bold">FAST DELIVERY</span></div>
                  <div className="flex flex-col items-center text-center"><ShieldCheck className="h-6 w-6 text-green-600 mb-1" /><span className="text-[10px] font-bold">AUTHENTIC</span></div>
                  <div className="flex flex-col items-center text-center"><RotateCcw className="h-6 w-6 text-orange-600 mb-1" /><span className="text-[10px] font-bold">7 DAYS RETURN</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Description and Specifications Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-16">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full justify-start rounded-none h-auto bg-gray-50 border-b p-0 px-6 md:px-8">
                <TabsTrigger value="description" className="py-5 px-6 font-bold uppercase text-[11px] tracking-widest data-[state=active]:bg-white data-[state=active]:border-x data-[state=active]:border-t border-gray-200 -mb-px transition-all">Description</TabsTrigger>
                <TabsTrigger value="specifications" className="py-5 px-6 font-bold uppercase text-[11px] tracking-widest data-[state=active]:bg-white data-[state=active]:border-x data-[state=active]:border-t border-gray-200 -mb-px transition-all">Specifications</TabsTrigger>
              </TabsList>
              
              <div className="p-6 md:p-10">
                <TabsContent value="description" className="mt-0 outline-none">
                  <div 
                    className="text-base text-gray-700 leading-relaxed break-words whitespace-normal overflow-hidden max-w-full 
                               [&_p]:mb-6 [&_p:last-child]:mb-0 
                               [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-8 [&_img]:mx-auto
                               [&_table]:w-full [&_table]:overflow-x-auto [&_table]:block md:[&_table]:table [&_table]:border-collapse [&_table]:my-8
                               [&_td]:border [&_td]:p-3 [&_td]:border-gray-200 [&_th]:border [&_th]:p-3 [&_th]:bg-gray-50 [&_th]:text-left [&_th]:border-gray-200
                               [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-6
                               [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-3
                               [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80 transition-colors" 
                    dangerouslySetInnerHTML={{ __html: product.description }} 
                  />
                </TabsContent>
                
                <TabsContent value="specifications" className="mt-0 outline-none">
                  <div className="max-w-4xl">
                    <table className="w-full text-sm border-collapse">
                      <tbody className="divide-y divide-gray-100">
                        {currentVariant ? currentVariant.attributes.map((a, i) => (
                          <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 font-bold w-1/3 uppercase text-[11px] text-gray-500 tracking-wider">{a.attribute}</td>
                            <td className="py-4 text-gray-900 font-medium">{a.value}</td>
                          </tr>
                        )) : Object.entries(attributesMap).map(([k, v], i) => (
                          <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 font-bold w-1/3 uppercase text-[11px] text-gray-500 tracking-wider">{k}</td>
                            <td className="py-4 text-gray-900 font-medium">{v.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Related Products Section */}
          {relatedProducts.length > 0 && (
            <section className="mt-8 border-t pt-16 overflow-visible">
              <div className="flex flex-col gap-1 mb-8">
                <h2 className="text-2xl font-bold text-foreground uppercase tracking-tight">Related Products</h2>
                <div className="h-1 w-12 bg-accent rounded-full"></div>
              </div>
              
              <div className="relative px-2 md:px-0">
                <Carousel
                  opts={{
                    align: "start",
                    loop: false,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {relatedProducts.map((item) => (
                      <CarouselItem key={item.id} className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                        <DetailedProductCard product={item} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="hidden md:block">
                    <CarouselPrevious className="-left-12 border-primary text-primary hover:bg-primary hover:text-white" />
                    <CarouselNext className="-right-12 border-primary text-primary hover:bg-primary hover:text-white" />
                  </div>
                </Carousel>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
