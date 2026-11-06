"use client";

import { useState, useEffect, useCallback, use } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Search, 
  Loader2, 
  Package, 
  Tag, 
  ArrowUpRight, 
  Calendar, 
  Filter, 
  SortAsc,
  Layers,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PriceData {
  original_price: string;
  final_price: string;
  discount_percent: number;
  discount_value: string;
  is_discounted: boolean;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  primary_image: string | null;
  price_data: PriceData;
}

interface Discount {
  id: number;
  name: string;
  discount_type: string;
  value: string;
  scope: string;
  image_url: string | null;
  start_date: string;
  end_date: string;
  priority: number;
}

export default function DiscountCardProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("new");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Endpoint 10: Products for a Discount (Public)
      const url = new URL(API_ENDPOINTS.getDiscountCardProducts(id));
      if (searchTerm) url.searchParams.append('search', searchTerm);
      url.searchParams.append('sort', sortBy);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch promotional inventory.');
      
      const data = await response.json();
      setDiscount(data.discount);
      setProducts(data.products || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, searchTerm, sortBy, toast]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [fetchData]);

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-4">
          <Link href="/dashboard/discounts/cards">
            <Button variant="ghost" size="sm" className="pl-0 gap-2 hover:bg-transparent text-primary font-bold">
              <ChevronLeft className="h-4 w-4" />
              Back to Cards
            </Button>
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              {discount?.name || 'Campaign Intelligence'}
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              Detailed breakdown of items qualifying for the <span className="text-primary font-black">{discount?.discount_type === 'percentage' ? `${discount?.value}%` : `৳${discount?.value}`} OFF</span> promotion.
            </p>
          </div>
        </div>
        
        {discount && (
          <div className="bg-slate-900 rounded-2xl p-6 text-white min-w-[280px] shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 blur-2xl rounded-full -mr-12 -mt-12" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/20 text-primary border-none font-black text-[9px] uppercase tracking-widest">Active Campaign</Badge>
                <span className="text-[10px] font-black uppercase text-slate-400">P{discount.priority}</span>
              </div>
              <div className="flex items-end justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-3xl font-black">
                    {discount.discount_type === 'percentage' ? `${parseFloat(discount.value)}%` : `৳${parseFloat(discount.value)}`}
                  </p>
                  <p className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Mapping: {discount.scope}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Registry ID</p>
                  <p className="font-mono font-bold text-sm text-primary">#{discount.id}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50/50 border-b p-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <Input 
                placeholder="Search qualifying items..." 
                className="pl-12 h-12 bg-white border-slate-200 shadow-sm text-md font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 flex-1 lg:flex-none">
                <SortAsc className="w-4 h-4 text-slate-400 shrink-0" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-12 w-full lg:w-[220px] bg-white border-slate-200 font-bold">
                    <SelectValue placeholder="Sort Results" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new" className="font-bold">Newest Arrivals</SelectItem>
                    <SelectItem value="price_low_to_high" className="font-bold">Price: Low to High</SelectItem>
                    <SelectItem value="price_high_to_low" className="font-bold">Price: High to Low</SelectItem>
                    <SelectItem value="name_a_to_z" className="font-bold">Alphabetical (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-white border rounded-xl h-12 px-4 flex items-center gap-2 shrink-0">
                <Package className="w-4 h-4 text-primary" />
                <span className="font-black text-slate-700">{products.length}</span>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-tight">Units Found</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-40 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-ping" />
                <Loader2 className="h-12 w-12 text-primary relative animate-spin" />
              </div>
              <p className="text-sm font-bold text-slate-400 tracking-widest uppercase animate-pulse mt-4">Syncing Inventory Registry...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-40 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/20">
              <div className="bg-white p-6 rounded-full shadow-inner border border-slate-100">
                <Package className="w-12 h-12 text-slate-200" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-600">No qualifying products</h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto font-medium">Try adjusting your filters or verify the {discount?.scope} assignments in the Mapping Hub.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-x divide-y divide-slate-100">
              {products.map((product) => (
                <div key={product.id} className="group p-8 hover:bg-slate-50/50 transition-colors relative">
                  <div className="aspect-square rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm mb-6 flex items-center justify-center p-4 relative">
                    {product.primary_image ? (
                      <img src={product.primary_image} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Package className="w-16 h-16 text-slate-100" />
                    )}
                    <Badge className="absolute top-4 right-4 bg-primary text-white border-none shadow-md font-black text-[9px] px-2 py-0.5">
                      -{product.price_data.discount_percent}%
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">SKU: PROD-{product.id}</p>
                      <h4 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[3rem]">
                        {product.name}
                      </h4>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-900">৳{parseFloat(product.price_data.final_price).toLocaleString()}</span>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px]">SAVE ৳{parseFloat(product.price_data.discount_value).toLocaleString()}</Badge>
                      </div>
                      <span className="text-xs text-slate-400 font-bold line-through tracking-tighter">
                        Was ৳{parseFloat(product.price_data.original_price).toLocaleString()}
                      </span>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <Link href={`/dashboard/products/${product.slug}`}>
                        <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest h-8 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          Edit Catalog
                        </Button>
                      </Link>
                      <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-center gap-3 text-slate-400">
        <Layers className="w-4 h-4" />
        <p className="text-xs font-bold uppercase tracking-[0.2em]">End of Promotional Inventory</p>
      </div>
    </div>
  );
}
