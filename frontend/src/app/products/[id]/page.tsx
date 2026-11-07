'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ChevronRight, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
              category: '',
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

  useEffect(() => {
    if (!product || product.variants.length === 0) return;
    const chosen = product.variants.find((variant) => variant.stock > 0) || product.variants[0];
    const next: Record<string, string> = {};
    chosen.attributes.forEach((attr) => {
      next[attr.attribute] = attr.value;
    });
    setSelections(next);
    setQuantity(1);
  }, [product]);

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
    
    toast({ title: "Added to cart", description: `${product.name} · ${variantName}` });
  };

  const stock = currentVariant?.stock ?? 0;
  const canAdd = Boolean(currentVariant) && stock > 0;

  if (loading) return (
    <div className="min-h-screen flex flex-col"><Header />
      <main className="flex-grow container mx-auto px-4 lg:px-12 xl:px-24 py-6"><Skeleton className="h-[480px] w-full rounded-xl" /></main>
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
  const off = product.price_data.is_discounted ? Math.round(product.price_data.discount_percent) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow pb-28 md:pb-10">
        <div className="container mx-auto px-4 lg:px-12 xl:px-24 py-4">
          <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate text-gray-900">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gray-100 lg:aspect-[3/4]">
                <Image src={displayImage || ''} alt={product.name} fill className="object-cover" priority />
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {product.images.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImage(img.image_url)}
                      className={cn(
                        "relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-md",
                        selectedImage === img.image_url ? "ring-2 ring-black" : "ring-1 ring-gray-200"
                      )}
                    >
                      <Image src={img.image_url} alt="" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:sticky lg:top-24 space-y-5">
              <div>
                <h1 className="text-2xl font-semibold leading-tight text-gray-950">{product.name}</h1>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">Tk {product.price_data.final_price.toLocaleString()}</span>
                  {product.price_data.is_discounted && (
                    <>
                      <span className="text-sm text-gray-400 line-through">Tk {product.price_data.original_price.toLocaleString()}</span>
                      {off > 0 && <span className="text-sm font-medium">−{off}%</span>}
                    </>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{canAdd ? "In stock" : "Out of stock"}</p>
              </div>

              {attributeNames.map((attrName) => (
                <div key={attrName}>
                  <p className="mb-2 text-sm text-gray-600">
                    {attrName}{selections[attrName] ? ` · ${selections[attrName]}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {attributesMap[attrName].map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          handleSelect(attrName, val);
                          setQuantity(1);
                        }}
                        className={cn(
                          "h-9 min-w-10 rounded-md border px-3 text-sm",
                          selections[attrName] === val
                            ? "border-black bg-black text-white"
                            : "border-gray-200 bg-white text-gray-800 hover:border-gray-400"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="hidden items-center gap-3 md:flex">
                <div className="flex h-11 items-center rounded-md border">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 text-gray-600" aria-label="Decrease quantity"><Minus className="mx-auto h-4 w-4" /></button>
                  <span className="w-8 text-center text-sm">{quantity}</span>
                  <button onClick={() => setQuantity((q) => Math.min(stock || 1, q + 1))} className="w-10 text-gray-600" aria-label="Increase quantity"><Plus className="mx-auto h-4 w-4" /></button>
                </div>
                <Button onClick={handleAddToCart} disabled={!canAdd} className="h-11 flex-1 rounded-md text-sm font-semibold">
                  {canAdd ? "Add to cart" : "Out of stock"}
                </Button>
              </div>

              <p className="text-sm text-gray-500">Delivery in 1–3 days inside Dhaka. 7-day returns.</p>

              {product.description && (
                <div
                  className="border-t pt-4 text-sm leading-relaxed text-gray-700 [&_img]:my-4 [&_img]:max-w-full [&_p]:mb-3 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <section className="mt-10 border-t pt-6">
              <h2 className="mb-3 text-lg font-semibold">You may also like</h2>
              <Carousel opts={{ align: "start" }} className="w-full">
                <CarouselContent className="-ml-3">
                  {relatedProducts.map((item) => (
                    <CarouselItem key={item.id} className="basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/4">
                      <DetailedProductCard product={item} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
            </section>
          )}
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 items-center rounded-md border">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9" aria-label="Decrease quantity"><Minus className="mx-auto h-4 w-4" /></button>
            <span className="w-6 text-center text-sm">{quantity}</span>
            <button onClick={() => setQuantity((q) => Math.min(stock || 1, q + 1))} className="w-9" aria-label="Increase quantity"><Plus className="mx-auto h-4 w-4" /></button>
          </div>
          <Button onClick={handleAddToCart} disabled={!canAdd} className="h-11 flex-1 rounded-md text-sm font-semibold">
            {canAdd ? `Add to cart · Tk ${(product.price_data.final_price * quantity).toLocaleString()}` : "Out of stock"}
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
