'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';
import { 
  Users, 
  Eye, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  BarChart3
} from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      
      const [dashboardRes, funnelRes] = await Promise.all([
        fetch(API_ENDPOINTS.ANALYTICS_DASHBOARD, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(API_ENDPOINTS.ANALYTICS_FUNNEL, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!dashboardRes.ok || !funnelRes.ok) throw new Error('Failed to fetch analytics data');

      const dashboard = await dashboardRes.json();
      const funnel = await funnelRes.json();

      setDashboardData(dashboard);
      setFunnelData(funnel);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Analytics Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full rounded-2xl" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const today = dashboardData?.today || {};
  const history = dashboardData?.history || [];
  const funnel = funnelData?.funnel || [];

  return (
    <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Advanced Analytics</h1>
        <p className="text-slate-500 font-medium">Real-time insights and business performance metrics.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Daily Visits" 
          value={today.visits} 
          icon={<Eye className="w-6 h-6" />} 
          trend={today.trends?.visits || "0%"} 
          positive={!(today.trends?.visits?.startsWith('-'))} 
          description="Total page views today"
        />
        <MetricCard 
          title="Unique Users" 
          value={today.users} 
          icon={<Users className="w-6 h-6" />} 
          trend={today.trends?.users || "0%"} 
          positive={!(today.trends?.users?.startsWith('-'))} 
          description="Distinct visitors today"
        />
        <MetricCard 
          title="Revenue" 
          value={`৳${today.revenue.toLocaleString()}`} 
          icon={<DollarSign className="w-6 h-6" />} 
          trend={today.trends?.revenue || "0%"} 
          positive={!(today.trends?.revenue?.startsWith('-'))} 
          description="Total sales value today"
        />
        <MetricCard 
          title="Conversion" 
          value={`${today.conversion_rate.toFixed(2)}%`} 
          icon={<TrendingUp className="w-6 h-6" />} 
          trend={today.trends?.conversion || "0%"} 
          positive={!(today.trends?.conversion?.startsWith('-'))} 
          description="Visits to orders ratio"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Traffic History Chart */}
        <Card className="rounded-2xl border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Traffic Trends</CardTitle>
                <CardDescription>Daily visits and unique users over the last 30 days</CardDescription>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}} 
                    dy={10}
                    tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '20px'}} />
                  <Line 
                    type="monotone" 
                    dataKey="visits" 
                    name="Visits" 
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    name="Unique Users" 
                    stroke="#10b981" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Funnel Chart */}
        <Card className="rounded-2xl border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Conversion Funnel</CardTitle>
                <CardDescription>Customer journey from landing to purchase</CardDescription>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 text-center">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ left: 50, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="stage" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#1e293b', fontWeight: 'bold', fontSize: 13}} 
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={40}>
                    {funnel.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

function MetricCard({ title, value, icon, trend, positive, description }: any) {
  return (
    <Card className="rounded-2xl border-none shadow-lg shadow-slate-200/40 hover:shadow-xl transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl transition-colors ${positive ? 'bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600' : 'bg-rose-50 group-hover:bg-rose-100 text-rose-600'}`}>
            {icon}
          </div>
          <div className={`flex items-center gap-1 text-sm font-black ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {trend}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-black text-slate-900">{value}</h3>
          <p className="text-slate-400 text-xs font-medium">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
