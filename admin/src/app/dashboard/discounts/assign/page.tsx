"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Search, Filter, Layers, Package, Loader2, CheckCircle2, AlertCircle, TrendingDown, Tag, FolderTree, Globe, Trash2, ArrowRight, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Discount {
  id: number;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: string;
  is_active: boolean;
  scope: 'product' | 'category' | 'global';
}

interface Product {
  id: number;
  name: string;
  slug: string;
  primary_image: string | null;
  price_data: {
    final_price: number;
    original_price: number;
    is_discounted: boolean;
  };
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface AssignmentData {
  product_discounts: any[];
  category_discounts: any[];
}

export default function AssignDiscountPage() {
  const { toast } = useToast();
  
  // Data State
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData>({ product_discounts: [], category_discounts: [] });
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection State
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Unassign State
  const [unassignTarget, setUnassignTarget] = useState<{ discountId: number, productId?: number, categoryId?: number, name: string } | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  // Filter State
  const [discountSearch, setDiscountSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [discountRes, productRes, categoryRes, assignRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.DISCOUNT_LIST}?active=true`, { headers }),
        fetch(API_ENDPOINTS.PRODUCTS, { headers }),
        fetch(API_ENDPOINTS.CATEGORIES_ADMIN, { headers }),
        fetch(API_ENDPOINTS.ASSIGN_LIST, { headers })
      ]);

      const [discountData, productData, categoryData, assignData] = await Promise.allSettled([
        discountRes.ok ? discountRes.json() : Promise.reject(new Error('Discount registry unavailable.')),
        productRes.ok ? productRes.json() : Promise.reject(new Error('Product registry unavailable.')),
        categoryRes.ok ? categoryRes.json() : Promise.reject(new Error('Category registry unavailable.')),
        assignRes.ok ? assignRes.json() : Promise.reject(new Error('Assignment registry unavailable.')),
      ]);

      if (discountData.status === 'fulfilled') {
        setDiscounts(Array.isArray(discountData.value) ? discountData.value : []);
      }

      if (productData.status === 'fulfilled') {
        setProducts(Array.isArray(productData.value) ? productData.value : (productData.value.results || []));
      }

      if (categoryData.status === 'fulfilled') {
        setCategories(Array.isArray(categoryData.value) ? categoryData.value : (categoryData.value.results || []));
      }

      if (assignData.status === 'fulfilled') {
        setAssignments({
          product_discounts: assignData.value.product_discounts || [],
          category_discounts: assignData.value.category_discounts || []
        });
      }

      const syncErrors = [discountData, productData, categoryData, assignData]
        .filter((result) => result.status === 'rejected')
        .map((result) => (result as PromiseRejectedResult).reason?.message || 'Unknown sync error');

      if (syncErrors.length > 0) {
        throw new Error(syncErrors.join(' '));
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedDiscount = discounts.find(d => d.id === selectedDiscountId);

  const handleAssign = async () => {
    if (!selectedDiscountId || !selectedDiscount) return;

    const payload: any = { discount_id: selectedDiscountId };
    
    if (selectedDiscount.scope === 'product') {
      if (!selectedProductId) return;
      payload.product_id = selectedProductId;
    } else if (selectedDiscount.scope === 'category') {
      if (!selectedCategoryId) return;
      payload.category_id = selectedCategoryId;
    } else {
      return; 
    }

    setIsAssigning(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.ASSIGN_DISCOUNT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle 400 Bad Request with existing_discount logic
        let message = result.message || 'Failed to map promotion.';
        if (result.existing_discount) {
          message = `${message} (Currently linked to: ${result.existing_discount.name})`;
        }
        throw new Error(message);
      }

      toast({
        title: 'Promotion Assigned',
        description: result.message || `Successfully linked discount logic to target.`,
      });

      setSelectedProductId(null);
      setSelectedCategoryId(null);
      fetchData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Assignment Failed',
        description: err.message
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!unassignTarget) return;

    setIsUnassigning(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const payload: any = { discount_id: unassignTarget.discountId };
      if (unassignTarget.productId) payload.product_id = unassignTarget.productId;
      if (unassignTarget.categoryId) payload.category_id = unassignTarget.categoryId;

      const response = await fetch(API_ENDPOINTS.UNASSIGN_DISCOUNT, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Failed to detach promotion.');
      }

      toast({
        title: 'Promotion Detached',
        description: result.message || 'Successfully removed mapping from registry.',
      });

      setUnassignTarget(null);
      fetchData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Detachment Failed',
        description: err.message
      });
    } finally {
      setIsUnassigning(false);
    }
  };

  const filteredDiscounts = discounts.filter(d => 
    d.name.toLowerCase().includes(discountSearch.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(targetSearch.toLowerCase())
  );

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(targetSearch.toLowerCase())
  );

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          <Link2 className="text-primary h-10 w-10" />
          Promotion Logic
        </h1>
        <p className="text-lg text-muted-foreground font-medium">Map and manage active discounts across your product catalog and taxonomy tree.</p>
      </div>

      <Tabs defaultValue="assign" className="w-full space-y-8">
        <TabsList className="bg-slate-100/50 p-1 rounded-xl h-14 w-fit border shadow-sm">
          <TabsTrigger value="assign" className="px-8 rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary h-full">
            <PlusCircle className="w-4 h-4 mr-2" />
            Mapping Hub
          </TabsTrigger>
          <TabsTrigger value="active" className="px-8 rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary h-full">
            <Layers className="w-4 h-4 mr-2" />
            Active Registry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assign" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Step 1: Select Promotion */}
            <div className="lg:col-span-4">
              <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden h-full flex flex-col">
                <CardHeader className="bg-slate-50/50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tag className="w-5 h-5 text-primary" />
                      1. Choose Promotion
                    </CardTitle>
                    {selectedDiscountId && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">Selected</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4 flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Filter active registry..." 
                      className="pl-9 h-11 bg-slate-50 border-slate-200"
                      value={discountSearch}
                      onChange={(e) => setDiscountSearch(e.target.value)}
                    />
                  </div>
                  
                  <ScrollArea className="h-[450px] pr-4">
                    <div className="space-y-3">
                      {isLoading ? (
                        <div className="py-20 flex flex-col items-center gap-4 text-slate-300">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <span className="text-xs font-bold uppercase tracking-widest">Syncing Registry...</span>
                        </div>
                      ) : filteredDiscounts.map((d) => (
                        <div 
                          key={d.id} 
                          onClick={() => {
                            setSelectedDiscountId(d.id);
                            setSelectedProductId(null);
                            setSelectedCategoryId(null);
                            setTargetSearch("");
                          }}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                            selectedDiscountId === d.id 
                              ? "bg-primary/5 border-primary shadow-sm" 
                              : "bg-white border-slate-100 hover:border-primary/40"
                          )}
                        >
                          <div className="relative z-10">
                            <p className="font-bold text-slate-800">{d.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">{d.discount_type}</p>
                              <span className="text-[10px] text-primary font-bold uppercase tracking-widest">• {d.scope}</span>
                            </div>
                          </div>
                          <div className="text-right relative z-10">
                            <span className={cn(
                              "text-xl font-black transition-transform group-hover:scale-110 block",
                              selectedDiscountId === d.id ? "text-primary" : "text-slate-700"
                            )}>
                              {d.discount_type === 'percentage' ? `${parseFloat(d.value)}%` : `৳${parseFloat(d.value)}`}
                            </span>
                          </div>
                          {selectedDiscountId === d.id && (
                            <div className="absolute top-0 right-0 p-1">
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Step 2: Define Targets */}
            <div className="lg:col-span-8">
              <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden flex flex-col h-full">
                <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {selectedDiscount?.scope === 'category' ? <FolderTree className="w-5 h-5 text-primary" /> : <Package className="w-5 h-5 text-primary" />}
                      2. Define Targets
                    </CardTitle>
                    <CardDescription>
                      {selectedDiscount 
                        ? `Assigning to ${selectedDiscount.scope === 'product' ? 'specific products' : 'categories'}.`
                        : 'Select a promotion to determine the assignment scope.'}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-8 flex-1">
                  {!selectedDiscount ? (
                    <div className="h-full flex flex-col items-center justify-center gap-6 p-12 border-2 border-dashed rounded-3xl bg-slate-50/50">
                      <div className="bg-white p-6 rounded-full shadow-md text-slate-200">
                        <Tag className="w-10 h-10" />
                      </div>
                      <div className="text-center space-y-2">
                        <h4 className="text-xl font-bold text-slate-700">Choose a Promotion First</h4>
                        <p className="text-sm text-slate-400 max-w-[250px] mx-auto font-medium">We'll show you the right targets once you pick a campaign from the left.</p>
                      </div>
                    </div>
                  ) : selectedDiscount.scope === 'global' ? (
                    <div className="h-full flex flex-col items-center justify-center gap-6 p-12 border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5">
                      <div className="bg-white p-6 rounded-full shadow-md text-primary">
                        <Globe className="w-10 h-10" />
                      </div>
                      <div className="text-center space-y-3">
                        <h4 className="text-2xl font-black text-primary uppercase tracking-tight">Global Promotion Active</h4>
                        <p className="text-sm text-slate-600 max-w-md mx-auto font-medium leading-relaxed">
                          <strong>"{selectedDiscount.name}"</strong> has a global scope. It is already being applied to the entire catalog automatically. Manual assignment is not required for this campaign.
                        </p>
                        <Badge variant="outline" className="mt-4 bg-white border-primary/20 text-primary font-bold">System Managed</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder={selectedDiscount.scope === 'product' ? "Search products..." : "Search categories..."} 
                            className="pl-9 h-11 bg-slate-50 border-slate-200"
                            value={targetSearch}
                            onChange={(e) => setTargetSearch(e.target.value)}
                          />
                        </div>
                        <ScrollArea className="h-[450px] pr-4 border rounded-xl p-2 bg-slate-50/30">
                          <div className="space-y-2">
                            {isLoading ? (
                              <div className="py-20 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                              </div>
                            ) : selectedDiscount.scope === 'product' ? (
                              filteredProducts.map((p) => (
                                <div 
                                  key={p.id} 
                                  onClick={() => setSelectedProductId(p.id)}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                    selectedProductId === p.id 
                                      ? "bg-white border-primary shadow-md ring-2 ring-primary/5" 
                                      : "bg-white border-slate-100 hover:border-slate-300"
                                  )}
                                >
                                  <div className="h-10 w-10 rounded bg-slate-100 overflow-hidden flex-shrink-0 border">
                                    {p.primary_image ? (
                                      <img src={p.primary_image} alt={p.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <Package className="w-5 h-5 m-auto text-slate-300" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-primary">৳{p.price_data.final_price.toLocaleString()}</span>
                                      {p.price_data.is_discounted && (
                                        <Badge variant="outline" className="text-[8px] h-3.5 bg-emerald-50 text-emerald-700 px-1 font-bold">SALE</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              filteredCategories.map((c) => (
                                <div 
                                  key={c.id} 
                                  onClick={() => setSelectedCategoryId(c.id)}
                                  className={cn(
                                    "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                                    selectedCategoryId === c.id 
                                      ? "bg-white border-primary shadow-md ring-2 ring-primary/5" 
                                      : "bg-white border-slate-100 hover:border-slate-300"
                                  )}
                                >
                                  <FolderTree className={cn(
                                    "w-5 h-5",
                                    selectedCategoryId === c.id ? "text-primary" : "text-slate-300"
                                  )} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                                    <p className="text-[9px] font-mono text-slate-400">/{c.slug}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="flex flex-col justify-center gap-6">
                        {(selectedProduct || selectedCategory) ? (
                          <div className="space-y-8 animate-in fade-in zoom-in-95">
                            <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-6 shadow-2xl relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/40 transition-all" />
                              
                              <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Proposed Assignment</span>
                                <h3 className="text-2xl font-black">{selectedDiscount?.name}</h3>
                              </div>

                              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center">
                                  {selectedDiscount?.scope === 'product' ? <Package className="w-6 h-6 text-slate-900" /> : <FolderTree className="w-6 h-6 text-slate-900" />}
                                </div>
                                <div>
                                  <p className="font-bold">{selectedProduct?.name || selectedCategory?.name}</p>
                                  <p className="text-xs text-slate-400 uppercase tracking-widest font-black">{selectedDiscount?.scope} targeting</p>
                                </div>
                              </div>

                              <div className="pt-4 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-400 font-medium">Campaign Value</span>
                                  <span className="font-black text-emerald-400">
                                    {selectedDiscount?.discount_type === 'percentage' ? `${selectedDiscount.value}%` : `৳${selectedDiscount?.value}`}
                                  </span>
                                </div>
                                <Button 
                                  className="w-full h-14 text-md font-black shadow-xl bg-primary hover:bg-primary/90"
                                  onClick={handleAssign}
                                  disabled={isAssigning}
                                >
                                  {isAssigning ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Link2 className="w-5 h-5 mr-2" />}
                                  Confirm Assignment
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center gap-6 p-8 border-2 border-dashed rounded-3xl bg-slate-50/50">
                            <div className="bg-white p-6 rounded-full shadow-md text-slate-200">
                              <TrendingDown className="w-10 h-10" />
                            </div>
                            <div className="text-center space-y-2">
                              <h4 className="text-xl font-bold text-slate-700">Awaiting Mapping</h4>
                              <p className="text-sm text-slate-400 max-w-[250px] mx-auto font-medium">Select a target {selectedDiscount?.scope} to view the link summary.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="active" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-slate-100">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Product Assignments
                </CardTitle>
                <CardDescription>Individually mapped items with override logic.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="divide-y divide-slate-100">
                    {(assignments.product_discounts?.length ?? 0) === 0 ? (
                      <div className="py-24 text-center text-slate-400 italic">No product-scope mappings active.</div>
                    ) : assignments.product_discounts.map((item, idx) => (
                      <div key={idx} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden border">
                            {item.product?.primary_image ? (
                              <img src={item.product.primary_image} alt="Target" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 m-auto text-slate-300" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">{item.product?.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest">{item.discount?.name}</Badge>
                              <ArrowRight className="w-3 h-3 text-slate-300" />
                              <span className="text-[10px] font-black text-emerald-600">
                                {item.discount?.discount_type === 'percentage' ? `${parseFloat(item.discount.value)}%` : `৳${parseFloat(item.discount?.value)}`} OFF
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-300 hover:text-destructive transition-colors"
                          onClick={() => setUnassignTarget({ 
                            discountId: item.discount_id, 
                            productId: item.product_id, 
                            name: item.product?.name || "Product"
                          })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-slate-100">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-primary" />
                  Category Assignments
                </CardTitle>
                <CardDescription>Taxonomy-wide promotions covering entire branches.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="divide-y divide-slate-100">
                    {(assignments.category_discounts?.length ?? 0) === 0 ? (
                      <div className="py-24 text-center text-slate-400 italic">No category-scope mappings active.</div>
                    ) : assignments.category_discounts.map((item, idx) => (
                      <div key={idx} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center border">
                            <FolderTree className="w-6 h-6 text-slate-400" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">{item.category?.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest">{item.discount?.name}</Badge>
                              <ArrowRight className="w-3 h-3 text-slate-300" />
                              <span className="text-[10px] font-black text-emerald-600">
                                {item.discount?.discount_type === 'percentage' ? `${parseFloat(item.discount.value)}%` : `৳${parseFloat(item.discount?.value)}`} OFF
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-300 hover:text-destructive transition-colors"
                          onClick={() => setUnassignTarget({ 
                            discountId: item.discount_id, 
                            categoryId: item.category_id, 
                            name: item.category?.name || "Category"
                          })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Unassign Confirmation */}
      <AlertDialog open={!!unassignTarget} onOpenChange={(open) => !open && setUnassignTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-black text-2xl">
              <AlertCircle className="w-6 h-6" />
              Detach Promotion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium text-base leading-relaxed">
              Are you sure you want to detach this promotion from <strong>"{unassignTarget?.name}"</strong>? This will immediately revert the item(s) to their base pricing in the regional market.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold h-12 border-slate-200">Keep Assignment</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleUnassign();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold h-12 px-8 shadow-lg shadow-destructive/20"
              disabled={isUnassigning}
            >
              {isUnassigning ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
              Confirm Detach
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
