"use client";

import { useState, useEffect, useCallback, use } from 'react';
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
  X,
  Plus,
  Trash2,
  RefreshCw,
  Layout
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Product {
  id: number;
  name: string;
  slug: string;
  primary_image: string | null;
  price_data: {
    final_price: string;
    original_price: string;
  };
}

interface Section {
  id: number;
  title: string;
  priority: number;
  products: Product[];
}

export default function SectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  // Data State
  const [section, setSection] = useState<Section | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  
  // Form State
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('0');
  
  // UI Status
  const [isLoading, setIsLoading] = useState(true);
  const [isPatching, setIsPatching] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [detailRes, productsRes] = await Promise.all([
        fetch(API_ENDPOINTS.getSectionDetail(id), { headers }),
        fetch(API_ENDPOINTS.PRODUCTS, { headers })
      ]);

      if (!detailRes.ok) throw new Error('Section intelligence unreachable.');
      
      const detailData = await detailRes.json();
      const productsData = await productsRes.json();

      setSection(detailData);
      setTitle(detailData.title);
      setPriority(detailData.priority.toString());
      
      const inventory = productsData.results || (Array.isArray(productsData) ? productsData : []);
      setAllProducts(inventory);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePatch = async (action: 'metadata' | 'add' | 'remove', productIds?: number[]) => {
    if (!section) return;

    setIsPatching(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const payload: any = {};

      if (action === 'metadata') {
        payload.title = title;
        payload.priority = parseInt(priority) || 0;
      } else {
        payload.action = action;
        payload.product_ids = productIds;
      }

      const response = await fetch(API_ENDPOINTS.UPDATE_SECTION(section.id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Registry update failed.');
      }

      toast({
        title: 'Registry Updated',
        description: data.message || 'Section parameters have been successfully synchronized.',
      });

      if (action !== 'metadata') {
        // Refresh local data to reflect new product associations
        fetchData();
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message
      });
    } finally {
      setIsPatching(false);
    }
  };

  const filteredInventory = allProducts.filter(p => 
    p.name.toLowerCase().includes(inventorySearch.toLowerCase()) &&
    !section?.products.some(sp => sp.id === p.id)
  );

  if (isLoading) {
    return (
      <div className="py-40 flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link href="/dashboard/sections">
            <Button variant="ghost" size="sm" className="pl-0 gap-2 hover:bg-transparent text-primary font-bold">
              <ChevronLeft className="h-4 w-4" />
              Back to Sections
            </Button>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {section?.title || 'Section Intelligence'}
          </h1>
          <p className="text-muted-foreground font-medium">Manage curation metadata and high-fidelity product mappings.</p>
        </div>
        <div className="bg-slate-900 rounded-2xl p-4 text-white flex items-center gap-6 shadow-2xl border border-white/10 px-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Priority</span>
            <span className="text-2xl font-black text-primary">P{section?.priority}</span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Linked Units</span>
            <span className="text-2xl font-black">{section?.products.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Metadata & Current Products */}
        <div className="lg:col-span-7 space-y-10">
          <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <Layout className="w-6 h-6 text-primary" />
                Metadata Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Display Title</Label>
                  <Input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 text-md font-bold bg-slate-50/50 focus:bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Priority</Label>
                  <Input 
                    type="number"
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value)}
                    className="h-12 text-md font-black text-center border-slate-200"
                  />
                </div>
              </div>
              <Button 
                onClick={() => handlePatch('metadata')}
                className="w-full h-12 font-black shadow-lg bg-primary hover:bg-primary/90"
                disabled={isPatching}
              >
                {isPatching ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Synchronize Metadata
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                Linked Products
              </CardTitle>
              <Badge variant="outline" className="font-black bg-white">{section?.products.length} Items</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {section?.products.length === 0 ? (
                  <div className="py-24 text-center text-slate-300 italic font-medium">No products linked to this curation.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {section?.products.map((p) => (
                      <div key={p.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden border">
                            {p.primary_image ? (
                              <img src={p.primary_image} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 m-auto text-slate-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">{p.name}</p>
                            <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mt-1">৳{parseFloat(p.price_data.final_price).toLocaleString()}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-300 hover:text-destructive hover:bg-destructive/5 transition-all"
                          onClick={() => handlePatch('remove', [p.id])}
                          disabled={isPatching}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Global Inventory for Adding */}
        <div className="lg:col-span-5 space-y-10">
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden h-full flex flex-col min-h-[600px]">
            <CardHeader className="bg-white/5 border-b p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <Plus className="w-6 h-6 text-primary" />
                Expand Curation
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium">Discover items to link from global inventory.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 flex-1 flex flex-col gap-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input 
                  placeholder="Search catalog..." 
                  className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:ring-primary focus:border-primary"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                />
              </div>

              <ScrollArea className="flex-1 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="space-y-4">
                  {filteredInventory.length === 0 ? (
                    <div className="py-20 text-center text-slate-500 italic">No available products found.</div>
                  ) : filteredInventory.map((p) => (
                    <div 
                      key={p.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded bg-white/10 overflow-hidden">
                          {p.primary_image ? (
                            <img src={p.primary_image} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 m-auto text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate pr-4">{p.name}</p>
                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Available</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 shadow-lg p-0"
                        onClick={() => handlePatch('add', [p.id])}
                        disabled={isPatching}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="bg-white/5 border-t border-white/5 p-6 flex items-center gap-3">
              <Info className="w-5 h-5 text-primary" />
              <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                Adding items will immediately trigger a storefront refresh for the regional market.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
