"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, Loader2, Check, AlertCircle, Tag, FolderTree, Globe, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/lib/api-config';
import { cn } from '@/lib/utils';
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
  price_data?: {
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

interface AssignmentItem {
  product_id?: number;
  category_id?: number;
  discount_id?: number;
  product?: Product;
  category?: Category;
  discount?: Discount;
}

interface AssignmentData {
  product_discounts: AssignmentItem[];
  category_discounts: AssignmentItem[];
}

function moneyLabel(discount?: { discount_type?: string; value?: string } | null) {
  if (!discount?.value) return '';
  const amount = parseFloat(discount.value);
  return discount.discount_type === 'percentage' ? `${amount}%` : `৳${amount}`;
}

export default function AssignDiscountPage() {
  const { toast } = useToast();

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData>({ product_discounts: [], category_discounts: [] });
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const [unassignTarget, setUnassignTarget] = useState<{ discountId: number, productId?: number, categoryId?: number, name: string } | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

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
        let message = result.message || 'Failed to map promotion.';
        if (result.existing_discount) {
          message = `${message} (Currently linked to: ${result.existing_discount.name})`;
        }
        throw new Error(message);
      }

      toast({
        title: 'Assigned',
        description: result.replaced_discount
          ? `Replaced ${result.replaced_discount.name}.`
          : result.message || 'Discount linked.',
      });

      setSelectedProductId(null);
      setSelectedCategoryId(null);
      fetchData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Assignment failed',
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
        throw new Error(result.message || 'Failed to remove assignment.');
      }

      toast({
        title: 'Removed',
        description: result.message || 'Assignment removed.',
      });

      setUnassignTarget(null);
      setSelectedProductId(null);
      setSelectedCategoryId(null);
      fetchData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Remove failed',
        description: err.message
      });
    } finally {
      setIsUnassigning(false);
    }
  };

  const filteredDiscounts = discounts.filter(d =>
    d.name.toLowerCase().includes(discountSearch.toLowerCase())
  );

  const productLinks = useMemo(() => {
    const map = new Map<number, AssignmentItem>();
    assignments.product_discounts.forEach((item) => {
      const id = item.product_id ?? item.product?.id;
      if (id) map.set(id, item);
    });
    return map;
  }, [assignments.product_discounts]);

  const categoryLinks = useMemo(() => {
    const map = new Map<number, AssignmentItem>();
    assignments.category_discounts.forEach((item) => {
      const id = item.category_id ?? item.category?.id;
      if (id) map.set(id, item);
    });
    return map;
  }, [assignments.category_discounts]);

  const linkCount = useCallback((discount: Discount) => {
    const rows = discount.scope === 'product' ? assignments.product_discounts : assignments.category_discounts;
    return rows.filter((item) => (item.discount_id ?? item.discount?.id) === discount.id).length;
  }, [assignments]);

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(targetSearch.toLowerCase()))
    .sort((a, b) => {
      const aLinked = productLinks.get(a.id)?.discount_id === selectedDiscountId || productLinks.get(a.id)?.discount?.id === selectedDiscountId;
      const bLinked = productLinks.get(b.id)?.discount_id === selectedDiscountId || productLinks.get(b.id)?.discount?.id === selectedDiscountId;
      return Number(bLinked) - Number(aLinked);
    });

  const filteredCategories = categories
    .filter(c => c.name.toLowerCase().includes(targetSearch.toLowerCase()))
    .sort((a, b) => {
      const aLinked = categoryLinks.get(a.id)?.discount_id === selectedDiscountId || categoryLinks.get(a.id)?.discount?.id === selectedDiscountId;
      const bLinked = categoryLinks.get(b.id)?.discount_id === selectedDiscountId || categoryLinks.get(b.id)?.discount?.id === selectedDiscountId;
      return Number(bLinked) - Number(aLinked);
    });

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const selectedTargetName = selectedProduct?.name || selectedCategory?.name;
  const selectedExisting = selectedDiscount?.scope === 'product' && selectedProductId
    ? productLinks.get(selectedProductId)
    : selectedDiscount?.scope === 'category' && selectedCategoryId
      ? categoryLinks.get(selectedCategoryId)
      : undefined;
  const alreadyOnThis = (selectedExisting?.discount_id ?? selectedExisting?.discount?.id) === selectedDiscountId;

  const visibleLinks = selectedDiscount?.scope === 'product'
    ? assignments.product_discounts.filter((item) => !selectedDiscountId || (item.discount_id ?? item.discount?.id) === selectedDiscountId)
    : selectedDiscount?.scope === 'category'
      ? assignments.category_discounts.filter((item) => !selectedDiscountId || (item.discount_id ?? item.discount?.id) === selectedDiscountId)
      : [...assignments.product_discounts, ...assignments.category_discounts];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Assign discount</h1>
        <p className="text-xs text-muted-foreground">Pick a discount, then pick a product or category.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <Card className="lg:col-span-4">
          <CardHeader className="px-3 py-2 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="size-3.5 text-primary" />
              Discounts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search discounts"
                className="pl-7 h-8 text-xs"
                value={discountSearch}
                onChange={(e) => setDiscountSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[min(520px,calc(100vh-220px))]">
              <div className="space-y-1 pr-2">
                {isLoading ? (
                  <div className="py-10 flex justify-center text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                ) : filteredDiscounts.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">No active discounts.</p>
                ) : filteredDiscounts.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDiscountId(d.id);
                      setSelectedProductId(null);
                      setSelectedCategoryId(null);
                      setTargetSearch("");
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
                      selectedDiscountId === d.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-semibold tabular-nums w-12 shrink-0",
                      selectedDiscountId === d.id ? "text-primary" : "text-foreground"
                    )}>
                      {moneyLabel(d)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium truncate">{d.name}</span>
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{d.scope}</span>
                    </span>
                    {d.scope === 'global' ? (
                      <Globe className="size-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                        {linkCount(d)}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="px-3 py-2 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              {selectedDiscount?.scope === 'category' ? <FolderTree className="size-3.5 text-primary" /> : <Package className="size-3.5 text-primary" />}
              {selectedDiscount?.scope === 'category' ? 'Categories' : selectedDiscount?.scope === 'product' ? 'Products' : 'Targets'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {!selectedDiscount ? (
              <p className="py-16 text-center text-xs text-muted-foreground">Pick a discount on the left.</p>
            ) : selectedDiscount.scope === 'global' ? (
              <div className="py-10 px-4 text-center space-y-1">
                <Globe className="size-4 mx-auto text-primary" />
                <p className="text-xs font-medium">{selectedDiscount.name} applies to the whole catalog.</p>
                <p className="text-[11px] text-muted-foreground">Nothing to assign.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder={selectedDiscount.scope === 'product' ? "Search products" : "Search categories"}
                    className="pl-7 h-8 text-xs"
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-[min(420px,calc(100vh-280px))]">
                  <div className="space-y-1 pr-2">
                    {selectedDiscount.scope === 'product' ? filteredProducts.map((p) => {
                      const link = productLinks.get(p.id);
                      const onThis = (link?.discount_id ?? link?.discount?.id) === selectedDiscount.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedProductId(p.id)}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-md border px-2 py-1 text-left",
                            selectedProductId === p.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"
                          )}
                        >
                          <span className="size-7 rounded bg-muted overflow-hidden shrink-0 border">
                            {p.primary_image ? (
                              <img src={p.primary_image} alt="" className="size-full object-cover" />
                            ) : (
                              <Package className="size-3.5 m-auto mt-1.5 text-muted-foreground" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-medium truncate">{p.name}</span>
                            <span className="block text-[10px] text-muted-foreground truncate">
                              {p.price_data ? `৳${p.price_data.final_price.toLocaleString()}` : ''}
                              {link?.discount?.name ? ` · ${onThis ? 'linked' : link.discount.name}` : ''}
                            </span>
                          </span>
                          {onThis && <Check className="size-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    }) : filteredCategories.map((c) => {
                      const link = categoryLinks.get(c.id);
                      const onThis = (link?.discount_id ?? link?.discount?.id) === selectedDiscount.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(c.id)}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-md border px-2 py-1.5 text-left",
                            selectedCategoryId === c.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"
                          )}
                        >
                          <FolderTree className={cn("size-3.5 shrink-0", selectedCategoryId === c.id ? "text-primary" : "text-muted-foreground")} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-medium truncate">{c.name}</span>
                            <span className="block text-[10px] text-muted-foreground truncate">
                              {link?.discount?.name ? (onThis ? 'Linked to this discount' : `Now on ${link.discount.name}`) : `/${c.slug}`}
                            </span>
                          </span>
                          {onThis && <Check className="size-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>

                {selectedTargetName && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5">
                    <p className="min-w-0 flex-1 text-[11px] leading-snug">
                      <span className="font-medium">{selectedDiscount.name}</span>
                      <span className="text-muted-foreground"> → {selectedTargetName}</span>
                      {selectedExisting?.discount?.name && !alreadyOnThis && (
                        <span className="block text-amber-700">Replaces {selectedExisting.discount.name}</span>
                      )}
                      {alreadyOnThis && <span className="block text-muted-foreground">Already linked</span>}
                    </p>
                    {alreadyOnThis ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUnassignTarget({
                          discountId: selectedDiscount.id,
                          productId: selectedProductId || undefined,
                          categoryId: selectedCategoryId || undefined,
                          name: selectedTargetName,
                        })}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleAssign} disabled={isAssigning}>
                        {isAssigning ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        {selectedExisting ? 'Replace' : 'Assign'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="px-3 py-2 border-b">
            <CardTitle className="text-sm font-medium">Linked now</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[min(520px,calc(100vh-220px))]">
              {visibleLinks.length === 0 ? (
                <p className="py-10 px-3 text-center text-xs text-muted-foreground">Nothing linked yet.</p>
              ) : (
                <div className="divide-y">
                  {visibleLinks.map((item, idx) => {
                    const name = item.product?.name || item.category?.name || 'Item';
                    const discountId = item.discount_id ?? item.discount?.id;
                    return (
                      <div key={`${discountId}-${item.product_id || item.category_id || idx}`} className="flex items-center gap-2 px-2 py-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {item.discount?.name} · {moneyLabel(item.discount)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setUnassignTarget({
                            discountId: discountId || 0,
                            productId: item.product_id ?? item.product?.id,
                            categoryId: item.category_id ?? item.category?.id,
                            name,
                          })}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!unassignTarget} onOpenChange={(open) => !open && setUnassignTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="size-4 text-destructive" />
              Remove discount
            </AlertDialogTitle>
            <AlertDialogDescription>
              Take this discount off <strong>{unassignTarget?.name}</strong>? The price goes back to the regular amount.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleUnassign();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isUnassigning}
            >
              {isUnassigning ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
