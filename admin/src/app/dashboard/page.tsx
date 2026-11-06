'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Tag,
  BarChart3,
  Archive,
  Eye
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const [analyticsRes, statsRes] = await Promise.all([
        fetch(API_ENDPOINTS.ANALYTICS_DASHBOARD, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(API_ENDPOINTS.DASHBOARD_STATS, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!analyticsRes.ok || !statsRes.ok) throw new Error('Failed to fetch dashboard data');

      const analytics = await analyticsRes.json();
      const stats = await statsRes.json();

      setAnalyticsData(analytics);
      setDashboardStats(stats);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  const history = analyticsData?.history || [];
  const yearly = dashboardStats?.yearly || { sales: 0, profit: 0, total_orders: 0, coupon_discount: 0, status_breakdown: [] };
  const stock = dashboardStats?.stock || { total_stock: 0, low_stock_variants: 0 };

  const completedOrders = yearly.status_breakdown?.find((s: any) => s.status === 'completed')?.count || 0;
  const activeOrders = yearly.status_breakdown?.find((s: any) => s.status === 'confirmed')?.count || 0;

  const statsCards = [
    { 
      title: 'Total Revenue', 
      value: `৳${yearly.sales.toLocaleString()}`, 
      change: 'Yearly Aggregate', 
      trend: 'up', 
      icon: DollarSign,
      color: "text-emerald-600"
    },
    { 
      title: 'Total Profit', 
      value: `৳${yearly.profit.toLocaleString()}`, 
      change: 'Net Margin', 
      trend: 'up', 
      icon: TrendingUp,
      color: "text-emerald-500"
    },
    { 
      title: 'Completed Orders', 
      value: completedOrders.toString(), 
      change: 'Fulfillment Success', 
      trend: 'up', 
      icon: CheckCircle2,
      color: "text-blue-600"
    },
    { 
      title: 'Active Orders', 
      value: activeOrders.toString(), 
      change: 'In Pipeline', 
      trend: 'neutral', 
      icon: Clock,
      color: "text-amber-500"
    },
    { 
      title: 'Total Stock', 
      value: stock.total_stock.toString(), 
      change: 'Global Inventory', 
      trend: 'neutral', 
      icon: Archive,
      color: "text-slate-600"
    },
    { 
      title: 'Low Stock Alerts', 
      value: stock.low_stock_variants.toString(), 
      change: 'Requires Attention', 
      trend: 'down', 
      icon: AlertCircle,
      color: "text-rose-500"
    },
    { 
      title: 'Coupon Discounts', 
      value: `৳${yearly.coupon_discount.toLocaleString()}`, 
      change: 'Campaign Cost', 
      trend: 'down', 
      icon: Tag,
      color: "text-indigo-500"
    },
    { 
      title: 'Total Orders', 
      value: yearly.total_orders.toString(), 
      change: 'Lifetime Volume', 
      trend: 'up', 
      icon: ShoppingCart,
      color: "text-slate-900"
    },
  ];

  const chartDataFinal = history.slice(-7).map((item: any) => ({
    name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
    orders: item.orders,
    visits: item.visits
  }));

  const chartDataDisplay = chartDataFinal.length > 0 ? chartDataFinal : [
    { name: 'Mon', orders: 0 }, { name: 'Tue', orders: 0 }, { name: 'Wed', orders: 0 },
    { name: 'Thu', orders: 0 }, { name: 'Fri', orders: 0 }, { name: 'Sat', orders: 0 }, { name: 'Sun', orders: 0 },
  ];

  const mostSold = dashboardStats?.most_sold_products || [];

  return (
    <div className="space-y-8 pb-12">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden group hover:ring-primary/20 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.title}</CardTitle>
              <div className={cn("p-2 rounded-lg bg-slate-50 group-hover:bg-primary/5 transition-colors", stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">{stat.value}</div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-xl bg-white ring-1 ring-slate-100">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Sales Velocity</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Transaction volume distribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] w-full pt-4 px-8 pb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataDisplay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--primary)/0.05)', radius: 4 }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-xl bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16" />
          <CardHeader className="p-8 border-b border-white/5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Top Performers</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-500">Highest revenue generation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6 relative z-10">
            {mostSold.map((product: any, i: number) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-primary text-xs border border-white/5 group-hover:bg-primary group-hover:text-white transition-all">
                    {i + 1}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold leading-none group-hover:text-primary transition-colors">{product.product_name}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{product.sold_quantity} Units Sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">৳{parseFloat(product.revenue).toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Growth Positive</p>
                </div>
              </div>
            ))}
            
            <div className="pt-6 mt-6 border-t border-white/5">
               <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Inventory Status</p>
                    <p className="text-sm font-bold">{stock.total_stock} Total Units</p>
                  </div>
                  <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[75%]" />
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
