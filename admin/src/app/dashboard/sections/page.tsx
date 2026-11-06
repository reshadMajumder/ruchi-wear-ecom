"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { 
  LayoutGrid, 
  Plus, 
  Search, 
  Loader2, 
  Package, 
  MoreVertical, 
  Edit2, 
  Trash2,
  ArrowUpRight,
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface SectionProduct {
  id: number;
  name: string;
  slug: string;
  primary_image: string | null;
  price_data: {
    final_price: string;
    is_discounted: boolean;
  };
}

interface Section {
  id: number;
  title: string;
  priority: number;
  created_at: string;
  products: SectionProduct[];
}

export default function SectionsListPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SECTIONS_LIST);
      if (!response.ok) throw new Error('Failed to synchronize storefront sections.');
      const data = await response.json();
      setSections(Array.isArray(data) ? data : []);
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
    fetchSections();
  }, [fetchSections]);

  const handleDeleteConfirm = async () => {
    if (!sectionToDelete) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.DELETE_SECTION(sectionToDelete.id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to purge section from storefront.');

      toast({
        title: 'Section Purged',
        description: `"${sectionToDelete.title}" has been removed from the catalog registry.`,
      });

      setSectionToDelete(null);
      fetchSections();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Purge Failed',
        description: err.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSections = sections.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LayoutGrid className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Product Sections</h1>
            <p className="text-muted-foreground">Curate groups of products for featured storefront placement.</p>
          </div>
        </div>
        <Link href="/dashboard/sections/create">
          <Button className="gap-2 shadow-lg font-bold">
            <Plus className="w-4 h-4" />
            New Section
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Filter sections..." 
          className="pl-9 h-10 bg-white" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Storefront Layout...</p>
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="py-32 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-3xl border-2 border-dashed">
          <div className="p-6 bg-white rounded-full shadow-inner ring-1 ring-slate-100">
            <LayoutGrid className="h-12 w-12 text-slate-200" />
          </div>
          <h3 className="text-xl font-bold text-slate-600">No storefront sections found</h3>
          <p className="text-sm text-slate-400 max-w-xs">Create your first section to organize "Featured" or "New Arrival" products.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredSections.map((section) => (
            <Card key={section.id} className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-slate-100 group">
              <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-black text-slate-800">{section.title}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] font-black bg-white border">P{section.priority}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                    <Clock className="w-3 h-3" />
                    Last Updated: {format(new Date(section.created_at), 'MMM dd, yyyy')}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/sections/${section.id}`} className="flex items-center gap-2 cursor-pointer">
                        <Edit2 className="w-4 h-4" /> Edit Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                      onClick={() => setSectionToDelete(section)}
                    >
                      <Trash2 className="w-4 h-4" /> Delete Section
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Product Preview</span>
                    <span className="text-[10px] font-bold text-primary">{section.products.length} Items Linked</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    {section.products.map((product) => (
                      <div key={product.id} className="aspect-square rounded-lg bg-slate-50 border overflow-hidden relative group/prod">
                        {product.primary_image ? (
                          <img src={product.primary_image} alt={product.name} className="h-full w-full object-cover transition-transform group-hover/prod:scale-110" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-200">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/prod:opacity-100 transition-opacity flex items-center justify-center">
                          <Link href={`/dashboard/products/${product.slug}`}>
                            <Button size="icon" variant="ghost" className="text-white h-7 w-7">
                              <ArrowUpRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - section.products.length) }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-lg border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-200">
                        <Plus className="w-4 h-4" />
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex items-center justify-end border-t border-dashed mt-6">
                    <Link href={`/dashboard/sections/${section.id}`}>
                      <Button variant="outline" size="sm" className="font-black text-[10px] uppercase tracking-widest gap-2 bg-white hover:bg-primary hover:text-white transition-all">
                        Edit Section Structure
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!sectionToDelete} onOpenChange={(open) => !open && setSectionToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-black text-2xl">
              <AlertCircle className="w-6 h-6" />
              Purge Section
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium text-base leading-relaxed">
              Are you sure you want to permanently delete <strong>"{sectionToDelete?.title}"</strong>? This will immediately remove this curated block from the public storefront. Products will remain in the catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold h-12 border-slate-200">Keep Section</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold h-12 px-8 shadow-lg shadow-destructive/20"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
