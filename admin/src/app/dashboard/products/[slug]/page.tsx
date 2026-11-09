"use client";

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Package, 
  Tag, 
  Settings2, 
  Layers, 
  ShoppingCart,
  AlertCircle,
  Plus,
  Minus,
  Loader2,
  ExternalLink,
  Edit2,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  Info,
  DollarSign,
  Search,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ProductImage {
  id: number;
  image_url: string;
  is_primary: boolean;
}

interface AttributeValue {
  attribute: string;
  value: string;
  attribute_id?: number;
  attribute_value_id?: number;
}

interface ProductVariant {
  id: number;
  sku: string;
  stock: number;
  attributes: AttributeValue[];
}

interface ProductPriceData {
  original_price: string;
  final_price: string;
  discount_percent: number;
  discount_value: string;
  is_discounted: boolean;
}

interface ProductDetails {
  id: number;
  name: string;
  slug: string;
  description: string;
  selling_price: string;
  is_active: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  price_data: ProductPriceData;
  product_type_id: number;
}

interface Attribute {
  id: number;
  name: string;
  values: {
    id: number;
    value: string;
  }[];
}

export default function ProductDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  
  // Deletion State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Stock Adjustment State
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 1,
    operation: 'increase' as 'increase' | 'decrease'
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  
  // Add Variant State
  const [isAddVariantDialogOpen, setIsAddVariantDialogOpen] = useState(false);
  const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);
  const [isFetchingAttributes, setIsFetchingAttributes] = useState(false);
  const [newVariantData, setNewVariantData] = useState({
    sku: '',
    stock: 0,
    weight: 0,
    attributes: {} as Record<number, number> // attributeId -> valueId
  });
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);
  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editAttributes, setEditAttributes] = useState<Record<number, number>>({});
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [variantToDisable, setVariantToDisable] = useState<ProductVariant | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  const fetchProductDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCT_ADMIN_DETAILS_SLUG(slug), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('commercehub_access_token')}`
        }
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Product profile not found.');
        throw new Error('Failed to connect to inventory API.');
      }
      const data = await response.json();
      setProduct(data);
      const primary = data.images.find((img: ProductImage) => img.is_primary) || data.images[0];
      setActiveImage(primary?.image_url || null);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);

  const handleDelete = async () => {
    if (!product) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.DELETE_PRODUCT(product.id), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to purge product from registry.');

      toast({
        title: 'Product Purged',
        description: `"${product.name}" has been successfully removed.`,
      });

      router.push('/dashboard/products');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.message
      });
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const handleUpdateStock = async () => {
    if (!selectedVariant) return;
    
    setIsUpdatingStock(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.VARIANT_STOCK_UPDATE(selectedVariant.id), {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: stockAdjustment.quantity,
          operation: stockAdjustment.operation
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to update stock registry.');
      
      toast({
        title: 'Stock Updated',
        description: `Variant ${selectedVariant.sku} registry synchronized.`,
      });
      
      setIsStockDialogOpen(false);
      fetchProductDetails(); // Refresh to show new stock
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Stock Sync Failed',
        description: err.message
      });
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const fetchProductTypeAttributes = async () => {
    if (!product) return;
    setIsFetchingAttributes(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.getProductTypeAttributes(product.product_type_id.toString()), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch type definitions.');
      const data = await response.json();
      const attributes = data.attributes || [];
      setAvailableAttributes(attributes);
      
      // Initialize attributes with empty values
      const initialAttrs: Record<number, number> = {};
      attributes.forEach((attr: Attribute) => {
        initialAttrs[attr.id] = 0;
      });
      setNewVariantData(prev => ({ ...prev, attributes: initialAttrs }));
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Registry Error',
        description: 'Could not load attribute definitions.'
      });
    } finally {
      setIsFetchingAttributes(false);
    }
  };

  const handleCreateVariant = async () => {
    if (!product) return;
    
    // Validate all attributes selected
    const selectedValueIds = Object.values(newVariantData.attributes).filter(id => id !== 0);
    if (selectedValueIds.length !== availableAttributes.length) {
      toast({
        variant: 'destructive',
        title: 'Validation Failed',
        description: 'Please select a value for all attributes.'
      });
      return;
    }
    
    setIsCreatingVariant(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.CREATE_VARIANT(product.id), {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sku: newVariantData.sku,
          stock: newVariantData.stock,
          weight: newVariantData.weight,
          attributes: selectedValueIds
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to register variant.');
      
      toast({
        title: 'Variant Registered',
        description: `New variant ${newVariantData.sku} added to catalog.`,
      });
      
      setIsAddVariantDialogOpen(false);
      setNewVariantData({ sku: '', stock: 0, weight: 0, attributes: {} });
      fetchProductDetails();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: err.message
      });
    } finally {
      setIsCreatingVariant(false);
    }
  };

  const openEditVariant = async (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setEditPrice(product?.selling_price || '');
    setIsEditVariantOpen(true);
    let attributes = availableAttributes;
    if (attributes.length === 0 && product) {
      try {
        const token = localStorage.getItem('commercehub_access_token');
        const response = await fetch(API_ENDPOINTS.getProductTypeAttributes(product.product_type_id.toString()), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          attributes = data.attributes || [];
          setAvailableAttributes(attributes);
        }
      } catch {
        attributes = [];
      }
    }
    const selected: Record<number, number> = {};
    variant.attributes?.forEach((attr) => {
      if (attr.attribute_id && attr.attribute_value_id) {
        selected[attr.attribute_id] = attr.attribute_value_id;
      }
    });
    setEditAttributes(selected);
  };

  const handleSaveVariant = async () => {
    if (!selectedVariant) return;
    const selectedValueIds = Object.values(editAttributes).filter((id) => id);
    if (availableAttributes.length === 0) {
      toast({ variant: 'destructive', title: 'Options unavailable', description: 'Reload the product and try again.' });
      return;
    }
    if (selectedValueIds.length !== availableAttributes.length) {
      toast({ variant: 'destructive', title: 'Choose every option', description: 'Each attribute needs a value.' });
      return;
    }
    setIsSavingVariant(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.VARIANT_UPDATE(selectedVariant.id), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base_price: editPrice,
          attributes: selectedValueIds
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update variant.');
      toast({ title: 'Variant updated', description: selectedVariant.sku });
      setIsEditVariantOpen(false);
      fetchProductDetails();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: err.message });
    } finally {
      setIsSavingVariant(false);
    }
  };

  const handleDisableVariant = async () => {
    if (!variantToDisable) return;
    setIsDisabling(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.VARIANT_DELETE(variantToDisable.id), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to disable variant.');
      toast({ title: 'Variant disabled', description: `${variantToDisable.sku} stock is now 0.` });
      setVariantToDisable(null);
      fetchProductDetails();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Disable failed', description: err.message });
    } finally {
      setIsDisabling(false);
    }
  };

  useEffect(() => {
    if (isAddVariantDialogOpen && availableAttributes.length === 0) {
      fetchProductTypeAttributes();
    }
  }, [isAddVariantDialogOpen]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading Product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-4 text-center">
        <Package className="h-12 w-12 text-slate-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h1>
        <p className="text-slate-500 mb-8">{error || 'The entry does not exist.'}</p>
        <Link href="/dashboard/products">
          <Button variant="outline" className="font-bold">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Admin Utility Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
          <nav className="flex items-center space-x-2 text-sm text-slate-500 font-medium">
            <Link href="/dashboard" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/dashboard/products" className="hover:text-primary transition-colors">Products</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900 truncate max-w-[200px]">{product.name}</span>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/products/${product.slug}/edit`}>
              <Button variant="outline" size="sm" className="font-bold h-9">
                <Edit2 className="w-4 h-4 mr-2" /> Edit Details
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="font-bold h-9" onClick={() => window.open(`${window.location.origin}/products/${product.slug}`, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" /> View Storefront
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-destructive hover:bg-destructive/5 font-bold h-9"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Entry
            </Button>
          </div>
        </div>

        {/* Product Content Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          
          {/* Left Column: Imagery */}
          <div className="space-y-6">
            <div className="relative aspect-[4/5] bg-slate-50 rounded-lg overflow-hidden border group">
              {activeImage ? (
                <img 
                  src={activeImage} 
                  alt={product.name} 
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-200">
                  <ImageIcon className="h-20 w-20" />
                </div>
              )}
              <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm cursor-pointer hover:bg-white transition-colors">
                <Search className="h-5 w-5 text-slate-600" />
              </div>
            </div>

            {/* Thumbnails */}
            <div className="flex flex-wrap gap-3">
              {product.images.map((img) => (
                <button 
                  key={img.id}
                  onClick={() => setActiveImage(img.image_url)}
                  className={cn(
                    "w-20 aspect-square rounded border-2 overflow-hidden transition-all",
                    activeImage === img.image_url ? "border-primary" : "border-slate-100 hover:border-slate-300"
                  )}
                >
                  <img src={img.image_url} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Information */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight leading-tight">
                  {product.name}
                </h1>
                {product.is_active === false && (
                  <Badge variant="outline" className="bg-rose-50 text-rose-500 border-rose-200 text-xs uppercase px-2 py-0.5">Inactive</Badge>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-900">
                  ৳{parseFloat(product.price_data.final_price).toLocaleString()}
                </p>
                {product.price_data.is_discounted && (
                  <p className="text-sm text-slate-400 line-through">
                    ৳{parseFloat(product.price_data.original_price).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-md border border-slate-100">
                <p className="text-sm text-slate-700 font-medium">
                  Inventory managed in real-time. Changes affect storefront immediately.
                </p>
              </div>
            </div>

            <Separator className="bg-slate-100" />

            {/* Description / Measurements */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Description & Details</h3>
              <div 
                className="text-slate-600 text-sm leading-relaxed rich-text-content"
                dangerouslySetInnerHTML={{ __html: product.description || '<p>No description provided.</p>' }}
              />
            </div>

            <Separator className="bg-slate-100" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Inventory Matrix</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold h-5">{product.variants.length} Variants</Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] font-bold gap-1"
                    onClick={() => setIsAddVariantDialogOpen(true)}
                  >
                    <Plus className="w-3 h-3" /> Add Variant
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b">
                      <TableHead className="text-[10px] font-bold uppercase py-2 h-auto">SKU</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase py-2 h-auto">Options</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase py-2 h-auto text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map((variant) => (
                      <TableRow key={variant.id} className="hover:bg-slate-50/30 transition-colors border-b last:border-0">
                        <TableCell className="font-mono text-[11px] py-3">{variant.sku}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {variant.attributes?.map((attr, idx) => (
                              <span key={idx} className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                                {attr.attribute}: {attr.value}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <div className="flex items-center justify-end gap-3">
                            <span className={cn(
                              "text-[11px] font-bold",
                              variant.stock > 0 ? "text-emerald-600" : "text-rose-500"
                            )}>
                              {variant.stock} units
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                              onClick={() => {
                                setSelectedVariant(variant);
                                setStockAdjustment({ quantity: 1, operation: 'increase' });
                                setIsStockDialogOpen(true);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => openEditVariant(variant)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-destructive"
                              onClick={() => setVariantToDisable(variant)}
                            >
                              Disable
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* System Info */}
            <div className="pt-6 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System ID</p>
                <p className="text-xs font-medium text-slate-700">#{product.id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL Slug</p>
                <p className="text-xs font-medium text-slate-700">/{product.slug}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-black text-2xl">
              <AlertCircle className="w-6 h-6" />
              Purge Product
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium text-base leading-relaxed">
              Are you sure you want to delete <strong>"{product.name}"</strong>? This will permanently remove the item from the storefront registry. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold h-12 border-slate-200">Keep Product</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
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
      
      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-2xl">
              <Package className="w-6 h-6 text-primary" />
              Stock Management
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-2">
              Update inventory for <strong>{selectedVariant?.sku}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Level</label>
                <div className="h-12 flex items-center px-4 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700">
                  {selectedVariant?.stock} Units
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operation</label>
                <Select 
                  value={stockAdjustment.operation} 
                  onValueChange={(val: any) => setStockAdjustment({ ...stockAdjustment, operation: val })}
                >
                  <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="increase" className="font-bold py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Add Stock
                      </div>
                    </SelectItem>
                    <SelectItem value="decrease" className="font-bold py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        Remove Stock
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adjustment Quantity</label>
              <div className="relative">
                <Input 
                  type="number" 
                  min="1"
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: parseInt(e.target.value) || 0 })}
                  className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-black text-xl"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                  {stockAdjustment.operation === 'increase' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-3 mt-2">
            <Button 
              variant="ghost" 
              onClick={() => setIsStockDialogOpen(false)}
              className="rounded-xl font-bold h-12 flex-1"
            >
              Discard
            </Button>
            <Button 
              onClick={handleUpdateStock}
              disabled={isUpdatingStock || stockAdjustment.quantity <= 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold h-12 px-8 flex-1 shadow-lg shadow-primary/20"
            >
              {isUpdatingStock ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
              Update Registry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditVariantOpen} onOpenChange={setIsEditVariantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {selectedVariant?.sku}</DialogTitle>
            <DialogDescription>Price applies to the product. Options apply to this variant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Selling price</label>
              <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            {availableAttributes.map((attr) => (
              <div key={attr.id} className="space-y-1">
                <label className="text-xs text-muted-foreground">{attr.name}</label>
                <Select
                  value={editAttributes[attr.id] ? String(editAttributes[attr.id]) : undefined}
                  onValueChange={(value) => setEditAttributes((current) => ({ ...current, [attr.id]: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={attr.name} />
                  </SelectTrigger>
                  <SelectContent>
                    {attr.values.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>{option.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditVariantOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveVariant} disabled={isSavingVariant}>
              {isSavingVariant ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!variantToDisable} onOpenChange={(open) => !open && setVariantToDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {variantToDisable?.sku}?</AlertDialogTitle>
            <AlertDialogDescription>This sets the variant stock to 0. It stays on the product.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDisableVariant(); }} disabled={isDisabling}>
              {isDisabling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Add Variant Dialog */}
      <Dialog open={isAddVariantDialogOpen} onOpenChange={setIsAddVariantDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-2xl">
              <Layers className="w-6 h-6 text-primary" />
              New Variant Registry
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-2">
              Add a new configuration to this product family.
            </DialogDescription>
          </DialogHeader>
          
          {isFetchingAttributes ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Attributes...</p>
            </div>
          ) : (
            <div className="py-6 space-y-6 max-h-[60vh] overflow-y-auto px-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">SKU Identifier</label>
                  <Input 
                    placeholder="e.g. PRD-RED-XL"
                    value={newVariantData.sku}
                    onChange={(e) => setNewVariantData({ ...newVariantData, sku: e.target.value })}
                    className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Stock</label>
                  <Input 
                    type="number"
                    min="0"
                    value={newVariantData.stock}
                    onChange={(e) => setNewVariantData({ ...newVariantData, stock: parseInt(e.target.value) || 0 })}
                    className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weight (KG)</label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={newVariantData.weight}
                  onChange={(e) => setNewVariantData({ ...newVariantData, weight: parseFloat(e.target.value) || 0 })}
                  className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                />
              </div>

              <Separator className="bg-slate-100" />
              
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Configuration Options</h4>
                <div className="grid grid-cols-1 gap-4">
                  {availableAttributes?.map((attr) => (
                    <div key={attr.id} className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">{attr.name}</label>
                      <Select 
                        value={newVariantData.attributes[attr.id]?.toString()} 
                        onValueChange={(val) => setNewVariantData({
                          ...newVariantData,
                          attributes: { ...newVariantData.attributes, [attr.id]: parseInt(val) }
                        })}
                      >
                        <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 font-medium">
                          <SelectValue placeholder={`Select ${attr.name}`} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          {attr.values?.map((v) => (
                            <SelectItem key={v.id} value={v.id.toString()} className="font-medium py-3">
                              {v.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-3 mt-2">
            <Button 
              variant="ghost" 
              onClick={() => setIsAddVariantDialogOpen(false)}
              className="rounded-xl font-bold h-12 flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateVariant}
              disabled={isCreatingVariant || isFetchingAttributes || !newVariantData.sku}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold h-12 px-8 flex-1 shadow-lg shadow-primary/20"
            >
              {isCreatingVariant ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Layers className="w-5 h-5 mr-2" />}
              Create Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .rich-text-content p { margin-bottom: 0.75rem; }
        .rich-text-content ul { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.75rem; }
        .rich-text-content ol { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 0.75rem; }
        .rich-text-content h1, .rich-text-content h2, .rich-text-content h3 { font-weight: bold; margin-bottom: 0.5rem; color: #0f172a; }
        .rich-text-content strong { font-weight: 700; color: #1e293b; }
      `}</style>
    </div>
  );
}
