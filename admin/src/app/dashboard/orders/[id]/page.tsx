"use client";

import { use, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Package
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CourierDialog } from '@/components/courier/courier-dialog';
import { Truck } from 'lucide-react';

interface AttributeValue {
  attribute: string;
  value: string;
}

interface OrderItem {
  product_name: string;
  variant_id: number;
  variant_sku: string;
  attribute_values: AttributeValue[];
  quantity: number;
  price_at_purchase: string;
  actual_selling_price: string;
}

interface OrderDetail {
  order_id: string; // UUID
  public_order_id: string;
  customer_name: string;
  customer_phone: string;
  division: string;
  city: string;
  detailed_address: string;
  address: string;
  status: string;
  total_amount: string;
  total_amount_before_discount: string;
  coupon_code: string | null;
  coupon_discount_amount: string;
  delivery_charge: string;
  vat_amount: string;
  tax_amount: string;
  items: OrderItem[];
  payment_method: string;
  is_paid: boolean;
  created_at: string;
}

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // public_order_id
  const { toast } = useToast();
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [courierOrder, setCourierOrder] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);
  const [buyer, setBuyer] = useState({
    customer_name: '',
    customer_phone: '',
    division: '',
    city: '',
    detailed_address: '',
  });
  const [isSavingBuyer, setIsSavingBuyer] = useState(false);

  const fetchCourierStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.COURIER_DELIVERY_STATUS(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCourierOrder(data);
      } else {
        setCourierOrder(null);
      }
    } catch (err) {
      console.error('Failed to fetch courier status:', err);
    }
  }, [id]);

  const fetchOrderDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.ORDER_DETAILS(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Statement data unavailable.');
      const data = await response.json();
      setOrder(data);
      setBuyer({
        customer_name: data.customer_name || '',
        customer_phone: data.customer_phone || '',
        division: data.division || '',
        city: data.city || '',
        detailed_address: data.detailed_address || '',
      });
      
      // Also fetch courier status
      fetchCourierStatus();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast, fetchCourierStatus]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleStatusTransition = async (action: 'confirm' | 'complete' | 'cancel') => {
    if (!order) return;
    
    setIsTransitioning(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      let endpoint = '';
      const orderInternalId = order.order_id; // UUID

      if (action === 'confirm') endpoint = API_ENDPOINTS.CONFIRM_ORDER(orderInternalId);
      if (action === 'complete') endpoint = API_ENDPOINTS.COMPLETE_ORDER(orderInternalId);
      if (action === 'cancel') endpoint = API_ENDPOINTS.CANCEL_ORDER(orderInternalId);

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} order.`);
      }

      toast({
        title: 'Registry Updated',
        description: `Order successfully ${action}ed.`,
      });

      fetchOrderDetails();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: err.message
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSaveBuyer = async () => {
    if (!order) return;
    setIsSavingBuyer(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.UPDATE_ORDER(order.order_id), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buyer),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update the order.');
      toast({ title: 'Order updated', description: order.public_order_id });
      fetchOrderDetails();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: err.message });
    } finally {
      setIsSavingBuyer(false);
    }
  };

  const safeFormatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return isValid(date) ? format(date, 'MMM dd, yyyy') : 'Invalid Date';
  };

  if (isLoading) {
    return (
      <div className="py-40 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Statement...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-6">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-xl font-bold">Order Not Found</h3>
        <Button asChild variant="outline">
          <Link href="/dashboard/orders">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4">
      {/* Back Navigation */}
      <div className="print:hidden">
        <Button asChild variant="ghost" size="sm" className="pl-0 text-primary font-bold hover:bg-transparent">
          <Link href="/dashboard/orders">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Fulfillment Registry
          </Link>
        </Button>
      </div>

      {/* Main Statement Document */}
      <div id="order-statement" className="bg-white border shadow-sm rounded-lg overflow-hidden">
        {/* Document Header */}
        <div className="p-8 md:p-12 border-b bg-slate-50/30">
          <div className="flex flex-col md:flex-row justify-between gap-6 items-start">
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">ADURYSGALLERY</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Official Order Statement</p>
            </div>
            <div className="text-left md:text-right space-y-2">
              <div className="flex items-center md:justify-end gap-3">
                <span className="text-sm font-black text-slate-900">{order.public_order_id}</span>
                <Badge variant="outline" className={cn(
                  "font-bold text-[10px] uppercase tracking-widest",
                  order.status === 'pending' && "bg-amber-50 text-amber-700 border-amber-200",
                  order.status === 'confirmed' && "bg-blue-50 text-blue-700 border-blue-200",
                  order.status === 'completed' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                  order.status === 'cancelled' && "bg-rose-50 text-rose-700 border-rose-200"
                )}>
                  {order.status}
                </Badge>
                {courierOrder && (
                  <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-widest bg-indigo-50 text-indigo-700 border-indigo-200">
                    {courierOrder.current_status || 'Courier Added'}
                  </Badge>
                )}
              </div>
              {courierOrder && (
                <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Consignment: {courierOrder.consignment_id}</p>
              )}
              <p className="text-xs font-medium text-slate-500">Issued: {safeFormatDate(order.created_at)}</p>
              <p className="text-[10px] font-black uppercase text-slate-400">Payment: {order.payment_method.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b pb-1.5">Customer Information</h3>
            <div className="space-y-0.5">
              <p className="font-black text-slate-900">{order.customer_name}</p>
              <p className="text-sm font-bold text-slate-600">{order.customer_phone}</p>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b pb-1.5">Shipping Destination</h3>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-slate-800">{order.detailed_address}</p>
              <p className="text-sm font-medium text-slate-500 uppercase">{order.city}, {order.division}</p>
              <p className="text-[10px] font-black text-primary/70 tracking-widest mt-1">BANGLADESH REGIONAL HUB</p>
            </div>
          </div>
        </div>

        {order.status === 'pending' && (
          <form
            className="print:hidden px-8 md:px-12 pb-8 grid grid-cols-1 sm:grid-cols-2 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleSaveBuyer();
            }}
          >
            <Input value={buyer.customer_name} onChange={(e) => setBuyer({ ...buyer, customer_name: e.target.value })} placeholder="Name" aria-label="Customer name" />
            <Input value={buyer.customer_phone} onChange={(e) => setBuyer({ ...buyer, customer_phone: e.target.value })} placeholder="Phone" aria-label="Phone" />
            <Input value={buyer.division} onChange={(e) => setBuyer({ ...buyer, division: e.target.value })} placeholder="Division" aria-label="Division" />
            <Input value={buyer.city} onChange={(e) => setBuyer({ ...buyer, city: e.target.value })} placeholder="City" aria-label="City" />
            <Input className="sm:col-span-2" value={buyer.detailed_address} onChange={(e) => setBuyer({ ...buyer, detailed_address: e.target.value })} placeholder="Address" aria-label="Address" />
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={isSavingBuyer}>
                {isSavingBuyer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save details'}
              </Button>
            </div>
          </form>
        )}

        {/* Items Table */}
        <div className="px-8 md:p-12 pt-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] font-black uppercase text-[10px] text-slate-400 tracking-widest">Qty</TableHead>
                <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Item Description</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] text-slate-400 tracking-widest">Unit Price</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] text-slate-400 tracking-widest">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-transparent border-slate-100">
                  <TableCell className="font-black text-slate-600">{item.quantity}</TableCell>
                  <TableCell>
                    <div className="space-y-1 py-1">
                      <p className="font-black text-slate-800 text-sm leading-tight">{item.product_name}</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 rounded border">{item.variant_sku}</span>
                        {item.attribute_values.map((av, avIdx) => (
                          <span key={avIdx} className="text-[9px] font-black uppercase text-primary/60">
                            {av.attribute}: {av.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-500 text-xs tabular-nums">
                    ৳{parseFloat(item.price_at_purchase).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-900 text-sm tabular-nums">
                    ৳{(parseFloat(item.price_at_purchase) * item.quantity).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Financial Summary */}
        <div className="p-8 md:p-12 pt-0 flex justify-end">
          <div className="w-full max-w-[280px] space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span className="uppercase tracking-widest">Subtotal</span>
              <span className="text-slate-900">৳{parseFloat(order.total_amount_before_discount).toLocaleString()}</span>
            </div>
            
            {parseFloat(order.coupon_discount_amount) > 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                <span className="uppercase tracking-widest flex items-center gap-2">Discount ({order.coupon_code})</span>
                <span>-৳{parseFloat(order.coupon_discount_amount).toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span className="uppercase tracking-widest">Delivery Fee</span>
              <span className="text-slate-900">৳{parseFloat(order.delivery_charge).toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-slate-400 italic">
              <span className="uppercase tracking-widest">VAT / Tax</span>
              <span>৳{(parseFloat(order.vat_amount) + parseFloat(order.tax_amount)).toLocaleString()}</span>
            </div>

            <Separator className="my-2 bg-slate-200" />

            <div className="flex justify-between items-center pt-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Total Amount</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Currency (BDT)</span>
              </div>
              <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">
                ৳{parseFloat(order.total_amount).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Seal */}
        <div className="p-8 bg-slate-50/50 border-t text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Digital Verification Sealed Order • Autogenerated by Ruchi Wear
          </p>
        </div>
      </div>

      {/* Action Controls - Print Hidden */}
      <div className="flex flex-wrap items-center justify-between gap-6 p-6 bg-slate-900 rounded-xl text-white shadow-xl print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {order.status === 'pending' && (
            <Button 
              onClick={() => handleStatusTransition('confirm')} 
              disabled={isTransitioning}
              className="bg-primary hover:bg-primary/90 font-black text-xs uppercase tracking-widest px-6 h-11"
            >
              {isTransitioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Confirm Order
            </Button>
          )}

          {order.status === 'confirmed' && (
            <Button 
              onClick={() => handleStatusTransition('complete')} 
              disabled={isTransitioning}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-6 h-11"
            >
              {isTransitioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
              Mark Delivered
            </Button>
          )}

          {order.status === 'confirmed' && !courierOrder && (
            <Button 
              onClick={() => setIsCourierDialogOpen(true)} 
              disabled={isTransitioning}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-6 h-11"
            >
              <Truck className="w-4 h-4 mr-2" />
              Add to Courier
            </Button>
          )}

          {(order.status === 'pending' || order.status === 'confirmed') && (
            <Button 
              variant="ghost" 
              onClick={() => handleStatusTransition('cancel')} 
              disabled={isTransitioning}
              className="font-black text-xs uppercase tracking-widest text-rose-400 hover:text-rose-300 hover:bg-white/5 h-11 px-6"
            >
              Cancel Order
            </Button>
          )}
        </div>

        <Button variant="outline" className="gap-2 font-black text-xs uppercase tracking-widest h-11 px-6 bg-white/5 border-white/10 hover:bg-white/10" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          Print Statement
        </Button>
      </div>

      <CourierDialog 
        order={order} 
        open={isCourierDialogOpen} 
        onOpenChange={setIsCourierDialogOpen}
        onSuccess={fetchCourierStatus}
      />

      {/* Print-specific overrides */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          header, footer, nav, aside, .print\:hidden { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          #order-statement { 
            border: none !important; 
            box-shadow: none !important; 
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bg-slate-50\/30 { background-color: transparent !important; }
          .bg-slate-50\/50 { background-color: transparent !important; }
          .border-b { border-bottom: 1px solid #e2e8f0 !important; }
          .text-slate-400 { color: #94a3b8 !important; }
          .text-slate-500 { color: #64748b !important; }
          .text-primary { color: #0f172a !important; }
        }
      `}</style>
    </div>
  );
}
