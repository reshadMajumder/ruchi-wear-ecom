"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ChevronLeft, 
  Save, 
  Image as ImageIcon, 
  Loader2, 
  Package, 
  Settings2,
  Tag,
  Plus,
  X,
  Layers,
  Info,
  AlertCircle,
  Hash
} from 'lucide-react';
import Link from 'next/link';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

// Import Quill dynamically to avoid SSR document errors
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full bg-slate-50 animate-pulse rounded-md border" />
});
import 'react-quill-new/dist/quill.snow.css';

interface ApiCategory {
  id: number;
  name: string;
}

interface ApiProductType {
  id: number;
  name: string;
}

interface AttributeValue {
  id: number;
  value: string;
}

interface Attribute {
  id: number;
  name: string;
  values: AttributeValue[];
}

interface ProductImage {
  image_url: string;
  is_primary: boolean;
}

interface Variant {
  id: string; 
  sku: string;
  stock: string;
  selectedAttributeValues: Record<number, number>; // AttributeID -> ValueID
}

interface ApiTag {
  id: number;
  name: string;
  slug: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Foundation Data
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ApiCategory[]>([]);
  const [productTypes, setProductTypes] = useState<ApiProductType[]>([]);
  const [fetchedAttributes, setFetchedAttributes] = useState<Attribute[]>([]);
  const [tags, setTags] = useState<ApiTag[]>([]);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('none');
  const [productTypeId, setProductTypeId] = useState<string>('');
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  
  // Tag Creation State
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  
  // UI Status
  const [isLoadingFoundation, setIsLoadingFoundation] = useState(true);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const [isAttributesLoading, setIsAttributesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchFoundationData = useCallback(async () => {
    setIsLoadingFoundation(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [catsRes, typesRes, tagsRes] = await Promise.all([
        fetch(API_ENDPOINTS.CATEGORIES_ROOT),
        fetch(API_ENDPOINTS.PRODUCT_TYPES, { headers }),
        fetch(API_ENDPOINTS.PRODUCT_TAGS_ADMIN, { headers })
      ]);

      if (!catsRes.ok || !typesRes.ok || !tagsRes.ok) throw new Error('Failed to synchronize foundation data');

      setCategories(await catsRes.json());
      setProductTypes(await typesRes.json());
      setTags(await tagsRes.json());
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sync Error', description: err.message });
    } finally {
      setIsLoadingFoundation(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFoundationData();
  }, [fetchFoundationData]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    const fetchSubs = async () => {
      setIsLoadingSubcategories(true);
      try {
        const response = await fetch(API_ENDPOINTS.getSubcategoriesByCategoryId(categoryId));
        if (response.ok) setSubcategories(await response.json());
      } catch (err) { console.error(err); }
      finally { setIsLoadingSubcategories(false); }
    };
    fetchSubs();
  }, [categoryId]);

  useEffect(() => {
    if (!productTypeId) {
      setFetchedAttributes([]);
      setVariants([]);
      return;
    }
    const fetchAttributes = async () => {
      setIsAttributesLoading(true);
      try {
        const token = localStorage.getItem('commercehub_access_token');
        const response = await fetch(API_ENDPOINTS.getProductTypeAttributes(productTypeId), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setFetchedAttributes(data.attributes || []);
          setVariants([{ id: Math.random().toString(36).substr(2, 9), sku: '', stock: '1', selectedAttributeValues: {} }]);
        }
      } catch (err) { console.error(err); }
      finally { setIsAttributesLoading(false); }
    };
    fetchAttributes();
  }, [productTypeId]);

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setIsCreatingTag(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.PRODUCT_TAGS_ADMIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newTagName.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        setTags(prev => [...prev.filter(t => t.id !== data.tag.id), data.tag]);
        setSelectedTagIds(prev => [...prev, data.tag.id]);
        setIsTagDialogOpen(false);
        setNewTagName("");
        toast({ title: "Tag Ready", description: data.message });
      }
    } catch (err) { toast({ variant: 'destructive', title: "Tag Error", description: "Failed to ingest tag." }); }
    finally { setIsCreatingTag(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);
        const uploadRes = await fetch(API_ENDPOINTS.IMAGE_UPLOAD, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Could not upload image to storage.');
        const uploadData = await uploadRes.json();
        setImages(prev => [...prev, { image_url: uploadData.image_url, is_primary: prev.length === 0 && i === 0 }]);
      }
    } catch (err: any) { toast({ variant: 'destructive', title: 'Upload Failed', description: err.message }); }
    finally { setIsUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId || !productTypeId) {
      toast({ variant: 'destructive', title: 'Form Incomplete', description: 'Fill all required metadata.' });
      return;
    }

    // Validate that all attributes have been selected for every variant
    if (fetchedAttributes.length > 0) {
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        for (const attr of fetchedAttributes) {
          if (v.selectedAttributeValues[attr.id] === undefined) {
            toast({ 
              variant: 'destructive', 
              title: 'Incomplete Variant', 
              description: `Variant ${i + 1} is missing a value for "${attr.name}".` 
            });
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const payload = {
        name, 
        description, 
        buying_price: parseFloat(buyingPrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
        category_id: parseInt(categoryId),
        subcategory_id: subcategoryId !== 'none' ? parseInt(subcategoryId) : null,
        product_type_id: parseInt(productTypeId),
        tag_ids: selectedTagIds,
        images,
        variants: variants.map(v => ({
          sku: v.sku, 
          stock: parseInt(v.stock), 
          attributes: Object.values(v.selectedAttributeValues)
        }))
      };
      const response = await fetch(API_ENDPOINTS.CREATE_PRODUCT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        toast({ title: "Product Created", description: "Catalog entry committed." });
        router.push('/dashboard/products');
      } else {
        const err = await response.json();
        // DRF can return nested errors like { variants: [{ attributes: [...] }] }
        let errorMsg: string;
        if (typeof err === 'object' && err !== null) {
          errorMsg = err.message || err.detail || err.error || 
            Object.entries(err)
              .map(([k, v]) => {
                const val = Array.isArray(v) ? v.map(item => 
                  typeof item === 'object' ? Object.values(item).flat().join(', ') : item
                ).join(', ') : String(v);
                return `${k}: ${val}`;
              })
              .join(' | ');
        } else {
          errorMsg = String(err);
        }
        throw new Error(errorMsg || "Ingestion failed.");
      }
    } catch (err: any) { toast({ variant: 'destructive', title: 'Submission Failed', description: err.message }); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-24 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="sm" className="pl-0 gap-2 hover:bg-transparent text-primary font-bold">
              <ChevronLeft className="h-4 w-4" /> Back to Catalog
            </Button>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Add New Product</h1>
        </div>
        <Button form="product-form" type="submit" disabled={isSubmitting} className="gap-2 shadow-xl font-bold px-8 h-12 text-md">
          {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
          Commit Entry
        </Button>
      </div>

      <form id="product-form" onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-5 px-8">
                <CardTitle className="text-lg flex items-center gap-2 font-bold"><Package className="w-5 h-5 text-primary" /> Core Specification</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Product Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Phone X" className="h-12 border-slate-200" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Narrative Description</Label>
                  <div className="prose-sm bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                    <ReactQuill theme="snow" value={description} onChange={setDescription} className="h-64 mb-12" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-5 px-8">
                <CardTitle className="text-lg flex items-center gap-2 font-bold"><Layers className="w-5 h-5 text-primary" /> Classification</CardTitle>
              </CardHeader>
              <CardContent className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Root Category *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Choose Category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Subcategory</Label>
                  <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId || isLoadingSubcategories}>
                    <SelectTrigger className="h-12"><SelectValue placeholder={isLoadingSubcategories ? "Loading..." : "None"} /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem>{subcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Product Type *</Label>
                  <Select value={productTypeId} onValueChange={setProductTypeId}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Select Type" /></SelectTrigger>
                    <SelectContent>{productTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-10">
            <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-5 px-6">
                <CardTitle className="text-md flex items-center gap-2 font-bold"><Tag className="w-4 h-4 text-primary" /> Pricing architecture (৳)</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Buying Price</Label>
                  <Input type="number" value={buyingPrice} onChange={(e) => setBuyingPrice(e.target.value)} className="h-12 font-bold" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary">Selling Price</Label>
                  <Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="h-12 text-lg font-black border-primary/20 bg-primary/5 text-primary" required />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-5 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-md flex items-center gap-2 font-bold"><Hash className="w-4 h-4 text-primary" /> Tags</CardTitle>
                <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-primary font-black text-[10px] uppercase p-0 px-2"><Plus className="h-3 w-3 mr-1" /> New Tag</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader><DialogTitle>Create Product Tag</DialogTitle><DialogDescription>Define a new label for homepage curation.</DialogDescription></DialogHeader>
                    <form onSubmit={handleCreateTag} className="space-y-4 py-4">
                      <div className="space-y-2"><Label>Tag Label</Label><Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="e.g. Featured" required /></div>
                      <DialogFooter><Button type="submit" disabled={isCreatingTag} className="w-full h-11">{isCreatingTag ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />} Create Tag</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-2">
                  {tags.map(tag => (
                    <div key={tag.id} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Checkbox id={`tag-${tag.id}`} checked={selectedTagIds.includes(tag.id)} onCheckedChange={(checked) => {
                        setSelectedTagIds(checked ? [...selectedTagIds, tag.id] : selectedTagIds.filter(id => id !== tag.id));
                      }} />
                      <Label htmlFor={`tag-${tag.id}`} className="text-xs font-bold cursor-pointer truncate">{tag.name}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-5 px-6">
                <CardTitle className="text-md flex items-center gap-2 font-bold"><ImageIcon className="w-4 h-4 text-primary" /> Media Assets</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border bg-slate-50 group">
                      <img src={img.image_url} alt="Gallery" className="h-full w-full object-contain p-2" />
                      <button type="button" onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 bg-white">
                    {isUploading ? <Loader2 className="animate-spin h-6 w-6 text-primary" /> : <><Plus className="h-5 w-5 text-slate-400" /><span className="text-[10px] font-black text-slate-400 uppercase">Add Photo</span></>}
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-none shadow-md bg-white ring-1 ring-slate-100 overflow-hidden">
          <CardHeader className="bg-slate-900 text-white py-6 px-8 flex flex-row items-center justify-between">
            <div className="space-y-1"><CardTitle className="text-xl flex items-center gap-2"><Settings2 className="w-6 h-6 text-primary" /> Inventory Matrix</CardTitle></div>
            <Button type="button" variant="outline" onClick={() => setVariants([...variants, { id: Math.random().toString(36).substr(2, 9), sku: '', stock: '1', selectedAttributeValues: {} }])} disabled={!productTypeId} className="bg-white/10 border-white/20 text-white"><Plus className="w-4 h-4 mr-2" /> Add Variant Row</Button>
          </CardHeader>
          <CardContent className="p-0">
            {!productTypeId ? <div className="py-24 text-center"><Info className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="font-bold text-slate-700">Awaiting Product Type Selection</p></div> : 
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b">
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 border-r">SKU Code</th>
                      {fetchedAttributes.map(attr => <th key={attr.id} className="px-8 py-5 text-[10px] font-black uppercase text-slate-600 border-r bg-slate-100/30">{attr.name}</th>)}
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 w-32">Initial Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variants.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6 border-r"><Input placeholder="SKU-123" value={v.sku} onChange={(e) => setVariants(variants.map(row => row.id === v.id ? { ...row, sku: e.target.value } : row))} className="h-10 text-xs font-mono font-bold uppercase" /></td>
                        {fetchedAttributes.map(attr => (
                          <td key={attr.id} className="px-8 py-6 border-r bg-slate-50/20">
                            <div className={cn("flex flex-wrap gap-2 rounded-lg", v.selectedAttributeValues[attr.id] === undefined && "ring-2 ring-rose-300 p-1")}>
                              {attr.values.map(val => (
                                <button key={val.id} type="button" onClick={() => {
                                  setVariants(variants.map(row => row.id === v.id ? { ...row, selectedAttributeValues: { ...row.selectedAttributeValues, [attr.id]: val.id } } : row));
                                }} className={cn("px-4 py-2 text-[11px] font-bold rounded-lg border transition-all", v.selectedAttributeValues[attr.id] === val.id ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-200")}>{val.value}</button>
                              ))}
                            </div>
                          </td>
                        ))}
                        <td className="px-8 py-6"><Input type="number" value={v.stock} onChange={(e) => setVariants(variants.map(row => row.id === v.id ? { ...row, stock: e.target.value } : row))} className="h-10 text-xs font-bold text-center" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
