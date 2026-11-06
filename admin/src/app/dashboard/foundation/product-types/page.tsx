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
  Settings2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
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
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';

interface ApiProductType {
  id: number;
  name: string;
}

export default function ProductTypesPage() {
  const [productTypes, setProductTypes] = useState<ApiProductType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState<ApiProductType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<ApiProductType | null>(null);
  const { toast } = useToast();

  const fetchProductTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.PRODUCT_TYPES, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to synchronize product types');
      const data = await response.json();
      setProductTypes(Array.isArray(data) ? data : []);
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
    fetchProductTypes();
  }, [fetchProductTypes]);

  const resetForm = () => {
    setEditingType(null);
    setNewTypeName("");
    setIsDialogOpen(false);
  };

  const handleEditClick = (type: ApiProductType) => {
    setEditingType(type);
    setNewTypeName(type.name);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const method = editingType ? 'PATCH' : 'POST';
      const url = editingType 
        ? API_ENDPOINTS.getProductTypeAdminDetail(editingType.id)
        : API_ENDPOINTS.PRODUCT_TYPES;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newTypeName })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || `Failed to ${editingType ? 'update' : 'create'} product type.`);
      }

      toast({
        title: editingType ? 'Type Updated' : 'Type Created',
        description: `${newTypeName} has been successfully saved.`,
      });
      
      resetForm();
      fetchProductTypes();
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
    if (!typeToDelete) return;

    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.getProductTypeAdminDetail(typeToDelete.id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || 'Failed to delete product type.');
      }

      toast({
        title: 'Type Deleted',
        description: `Successfully removed ${typeToDelete.name}.`
      });
      fetchProductTypes();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.message
      });
    } finally {
      setTypeToDelete(null);
    }
  };

  const filteredTypes = productTypes.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Product Types</h1>
            <p className="text-muted-foreground">Define logical groups for your product variants and attributes.</p>
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
            <Button className="gap-2 shadow-lg">
              <Plus className="w-4 h-4" />
              Add Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingType ? 'Edit Product Type' : 'Create Product Type'}</DialogTitle>
              <DialogDescription>
                {editingType 
                  ? `Update the classification details for ${editingType.name}.` 
                  : 'Add a new classification for your products. This will define what attributes can be applied.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold">Type Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Clothings, Electronics" 
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full font-bold h-11" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {isSubmitting ? 'Saving...' : 'Save Product Type'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search types..." 
                className="pl-9 h-10 bg-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing Types...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/50">
                  <TableHead className="font-bold">ID</TableHead>
                  <TableHead className="font-bold">Type Name</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.map((type) => (
                  <TableRow key={type.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="font-mono text-xs text-muted-foreground">#{type.id}</TableCell>
                    <TableCell className="font-bold text-slate-700">{type.name}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer font-bold" 
                            onSelect={(e) => {
                              e.preventDefault();
                              setTimeout(() => handleEditClick(type), 50);
                            }}
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 text-destructive focus:text-destructive cursor-pointer font-bold"
                            onSelect={(e) => {
                              e.preventDefault();
                              setTimeout(() => setTypeToDelete(type), 50);
                            }}
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && filteredTypes.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center gap-2">
              <Search className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-muted-foreground font-medium italic">No product types found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!typeToDelete} onOpenChange={(open) => {
        if (!open) {
          setTypeToDelete(null);
          setTimeout(() => { document.body.style.pointerEvents = ""; }, 100);
        }
      }}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-black text-2xl">
              <AlertCircle className="w-6 h-6" />
              Purge Product Type
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium text-base leading-relaxed">
              Are you sure you want to delete the product type <strong>"{typeToDelete?.name}"</strong>? 
              This action cannot be undone. Product types cannot be deleted if they are currently assigned to active products.
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
