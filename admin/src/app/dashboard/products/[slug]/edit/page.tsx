"use client";

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
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

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full bg-slate-50 animate-pulse rounded-md border" />
});
import 'react-quill-new/dist/quill.snow.css';

interface ApiCategory { id: number; name: string; }
interface ApiProductType { id: number; name: string; }
interface AttributeValue { id: number; value: string; }
interface Attribute { id: number; name: string; values: AttributeValue[]; }
interface ProductImage { id?: number; image_url: string; is_primary: boolean; }
interface Variant { id: string; sku: string; stock: string; selectedAttributeValues: Record<number, number>; }
interface ApiTag { id: number; name: string; slug: string; }

export default function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  // Data State
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ApiCategory[]>([]);
  const [productTypes, setProductTypes] = useState<ApiProductType[]>([]);
  const [fetchedAttributes, setFetchedAttributes] = useState<Attribute[]>([]);
  const [availableTags, setTags] = useState<ApiTag[]>([]);
  
  // Form State
  const [productId, setProductId] = useState<number | null>(null);
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
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // Tag Dialog
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  
  // UI Status
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const [isAttributesLoading, setIsAttributesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const adminDetailsRes = await fetch(API_ENDPOINTS.PRODUCT_ADMIN_DETAILS_SLUG(slug), { headers });
      if (!adminDetailsRes.ok) throw new Error('Product not found or sync failed.');
      const adminData = await adminDetailsRes.json();
      
      const [catsRes, typesRes, tagsRes] = await Promise.all([
        fetch(API_ENDPOINTS.CATEGORIES_ROOT),
        fetch(API_ENDPOINTS.PRODUCT_TYPES, { headers }),
        fetch(API_ENDPOINTS.PRODUCT_TAGS_ADMIN, { headers })
      ]);
      setCategories(await catsRes.json());
      setProductTypes(await typesRes.json());
      setTags(await tagsRes.json());

      setProductId(adminData.id);
      setName(adminData.name);
      setDescription(adminData.description);
      setBuyingPrice(adminData.buying_price);
      setSellingPrice(adminData.selling_price);
      setCategoryId(adminData.category_id?.toString() || '');
      setSubcategoryId(adminData.subcategory_id?.toString() || 'none');
      setProductTypeId(adminData.product_type_id?.toString() || '');
      setImages(adminData.images || []);
      setSelectedTagIds(adminData.tags?.map((t: any) => t.id) || []);
      setIsActive(adminData.is_active ?? true);
      
      if (adminData.product_type_id) {
        const attrRes = await fetch(API_ENDPOINTS.getProductTypeAttributes(adminData.product_type_id), { headers });
        if (attrRes.ok) {
          const attrData = await attrRes.json();
          setFetchedAttributes(attrData.attributes || []);
          
          setVariants(adminData.variants.map((v: any) => {
            const attributeMapping: Record<number, number> = {};
            v.attributes.forEach((av: any) => {
              attributeMapping[av.attribute_id] = av.attribute_value_id;
            });
            return {
              id: Math.random().toString(36).substr(2, 9),
              sku: v.sku,
              stock: v.stock.toString(),
              selectedAttributeValues: attributeMapping
            };
          }));
        }
      }
    } catch (err: any) { toast({ variant: 'destructive', title: 'Sync Error', description: err.message }); }
    finally { setIsLoading(false); }
  }, [slug, toast]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  useEffect(() => {
    if (!categoryId) return;
    const fetchSubs = async () => {
      setIsLoadingSubcategories(true);
      try {
        const res = await fetch(API_ENDPOINTS.getSubcategoriesByCategoryId(categoryId));
        if (res.ok) setSubcategories(await res.json());
      } catch (err) { console.error(err); }
      finally { setIsLoadingSubcategories(false); }
    };
    fetchSubs();
  }, [categoryId]);

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
        toast({ title: "Tag Created", description: "Label is ready for assignment." });
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
    } catch (err: any) { toast({ variant: 'destructive', title: 'Upload Error', description: err.message }); }
    finally { setIsUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const payload = {
        name, description, buying_price: buyingPrice, selling_price: sellingPrice,
        category_id: parseInt(categoryId),
        subcategory_id: subcategoryId !== 'none' ? parseInt(subcategoryId) : null,
        product_type_id: parseInt(productTypeId),
        is_active: isActive,
        tag_ids: selectedTagIds,
        tags_action: "set",
        images: images.map(img => ({ image_url: img.image_url, is_primary: img.is_primary })),
        variants: variants.map(v => ({
          sku: v.sku, stock: parseInt(v.stock), attributes: Object.values(v.selectedAttributeValues), base_price: sellingPrice
        }))
      };
      const response = await fetch(API_ENDPOINTS.UPDATE_PRODUCT(productId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        toast({ title: "Product Updated", description: "Catalog changes synchronized." });
        router.push(`/dashboard/products/${slug}`);
      } else {
        const err = await response.json();
        throw new Error(err.message || err.detail || "Update failed.");
      }
    } catch (err: any) { toast({ variant: 'destructive', title: 'Submission Failed', description: err.message }); }
    finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="py-40 flex flex-col items-center gap-4"><Loader2 className="animate-spin h-12 w-12 text-primary" /><p className="font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Registry...</p></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-24 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link href={`/dashboard/products/${slug}`}><Button variant="ghost" size="sm" className="pl-0 gap-2 hover:bg-transparent text-primary font-bold"><ChevronLeft className="h-4 w-4" /> Discard & Return</Button></Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Edit Product</h1>
        </div>
        <Button form="edit-form" type="submit" disabled={isSubmitting} className="gap-2 shadow-xl font-bold px-10 h-14 text-md">{isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} Synchronize Catalog</Button>
      </div>

      <form id="edit-form" onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-5 px-8"><CardTitle className="text-lg flex items-center gap-2 font-bold"><Package className="w-5 h-5 text-primary" /> Core Specification</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-2"><Label className="text-sm font-bold">Display Label</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 border-slate-200" required /></div>
                
                <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Checkbox 
                    id="isActiveToggle" 
                    checked={isActive} 
                    onCheckedChange={(checked) => setIsActive(checked === true)} 
                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="isActiveToggle" className="text-sm font-bold cursor-pointer">
                      Market Status (Active)
                    </Label>
                    <p className="text-xs text-slate-500">
                      Uncheck to soft-delete or hide this product from the public storefront.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Narrative Description</Label>
                  <div className="prose-sm bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner"><ReactQuill theme="snow" value={description} onChange={setDescription} className="h-64 mb-12" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-5 px-8"><CardTitle className="text-lg flex items-center gap-2 font-bold"><Layers className="w-5 h-5 text-primary" /> Classification Mapping</CardTitle></CardHeader>
              <CardContent className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Root Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger className="h-12"><SelectValue placeholder="Choose Category" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Subcategory</Label>
                  <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={isLoadingSubcategories}><SelectTrigger className="h-12"><SelectValue placeholder={isLoadingSubcategories ? "Loading..." : "Optional"} /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{subcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Product Type Architecture</Label>
                  <Select value={productTypeId} onValueChange={setProductTypeId}><SelectTrigger className="h-12"><SelectValue placeholder="Select Type" /></SelectTrigger><SelectContent>{productTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-10">
            <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-5 px-6"><CardTitle className="text-md flex items-center gap-2 font-bold"><Tag className="w-4 h-4 text-primary" /> Pricing Architecture (৳)</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Buying Cost</Label><Input type="number" value={buyingPrice} onChange={(e) => setBuyingPrice(e.target.value)} className="h-12 font-bold bg-white" required /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black text-primary uppercase">Selling Price</Label><Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="h-12 text-lg font-black border-primary/20 bg-primary/5 text-primary" required /></div>
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
                      <div className="space-y-2"><Label>Tag Label</Label><Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="e.g. Best Seller" required /></div>
                      <DialogFooter><Button type="submit" disabled={isCreatingTag} className="w-full h-11">{isCreatingTag ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />} Commit Tag</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-2">
                  {availableTags.map(tag => (
                    <div key={tag.id} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Checkbox id={`tag-edit-${tag.id}`} checked={selectedTagIds.includes(tag.id)} onCheckedChange={(checked) => {
                        setSelectedTagIds(checked ? [...selectedTagIds, tag.id] : selectedTagIds.filter(id => id !== tag.id));
                      }} />
                      <Label htmlFor={`tag-edit-${tag.id}`} className="text-xs font-bold cursor-pointer truncate">{tag.name}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-5 px-6"><CardTitle className="text-md flex items-center gap-2 font-bold"><ImageIcon className="w-4 h-4 text-primary" /> Media Registry</CardTitle></CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border bg-slate-50 group">
                      <img src={img.image_url} alt="Gallery" className="h-full w-full object-contain p-2" />
                      <button type="button" onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                      {img.is_primary && <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase rounded shadow-sm">Primary</div>}
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 bg-white">
                    {isUploading ? <Loader2 className="animate-spin h-6 w-6 text-primary" /> : <><Plus className="h-5 w-5 text-slate-400" /><span className="text-[10px] font-black text-slate-400 uppercase">Update Assets</span></>}
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
            {isAttributesLoading ? <div className="py-24 flex items-center justify-center gap-4"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div> : 
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b">
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 border-r">SKU Code</th>
                      {fetchedAttributes.map(attr => <th key={attr.id} className="px-8 py-5 text-[10px] font-black uppercase text-slate-600 border-r bg-slate-100/30">{attr.name}</th>)}
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 w-32">Stock Level</th>
                      <th className="px-8 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variants.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6 border-r"><Input value={v.sku} onChange={(e) => setVariants(variants.map(row => row.id === v.id ? { ...row, sku: e.target.value } : row))} className="h-10 text-xs font-mono font-bold uppercase" /></td>
                        {fetchedAttributes.map(attr => (
                          <td key={attr.id} className="px-8 py-6 border-r bg-slate-50/20">
                            <div className="flex flex-wrap gap-2">
                              {attr.values.map(val => (
                                <button key={val.id} type="button" onClick={() => {
                                  setVariants(variants.map(row => row.id === v.id ? { ...row, selectedAttributeValues: { ...row.selectedAttributeValues, [attr.id]: val.id } } : row));
                                }} className={cn("px-4 py-2 text-[11px] font-bold rounded-lg border transition-all", v.selectedAttributeValues[attr.id] === val.id ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-200")}>{val.value}</button>
                              ))}
                            </div>
                          </td>
                        ))}
                        <td className="px-8 py-6 border-r"><Input type="number" value={v.stock} onChange={(e) => setVariants(variants.map(row => row.id === v.id ? { ...row, stock: e.target.value } : row))} className="h-10 text-xs font-bold text-center" /></td>
                        <td className="px-8 py-6 text-right">{variants.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setVariants(variants.filter(row => row.id !== v.id))} className="text-slate-300 hover:text-rose-500"><X className="w-5 h-5" /></Button>}</td>
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
