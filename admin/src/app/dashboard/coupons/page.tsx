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
  Ticket,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Save,
  Users,
  ChevronLeft,
  ChevronRight,
  Hash
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
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

interface PhoneUsage {
  id: number;
  holder_name: string;
  phone_number: string;
  usable_count: number;
  used_count: number;
}

interface ApiCoupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  scope: 'global' | 'specific';
  value: string;
  min_order_amount: string;
  max_discount_amount: string | null;
  is_active: boolean;
  start_date: string;
  end_date: string;
  phone_usages?: PhoneUsage[];
}

interface PaginatedCoupons {
  next: string | null;
  previous: string | null;
  results: ApiCoupon[];
}

export default function CouponsListPage() {
  const [coupons, setCoupons] = useState<ApiCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pagination
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);

  // Edit State
  const [editingCoupon, setEditingCoupon] = useState<ApiCoupon | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editMaxDiscount, setEditMaxDiscount] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [couponToDelete, setCouponToDelete] = useState<ApiCoupon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const fetchCoupons = useCallback(async (urlOverride?: string, quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const fetchUrl = urlOverride || API_ENDPOINTS.COUPONS_LIST;
      
      const response = await fetch(fetchUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Registry synchronization failed.');
      const data: PaginatedCoupons = await response.json();
      setCoupons(data.results || []);
      setNextPageUrl(data.next);
      setPrevPageUrl(data.previous);
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
    fetchCoupons();
  }, [fetchCoupons]);

  const handleEditClick = (coupon: ApiCoupon) => {
    setEditingCoupon(coupon);
    setEditValue(parseFloat(coupon.value).toString());
    setEditIsActive(coupon.is_active);
    setEditMaxDiscount(coupon.max_discount_amount ? parseFloat(coupon.max_discount_amount).toString() : "");
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const payload = {
        value: parseFloat(editValue),
        is_active: editIsActive,
        max_discount_amount: editMaxDiscount ? parseFloat(editMaxDiscount) : null
      };

      const response = await fetch(API_ENDPOINTS.COUPON_UPDATE_DELETE(editingCoupon.id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Update failed.');
      }

      toast({
        title: 'Coupon Synchronized',
        description: `Code ${editingCoupon.code} has been successfully updated.`,
      });

      setIsEditDialogOpen(false);
      fetchCoupons(undefined, true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Error',
        description: err.message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!couponToDelete) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.COUPON_UPDATE_DELETE(couponToDelete.id), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Purge operation failed.');

      toast({
        title: 'Coupon Purged',
        description: 'Code has been removed from the registry.',
      });

      setCouponToDelete(null);
      fetchCoupons(undefined, true);
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

  const safeFormatDate = (dateStr: string | undefined | null, formatStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return isValid(date) ? format(date, formatStr) : 'Invalid Date';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Ticket className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              Coupon Registry
              {isRefreshing && <Loader2 className="w-5 h-5 animate-spin text-slate-300" />}
            </h1>
            <p className="text-muted-foreground font-medium">Manage promotional codes and targeted rewards.</p>
          </div>
        </div>
        <Link href="/dashboard/coupons/create">
          <Button className="gap-2 shadow-xl shadow-primary/20 font-black h-12 px-8 text-md">
            <Plus className="w-5 h-5" />
            New Coupon
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white ring-1 ring-slate-100">
        <CardContent className="p-0 min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-ping" />
                <Loader2 className="h-12 w-12 text-primary relative animate-spin" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing campaign stream...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="py-40 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/20">
              <div className="p-6 bg-white rounded-full shadow-inner ring-1 ring-slate-100">
                <Ticket className="h-12 w-12 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-600">No coupons active</h3>
              <p className="text-sm text-slate-400 font-medium">Create your first code to start incentivizing customers.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest pl-8">Coupon Identity</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Benefit Value</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Scope</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Active Window</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center border shadow-sm group-hover:bg-white group-hover:border-primary/20 transition-all">
                            <Hash className="w-5 h-5 text-primary/60" />
                          </div>
                          <div>
                            <span className="font-black text-slate-900 text-lg uppercase tracking-tight">{coupon.code}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{coupon.discount_type}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-primary text-xl">
                            {coupon.discount_type === 'percentage' 
                              ? `${parseFloat(coupon.value)}%` 
                              : `৳${parseFloat(coupon.value).toLocaleString()}`
                            }
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Min: ৳{parseFloat(coupon.min_order_amount).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "capitalize font-black text-[10px] tracking-widest px-3 py-1 border-none",
                          coupon.scope === 'global' ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                        )}>
                          {coupon.scope === 'global' ? <Users className="w-3 h-3 mr-1.5" /> : <Ticket className="w-3 h-3 mr-1.5" />}
                          {coupon.scope}
                        </Badge>
                        {coupon.scope === 'specific' && coupon.phone_usages && (
                          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase pl-1">
                            {coupon.phone_usages.length} Recipients
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">
                              {safeFormatDate(coupon.start_date, 'MMM dd')} — {safeFormatDate(coupon.end_date, 'MMM dd')}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 uppercase">Exp: {safeFormatDate(coupon.end_date, 'yyyy')}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 font-black text-[10px] uppercase px-3 py-1">
                            <CheckCircle2 className="w-3 h-3 mr-1.5" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-400 border-slate-200 font-black text-[10px] uppercase px-3 py-1">
                            <XCircle className="w-3 h-3 mr-1.5" /> Paused
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-primary transition-colors">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2 font-bold cursor-pointer" onClick={() => handleEditClick(coupon)}>
                              <Edit2 className="w-4 h-4" /> Edit Parameters
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive font-bold cursor-pointer" onClick={() => setCouponToDelete(coupon)}>
                              <Trash2 className="w-4 h-4" /> Purge Coupon
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-6 border-t bg-slate-50/30 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Cursor Status: <span className="text-slate-900">{coupons.length} Active Records</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 px-6 gap-2 font-black text-[10px] uppercase tracking-widest bg-white border-slate-200" 
                    disabled={!prevPageUrl || isLoading}
                    onClick={() => fetchCoupons(prevPageUrl!)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 px-6 gap-2 font-black text-[10px] uppercase tracking-widest bg-white border-slate-200"
                    disabled={!nextPageUrl || isLoading}
                    onClick={() => fetchCoupons(nextPageUrl!)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Coupon Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-primary" />
              Edit Coupon
            </DialogTitle>
            <DialogDescription className="font-medium">
              Update performance parameters for code <strong>{editingCoupon?.code}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Discount Value</Label>
              <Input 
                type="number"
                value={editValue} 
                onChange={(e) => setEditValue(e.target.value)} 
                className="h-12 font-black text-xl text-primary" 
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Max Discount Cap (Optional)</Label>
              <Input 
                type="number"
                value={editMaxDiscount} 
                onChange={(e) => setEditMaxDiscount(e.target.value)} 
                className="h-12 font-bold" 
                placeholder="No limit"
              />
            </div>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-slate-50/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Campaign Status</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Enable usage tracking</p>
                </div>
                <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full h-14 font-black shadow-xl" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                Synchronize Registry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!couponToDelete} onOpenChange={(open) => !open && setCouponToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-black text-2xl">
              <AlertCircle className="w-6 h-6" />
              Purge Coupon
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium text-base leading-relaxed">
              Are you sure you want to permanently delete code <strong>"{couponToDelete?.code}"</strong>? This will immediately invalidate all existing instances and usage history in the regional market.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold h-12 border-slate-200">Keep Campaign</AlertDialogCancel>
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
