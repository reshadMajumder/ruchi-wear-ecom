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
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Percent,
  Calendar,
  CheckCircle2,
  XCircle,
  Tag,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  Save,
  X
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ApiDiscount {
  id: number;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: string;
  scope: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  priority: number;
  image_url: string | null;
  make_card: boolean;
}

export default function DiscountsListPage() {
  const [discounts, setDiscounts] = useState<ApiDiscount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Edit State
  const [editingDiscount, setEditingDiscount] = useState<ApiDiscount | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editMakeCard, setEditMakeCard] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [discountToDelete, setDiscountToDelete] = useState<ApiDiscount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const fetchDiscounts = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.DISCOUNT_LIST, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to synchronize with discount registry.');
      const data = await response.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleEditClick = (discount: ApiDiscount) => {
    setEditingDiscount(discount);
    setEditName(discount.name);
    setEditValue(parseFloat(discount.value).toString());
    setEditPriority(discount.priority.toString());
    setEditIsActive(discount.is_active);
    setEditMakeCard(discount.make_card);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiscount) return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const payload = {
        name: editName,
        value: parseFloat(editValue),
        priority: parseInt(editPriority),
        is_active: editIsActive,
        make_card: editMakeCard
      };

      const response = await fetch(API_ENDPOINTS.UPDATE_DISCOUNT(editingDiscount.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to update promotion.');
      }

      toast({
        title: 'Promotion Updated',
        description: `${editName} successfully synchronized with catalog rules.`,
      });

      setIsEditDialogOpen(false);
      fetchDiscounts(true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!discountToDelete) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.DELETE_DISCOUNT(discountToDelete.id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.message || 'Failed to remove promotion.');
      }

      toast({
        title: 'Promotion Removed',
        description: 'The discount logic has been purged from the active registry.',
      });

      setDiscountToDelete(null);
      fetchDiscounts(true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: err.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDiscounts = discounts.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.scope.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Percent className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Discount Intelligence
              {isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-muted-foreground">Comprehensive overview of active promotional campaigns.</p>
          </div>
        </div>
        <Link href="/dashboard/discounts/create">
          <Button className="gap-2 shadow-lg font-bold">
            <Plus className="w-4 h-4" />
            New Discount
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search promotions..." 
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
              <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing Promotions...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/50">
                  <TableHead className="font-bold">Promotion Name</TableHead>
                  <TableHead className="font-bold">Value</TableHead>
                  <TableHead className="font-bold">Scope</TableHead>
                  <TableHead className="font-bold">Active Window</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiscounts.map((discount) => (
                  <TableRow key={discount.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center border shadow-sm overflow-hidden">
                          {discount.image_url ? (
                            <img src={discount.image_url} alt="Promo" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-700">{discount.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{discount.discount_type}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-black text-primary text-base">
                        {discount.discount_type === 'percentage' 
                          ? `${parseFloat(discount.value)}%` 
                          : `৳${parseFloat(discount.value).toLocaleString()}`
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize bg-slate-50 border-slate-200 font-bold px-3">
                        <Tag className="w-3 h-3 mr-1.5 text-primary" />
                        {discount.scope}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-[11px] text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {format(new Date(discount.start_date), 'MMM d, yy')} — {format(new Date(discount.end_date), 'MMM d, yy')}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {discount.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-bold">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-50 font-bold">
                            <XCircle className="w-3 h-3 mr-1" /> Expired
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2 font-medium cursor-pointer" onClick={() => handleEditClick(discount)}>
                            <Edit2 className="w-4 h-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive font-medium cursor-pointer" onClick={() => setDiscountToDelete(discount)}>
                            <Trash2 className="w-4 h-4" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && filteredDiscounts.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center gap-2">
              <Search className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-muted-foreground font-medium italic">No promotions found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Promotion Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Edit Promotion</DialogTitle>
            <DialogDescription className="font-medium">
              Update partial details for campaign logic synchronization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Campaign Label</Label>
              <Input 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                className="h-12 font-bold" 
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Discount Value</Label>
                <Input 
                  type="number"
                  value={editValue} 
                  onChange={(e) => setEditValue(e.target.value)} 
                  className="h-12 font-black text-primary" 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">System Priority</Label>
                <Input 
                  type="number"
                  value={editPriority} 
                  onChange={(e) => setEditPriority(e.target.value)} 
                  className="h-12 font-bold" 
                />
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Active Status</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Rule visibility</p>
                </div>
                <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Promotion Card</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Visual display</p>
                </div>
                <Switch checked={editMakeCard} onCheckedChange={setEditMakeCard} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full h-12 font-black shadow-lg" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                {isUpdating ? 'Synchronizing...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!discountToDelete} onOpenChange={(open) => !open && setDiscountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Remove Promotion
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-600">
              Are you sure you want to permanently delete <strong>"{discountToDelete?.name}"</strong>? This will remove all associated discounting logic from your catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold px-6"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
