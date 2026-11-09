"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Truck, 
  Search, 
  ExternalLink, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function CourierListPage() {
  const { toast } = useToast();
  const [courierOrders, setCourierOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Pagination
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>(API_ENDPOINTS.COURIER_LIST);

  const fetchCourierOrders = useCallback(async (url: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch courier orders');
      const data = await response.json();
      setCourierOrders(data.results);
      setNextCursor(data.next);
      setPrevCursor(data.previous);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCourierOrders(currentUrl);
  }, [fetchCourierOrders, currentUrl]);

  const handleSearch = () => {
    let url = API_ENDPOINTS.COURIER_LIST;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter) params.append('status', statusFilter);
    
    const query = params.toString();
    if (query) url += `?${query}`;
    
    setCurrentUrl(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            COURIER REGISTRY
          </h1>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Manage Pathao Deliveries</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by Consignment, Merchant ID, or Customer..." 
            className="pl-10 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} className="h-11 px-6 font-bold">
          Search
        </Button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Order ID</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Merchant ID</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Consignment ID</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Status</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Collectable</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Fee</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Date</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Syncing Registry...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : courierOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center text-slate-500 font-medium">
                  No courier orders found.
                </TableCell>
              </TableRow>
            ) : (
              courierOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-black text-slate-900 text-sm">
                    {order.order_public_id}
                  </TableCell>
                  <TableCell className="font-medium text-slate-500 text-xs">
                    {order.merchant_order_id}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-indigo-600 font-bold">
                    {order.consignment_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-widest bg-indigo-50 text-indigo-700 border-indigo-100">
                      {order.order_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-slate-700">৳{parseFloat(order.amount_to_collect).toLocaleString()}</TableCell>
                  <TableCell className="text-slate-500 text-sm font-medium">৳{parseFloat(order.delivery_fee).toLocaleString()}</TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Link href={`/dashboard/orders/${order.order_public_id}`}>
                        <ExternalLink className="w-4 h-4 text-slate-400 hover:text-primary" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="p-4 border-t bg-slate-50/30 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Showing {courierOrders.length} records
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!prevCursor || loading}
              onClick={() => prevCursor && fetchCourierOrders(prevCursor)}
              className="h-8 px-3 font-bold"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!nextCursor || loading}
              onClick={() => nextCursor && fetchCourierOrders(nextCursor)}
              className="h-8 px-3 font-bold"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
