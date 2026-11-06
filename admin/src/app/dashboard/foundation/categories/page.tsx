
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
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Layers,
  Loader2,
  ImageIcon,
  X,
  AlertCircle,
  FolderTree,
  ChevronRight,
  Info,
  Filter
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
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
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  subcategories_count?: number;
  product_count?: number;
  is_active?: boolean;
  parent?: number | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [rootCategories, setRootCategories] = useState<ApiCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ApiCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<ApiCategory | null>(null);
  const { toast } = useToast();

  // Form State
  const [newName, setNewName] = useState("");
  const [parentId, setParentId] = useState<string>("root");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      // For admin view, we try to fetch from the admin endpoint which should return all
      const response = await fetch(API_ENDPOINTS.CATEGORIES_ADMIN, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to synchronize categories');
      const data = await response.json();
      const allCats = Array.isArray(data) ? data : (data.results || []);
      setCategories(allCats);
      
      // Filter root categories for the parent selection dropdown
      const roots = allCats.filter((c: ApiCategory) => !c.parent);
      setRootCategories(roots);
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
    fetchCategories();
  }, [fetchCategories]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleEditClick = (category: ApiCategory) => {
    setEditingCategory(category);
    setNewName(category.name);
    setParentId(category.parent ? category.parent.toString() : "root");
    setPreviewUrl(category.image_url);
    setSelectedImage(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setNewName("");
    setParentId("root");
    setSelectedImage(null);
    setPreviewUrl(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    setIsSubmitting(true);
    try {
      let imageUrl = previewUrl; // Default to existing URL if any

      if (selectedImage) {
        const token = localStorage.getItem('commercehub_access_token');
        const formData = new FormData();
        formData.append('image', selectedImage);
        const uploadRes = await fetch(API_ENDPOINTS.IMAGE_UPLOAD, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Could not upload category image to storage.');
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.image_url;
      }

      const token = localStorage.getItem('commercehub_access_token');
      const payload: any = {
        name: newName,
        image_url: imageUrl,
        parent_id: parentId === "root" ? null : parseInt(parentId)
      };

      const method = editingCategory ? 'PATCH' : 'POST';
      const url = editingCategory 
        ? API_ENDPOINTS.getCategoryAdminDetail(editingCategory.id)
        : API_ENDPOINTS.CATEGORIES_ADMIN;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        // DRF can return errors as { field: ["msg"] } or { detail: "..." } or { error: "..." }
        const errorMsg = typeof errData === 'object'
          ? (errData.detail || errData.error || Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '))
          : String(errData);
        throw new Error(errorMsg || `Failed to ${editingCategory ? 'update' : 'save'} category.`);
      }

      toast({
        title: editingCategory ? 'Category Updated' : 'Category Created',
        description: `${newName} has been successfully processed in your taxonomy.`,
      });
      
      resetForm();
      fetchCategories();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.getCategoryAdminDetail(categoryToDelete.id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || 'Failed to delete category from database.');
      }

      toast({
        title: 'Category Deleted',
        description: `Successfully removed ${categoryToDelete.name} from inventory.`
      });
      fetchCategories();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.message
      });
    } finally {
      setCategoryToDelete(null);
    }
  };

  const filteredCategories = categories.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeStatusFilter === "all" || (activeStatusFilter === "active" ? c.is_active : !c.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Layers className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Taxonomy Registry</h1>
            <p className="text-muted-foreground font-medium">Manage hierarchical product groupings and visual assets.</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            resetForm();
            setTimeout(() => { document.body.style.pointerEvents = ""; }, 100);
          }
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-xl shadow-primary/20 h-12 px-8 font-black">
              <Plus className="w-5 h-5" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{editingCategory ? 'Edit Node' : 'Define New Node'}</DialogTitle>
              <DialogDescription className="font-medium">
                {editingCategory 
                  ? `Update parameters for the "${editingCategory.name}" branch.`
                  : 'Add a new classification level to your product tree.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold text-slate-700">Display Label *</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Premium Electronics" 
                  className="h-12 border-slate-200 text-md font-medium"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent" className="text-sm font-bold text-slate-700">Hierarchy Parent</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger className="h-12 bg-white border-slate-200">
                    <SelectValue placeholder="Select parent level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root" className="font-bold">None (Top Level Category)</SelectItem>
                    {rootCategories
                      .filter(c => !editingCategory || c.id !== editingCategory.id)
                      .map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()} className="font-medium">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Assign to organize as a subcategory.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Visual Banner</Label>
                <div 
                  className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 transition-all relative group bg-slate-50/30"
                  onClick={() => document.getElementById('cat-image')?.click()}
                >
                  <input 
                    type="file" 
                    id="cat-image" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange}
                  />
                  {previewUrl ? (
                    <div className="relative h-40 w-full rounded-xl overflow-hidden border bg-white shadow-inner">
                      <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewUrl(null);
                          setSelectedImage(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="bg-white p-4 rounded-full shadow-sm">
                        <ImageIcon className="h-8 w-8 text-slate-300" />
                      </div>
                      <span className="text-xs text-slate-400 font-black uppercase tracking-[0.1em]">Browse System Assets</span>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full font-black h-14 text-md shadow-xl" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Syncing Registry...
                    </>
                  ) : (
                    <>
                      {editingCategory ? <Edit2 className="h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                      {editingCategory ? 'Update Taxonomy' : 'Commit Category'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50/50 border-b p-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Filter nodes by label or slug..." 
                className="pl-11 h-12 bg-white border-slate-200 shadow-sm font-medium" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-white h-12 border-slate-200">
                    <Filter className="w-4 h-4" /> 
                    {activeStatusFilter !== "all" ? "Filter Active" : "Status Filter"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuRadioGroup value={activeStatusFilter} onValueChange={setActiveStatusFilter}>
                    <DropdownMenuRadioItem value="all">All Categories</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="active">Active Only</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="inactive">Inactive Only</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center gap-3 bg-white px-4 h-12 rounded-xl border shadow-sm">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{filteredCategories.length} Total Nodes</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-ping" />
                <Loader2 className="h-12 w-12 text-primary relative animate-spin" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Taxonomy Registry...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b">
                  <TableHead className="w-[100px] font-black uppercase text-[10px] tracking-widest pl-8">Visual</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Node Label</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Slug Path</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Structure</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0">
                    <TableCell className="pl-8">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden border shadow-inner flex items-center justify-center group-hover:bg-white transition-all">
                        {category.image_url ? (
                          <img src={category.image_url} alt={category.name} className="h-full w-full object-cover" />
                        ) : (
                          <Layers className="h-6 w-6 text-slate-300" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 text-lg">{category.name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {category.subcategories_count !== undefined && (
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                              {category.subcategories_count} Subcategories
                            </span>
                          )}
                          {category.product_count !== undefined && (
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                              {category.product_count} Products
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] bg-white border-slate-200 text-slate-500 font-bold px-3 py-1">
                        /{category.slug}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {category.parent ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <FolderTree className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Child of {rootCategories.find(r => r.id === category.parent)?.name || 'Root'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-[0.1em]">Root Node</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-primary transition-colors">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            className="gap-2 font-bold cursor-pointer" 
                            onSelect={(e) => {
                              e.preventDefault();
                              setTimeout(() => handleEditClick(category), 50);
                            }}
                          >
                            <Edit2 className="w-4 h-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 text-destructive focus:text-destructive font-bold cursor-pointer" 
                            onSelect={(e) => {
                              e.preventDefault();
                              setTimeout(() => setCategoryToDelete(category), 50);
                            }}
                          >
                            <Trash2 className="w-4 h-4" /> Purge Node
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && filteredCategories.length === 0 && (
            <div className="py-40 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/20">
              <div className="p-6 bg-white rounded-full shadow-inner ring-1 ring-slate-100">
                <Search className="h-12 w-12 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-600">No nodes matching criteria</h3>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => {
        if (!open) {
          setCategoryToDelete(null);
          setTimeout(() => { document.body.style.pointerEvents = ""; }, 100);
        }
      }}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-black text-2xl">
              <AlertCircle className="w-6 h-6" />
              Purge Taxonomy Node
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium text-base leading-relaxed">
              Are you sure you want to delete <strong>"{categoryToDelete?.name}"</strong>? This will permanently remove the category from the registry. Nodes with active product associations or sub-nodes cannot be purged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold h-12 border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold h-12 px-8 shadow-lg shadow-destructive/20"
            >
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
