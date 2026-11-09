"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  LayoutGrid, 
  Search, 
  Package, 
  CheckCircle2, 
  Info,
  Layers,
  X,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: number;
  name: string;
  slug: string;
  primary_image: string | null;
  price_data: {
    final_price: number;
    original_price: number;
  };
}

export default function CreateSectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Form State
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('0');
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  
  // Inventory State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  
  // UI Status
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCTS);
      if (!response.ok) throw new Error('Inventory registry unavailable.');
      const data = await response.json();
      // Handle potential paginated response
      const items = data.results || (Array.isArray(data) ? data : []);
      setProducts(items);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Inventory Sync Error',
        description: err.message
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title Required',
        description: 'Storefront sections must have a descriptive title.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const payload = {
        title,
        priority: parseInt(priority) || 0,
        product_ids: selectedProductIds
      };

      const response = await fetch(API_ENDPOINTS.CREATE_SECTION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create storefront section.');
      }

      toast({
        title: 'Section Created',
        description: `"${title}" has been successfully added to the storefront layout.`,
      });

      router.push('/dashboard/sections');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/sections">
          <Button variant="ghost" size="sm" className="pl-0 gap-2 hover:bg-transparent text-primary font-bold">
            <ChevronLeft className="h-4 w-4" />
            Back to Registry
          </Button>
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <LayoutGrid className="text-primary h-10 w-10" />
          Create Storefront Section
        </h1>
        <p className="text-lg text-muted-foreground">Curate high-impact product groups for featured placement.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Configuration Column */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-xl">Section Parameters</CardTitle>
              <CardDescription>Core settings for the curation block.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-bold">Display Title *</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Best Sellers 2024" 
                  className="h-12 border-slate-200" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-bold">Rendering Priority</Label>
                <Input 
                  id="priority" 
                  type="number" 
                  placeholder="0" 
                  className="h-12 border-slate-200" 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
                  Higher values display first on storefront.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5 text-primary" />
                Ingestion Hub
              </CardTitle>
              <CardDescription className="text-slate-400">Save and deploy configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Products Linked</span>
                  <span className="font-bold text-emerald-400">{selectedProductIds.length} Selected</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Deployment</span>
                  <span className="font-bold">Immediate</span>
                </div>
              </div>
              <Button 
                type="submit"
                className="w-full h-12 font-black text-md shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Synchronizing...
                  </>
                ) : "Publish Section"}
              </Button>
            </CardContent>
            <CardFooter className="bg-white/5 border-t border-white/10 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400">
                <Info className="w-3.5 h-3.5" />
                Products will only appear if active and in stock.
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Product Curation Column */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Package className="w-6 h-6 text-primary" />
                  Product Inventory
                </CardTitle>
                <CardDescription>Select items to include in this curation.</CardDescription>
              </div>
              {selectedProductIds.length > 0 && (
                <Badge className="bg-primary text-white border-none font-black px-4 py-1">
                  {selectedProductIds.length} Selected
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-8 flex-1">
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input 
                    placeholder="Search global inventory by name..." 
                    className="pl-11 h-12 bg-slate-50 border-slate-200 text-md font-medium"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>

                <ScrollArea className="h-[500px] rounded-2xl border bg-slate-50/30 p-4">
                  {isLoadingProducts ? (
                    <div className="py-20 flex flex-col items-center gap-4 text-slate-300">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Catalog...</span>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 italic">No products found matching query.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredProducts.map((p) => (
                        <div 
                          key={p.id} 
                          onClick={() => toggleProductSelection(p.id)}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
                            selectedProductIds.includes(p.id) 
                              ? "bg-white border-primary shadow-lg ring-2 ring-primary/5" 
                              : "bg-white border-slate-100 hover:border-primary/30"
                          )}
                        >
                          <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border">
                            {p.primary_image ? (
                              <img src={p.primary_image} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 m-auto text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                            <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mt-1">৳{p.price_data.final_price.toLocaleString()}</p>
                          </div>
                          {selectedProductIds.includes(p.id) ? (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-100 group-hover:border-primary/20" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
