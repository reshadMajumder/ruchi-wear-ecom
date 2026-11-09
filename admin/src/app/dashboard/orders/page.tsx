"use client";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Download, 
  Search, 
  Filter, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  PackageX,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/api-config';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { format, isValid } from 'date-fns';

interface ApiOrder {
  order_id: string;
  public_order_id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_method: string;
  is_paid: boolean;
  total_amount: string;
  created_at: string;
}

interface PaginatedOrders {
  next: string | null;
  previous: string | null;
  results: ApiOrder[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchOrders = useCallback(async (urlOverride?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      let fetchUrl = urlOverride;
      
      if (!fetchUrl) {
        const url = new URL(API_ENDPOINTS.ORDERS_LIST);
        if (searchTerm) url.searchParams.append('search', searchTerm);
        if (statusFilter !== "all") url.searchParams.append('status', statusFilter);
        fetchUrl = url.toString();
      }

      const response = await fetch(fetchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to synchronize with order management API');
      
      const data: PaginatedOrders = await response.json();
      setOrders(data.results || []);
      setNextPageUrl(data.next);
      setPrevPageUrl(data.previous);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while fetching orders.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOrders();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchOrders]);

  const handlePageChange = (url: string | null) => {
    if (url) fetchOrders(url);
  };

  const safeFormatDate = (dateStr: string | undefined | null, formatStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return isValid(date) ? format(date, formatStr) : 'Invalid Date';
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-black text-[10px] uppercase"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-black text-[10px] uppercase"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[10px] uppercase"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-black text-[10px] uppercase"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="font-bold">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Fulfillment Registry</h1>
            <p className="text-muted-foreground font-medium">Monitor and manage global transaction lifecycle.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 shadow-sm bg-white font-bold h-11">
            <Download className="w-4 h-4" />
            Export Log
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50/50 border-b p-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="relative w-full max-md:max-w-none max-w-md">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by ID or Mobile..." 
                className="pl-11 h-12 bg-white border-slate-200 font-medium" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg" className="gap-2 bg-white border-slate-200 font-bold h-12">
                    <Filter className="w-4 h-4 text-primary" /> 
                    {statusFilter === 'all' ? 'Status: All' : `Status: ${statusFilter}`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Lifecycle Status</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                    <DropdownMenuRadioItem value="all" className="font-bold">All Orders</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="pending" className="font-bold">Pending</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="confirmed" className="font-bold">Confirmed</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="completed" className="font-bold">Completed</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="cancelled" className="font-bold">Cancelled</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Transaction Stream...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-40 text-center px-4">
              <PackageX className="h-16 w-16 text-rose-500 mb-6" />
              <h3 className="text-2xl font-black text-slate-800">API Connectivity Issue</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto font-medium">{error}</p>
              <Button variant="outline" size="lg" className="mt-8 font-black border-slate-200" onClick={() => fetchOrders()}>
                Retry Handshake
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-40 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/20">
              <div className="p-6 bg-white rounded-full shadow-inner ring-1 ring-slate-100">
                <ShoppingCart className="h-12 w-12 text-slate-200" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-600">No matching transactions</h3>
                <p className="text-sm text-slate-400 font-medium">Try adjusting your filters or search parameters.</p>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest pl-8">Order ID</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Customer</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Timestamp</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Total Value</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.order_id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0">
                      <TableCell className="font-mono font-black text-primary pl-8 text-sm">{order.public_order_id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-sm capitalize">{order.customer_name}</span>
                          <span className="text-[10px] text-slate-400 font-bold tracking-tighter">{order.customer_phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">
                            {safeFormatDate(order.created_at, 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-base">৳{parseFloat(order.total_amount).toLocaleString()}</span>
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3 h-3 text-slate-300" />
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest",
                              order.is_paid ? "text-emerald-500" : "text-amber-500"
                            )}>
                              {order.is_paid ? 'Secured' : 'Due'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Link href={`/dashboard/orders/${order.public_order_id}`}>
                          <Button variant="ghost" size="sm" className="h-9 gap-2 hover:bg-primary/5 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest rounded-lg">
                            <Eye className="h-4 w-4" />
                            Inspect
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-6 border-t bg-slate-50/30 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Showing <span className="text-slate-900">{orders.length}</span> Records
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 px-6 gap-2 font-black text-[10px] uppercase tracking-widest bg-white border-slate-200" 
                    disabled={!prevPageUrl || isLoading}
                    onClick={() => handlePageChange(prevPageUrl)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 px-6 gap-2 font-black text-[10px] uppercase tracking-widest bg-white border-slate-200"
                    disabled={!nextPageUrl || isLoading}
                    onClick={() => handlePageChange(nextPageUrl)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
