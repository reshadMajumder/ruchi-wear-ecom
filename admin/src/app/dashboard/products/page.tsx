"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Filter,
  Download,
  Loader2,
  PackageX,
  Tag,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ProductPriceData {
  original_price: number;
  final_price: number;
  discount_percent: number;
  discount_value: number;
  is_discounted: boolean;
}

interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  primary_image: string | null;
  price_data: ProductPriceData;
  is_active: boolean;
}

interface PaginatedResponse {
  next: string | null;
  previous: string | null;
  results: ApiProduct[];
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination States
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);

  // Filter States
  const [sortBy, setSortBy] = useState("new");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");

  // Deletion State
  const [productToDelete, setProductToDelete] = useState<ApiProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = useCallback(async (urlOverride?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let fetchUrl = urlOverride;
      
      if (!fetchUrl) {
        const url = new URL(API_ENDPOINTS.PRODUCTS_ADMIN_LIST);
        if (searchTerm) url.searchParams.append('search', searchTerm);
        if (sortBy) url.searchParams.append('sort', sortBy);
        if (inStockOnly) url.searchParams.append('in_stock', 'true');
        if (discountedOnly) url.searchParams.append('discounted_only', 'true');
        if (activeStatus === "active") url.searchParams.append('is_active', 'true');
        if (activeStatus === "inactive") url.searchParams.append('is_active', 'false');
        fetchUrl = url.toString();
      }

      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(fetchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to synchronize with inventory API');
      
      const data: PaginatedResponse = await response.json();
      
      if (data && 'results' in data) {
        setProducts(data.results);
        setNextPageUrl(data.next);
        setPrevPageUrl(data.previous);
      } else if (Array.isArray(data)) {
        setProducts(data);
        setNextPageUrl(null);
        setPrevPageUrl(null);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong while fetching products.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, sortBy, inStockOnly, discountedOnly, activeStatus]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchProducts]);

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.DELETE_PRODUCT(productToDelete.id), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to purge product from registry.');

      toast({
        title: 'Product Purged',
        description: `"${productToDelete.name}" has been successfully removed.`,
      });

      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = (url: string | null) => {
    if (url) {
      fetchProducts(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Catalog Management</h1>
          <p className="text-muted-foreground">Manage your product inventory and regional pricing logic.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/products/new">
            <Button className="gap-2 shadow-lg font-bold">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products by name..." 
                className="pl-9 h-10 bg-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-white">
                    <Filter className="w-4 h-4" /> 
                    {discountedOnly || inStockOnly ? "Filters Active" : "Filter"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Status Filters</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem 
                    checked={inStockOnly} 
                    onCheckedChange={setInStockOnly}
                  >
                    Available In Stock
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem 
                    checked={discountedOnly} 
                    onCheckedChange={setDiscountedOnly}
                  >
                    Active Discounts
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Product Status</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={activeStatus} onValueChange={setActiveStatus}>
                    <DropdownMenuRadioItem value="all">All Products</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="active">Active Only</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="inactive">Inactive Only</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                    <DropdownMenuRadioItem value="new">Newest Arrivals</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="price_low_to_high">Price: Low to High</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="price_high_to_low">Price: High to Low</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_a_to_z">Alphabetical (A-Z)</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="gap-2 bg-white">
                <Download className="w-4 h-4" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Synchronizing Catalog...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="bg-rose-50 p-4 rounded-full mb-4">
                <PackageX className="h-10 w-10 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Connection Error</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-6" onClick={() => fetchProducts()}>
                Try Again
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
              <Search className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-muted-foreground font-medium">No products found matching your criteria.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50/50">
                    <TableHead className="w-[80px] font-bold text-[10px] uppercase tracking-widest">ID</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Product</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Pricing (BDT)</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Market Status</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="font-mono text-xs text-muted-foreground">#{product.id}</TableCell>
                      <TableCell>
                        <Link href={`/dashboard/products/${product.slug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          <div className="h-10 w-10 rounded-md bg-slate-100 overflow-hidden border flex-shrink-0 shadow-sm">
                            {product.primary_image ? (
                              <img src={product.primary_image} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-slate-300">
                                <ExternalLink className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">{product.name}</span>
                              {product.is_active === false && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-rose-50 text-rose-500 border-rose-100 font-bold uppercase">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">/{product.slug}</span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-primary">৳{parseFloat(product.price_data.final_price.toString()).toLocaleString()}</span>
                            {product.price_data.is_discounted && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-100 font-bold">
                                -{product.price_data.discount_percent}%
                              </Badge>
                            )}
                          </div>
                          {product.price_data.is_discounted && (
                            <span className="text-[10px] text-muted-foreground line-through">
                              ৳{parseFloat(product.price_data.original_price.toString()).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.price_data.is_discounted ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-[10px] font-bold">
                            <Tag className="w-3 h-3 mr-1" /> ON SALE
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-slate-100 text-[10px] font-bold">
                            REGULAR
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/products/${product.slug}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-widest text-slate-400">Management</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/products/${product.slug}/edit`} className="flex items-center gap-2 font-bold cursor-pointer">
                                  <Edit2 className="w-4 h-4" /> Edit Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-primary font-bold">
                                <ExternalLink className="w-4 h-4" /> View Storefront
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="gap-2 text-destructive focus:text-destructive font-bold cursor-pointer"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setTimeout(() => setProductToDelete(product), 50);
                                }}
                              >
                                <Trash2 className="w-4 h-4" /> Delete Entry
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="p-4 border-t bg-slate-50/30 flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">
                  Showing <span className="text-slate-900 font-bold">{products.length}</span> items on this page
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-1 font-bold bg-white" 
                    disabled={!prevPageUrl || isLoading}
                    onClick={() => handlePageChange(prevPageUrl)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-1 font-bold bg-white"
                    disabled={!nextPageUrl || isLoading}
                    onClick={() => handlePageChange(nextPageUrl)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => {
        if (!open) {
          setProductToDelete(null);
          setTimeout(() => { document.body.style.pointerEvents = ""; }, 100);
        }
      }}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-black text-2xl">
              <AlertCircle className="w-6 h-6" />
              Purge Product
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium text-base leading-relaxed">
              Are you sure you want to delete <strong>"{productToDelete?.name}"</strong>? This will permanently remove the item from the storefront registry. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold h-12 border-slate-200">Keep Product</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold h-12 px-8 shadow-lg shadow-destructive/20"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
