"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Truck, 
  Save, 
  Loader2, 
  Info, 
  ShieldCheck, 
  MapPin, 
  Percent, 
  RefreshCw,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/lib/api-config';
import { format, isValid } from 'date-fns';

interface DeliverySettings {
  inside_dhaka_charge: string;
  outside_dhaka_charge: string;
  vat_percentage: string;
  tax_percentage: string | null;
  updated_at: string;
}

export default function DeliverySettingsPage() {
  const { toast } = useToast();
  
  // Data State
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form State
  const [insideCharge, setInsideCharge] = useState('');
  const [outsideCharge, setOutsideCharge] = useState('');
  const [vat, setVat] = useState('');
  const [tax, setTax] = useState('');

  const fetchSettings = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.DELIVERY_SETTINGS, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve market configurations.');
      const data = await response.json();
      
      setSettings(data);
      setInsideCharge(parseFloat(data.inside_dhaka_charge).toString());
      setOutsideCharge(parseFloat(data.outside_dhaka_charge).toString());
      setVat(parseFloat(data.vat_percentage).toString());
      setTax(data.tax_percentage ? parseFloat(data.tax_percentage).toString() : '');
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
    fetchSettings();
  }, [fetchSettings]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const token = localStorage.getItem('commercehub_access_token');
      const payload = {
        inside_dhaka_charge: insideCharge,
        outside_dhaka_charge: outsideCharge,
        vat_percentage: vat,
        tax_percentage: tax === '' ? null : tax
      };

      const response = await fetch(API_ENDPOINTS.DELIVERY_SETTINGS, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update delivery parameters.');
      }

      toast({
        title: 'Settings Synchronized',
        description: 'Regional market logic has been updated in real-time.',
      });

      fetchSettings(true);
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

  const safeFormatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return isValid(date) ? format(date, 'MMM dd, yyyy • HH:mm') : 'Invalid Timestamp';
  };

  if (isLoading) {
    return (
      <div className="py-40 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-ping" />
          <Loader2 className="h-12 w-12 text-primary relative animate-spin" />
        </div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Market Rules...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-24 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Regional Configurations</h1>
          </div>
          <p className="text-muted-foreground font-medium">Manage delivery charges, VAT, and tax parameters for the Bangladesh market.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchSettings(true)}
          className="font-bold gap-2 bg-white"
        >
          <RefreshCw className="w-4 h-4" />
          Sync Registry
        </Button>
      </div>

      <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {/* Logistics Configuration */}
          <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <MapPin className="w-6 h-6 text-primary" />
                Logistics Costs (৳)
              </CardTitle>
              <CardDescription>Define shipping fees based on customer location mapping.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inside Dhaka Division</Label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold">৳</span>
                  <Input 
                    type="number"
                    step="0.01"
                    value={insideCharge}
                    onChange={(e) => setInsideCharge(e.target.value)}
                    className="pl-8 h-12 text-md font-black border-slate-200 focus:ring-primary"
                    required
                  />
                </div>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Standard Express Route</p>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Outside Dhaka Division</Label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold">৳</span>
                  <Input 
                    type="number"
                    step="0.01"
                    value={outsideCharge}
                    onChange={(e) => setOutsideCharge(e.target.value)}
                    className="pl-8 h-12 text-md font-black border-slate-200 focus:ring-primary"
                    required
                  />
                </div>
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">Regional Courier Services</p>
              </div>
            </CardContent>
          </Card>

          {/* Taxation & Compliance */}
          <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <Percent className="w-6 h-6 text-primary" />
                Taxation & Compliance
              </CardTitle>
              <CardDescription>Configure global percentage-based markups for order calculations.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">VAT Percentage (%)</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={vat}
                    onChange={(e) => setVat(e.target.value)}
                    className="h-12 pr-8 text-md font-black border-slate-200"
                    required
                  />
                  <span className="absolute right-4 top-3 text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Applies to subtotal before delivery</p>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tax Percentage (%)</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="h-12 pr-8 text-md font-black border-slate-200"
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-3 text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Optional additional tax overhead</p>
              </div>
            </CardContent>
            <CardFooter className="bg-blue-50/30 p-6 flex items-start gap-4">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                These values are used by the <strong>Live Price Calculator</strong> to generate real-time order subtotals and grand totals in the checkout stream.
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* Action Sidebar */}
        <div className="lg:col-span-4 space-y-10">
          <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden">
            <CardHeader className="bg-white/5 border-b p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-primary" />
                Security & Ingestion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Last Modified</span>
                  <p className="text-sm font-bold">{safeFormatDate(settings?.updated_at)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Deployment Node</span>
                  <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Global Production
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-900/30 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-200 leading-relaxed">
                  CRITICAL: Changes to these settings will immediately affect checkout totals for all customers browsing the storefront.
                </p>
              </div>

              <Button 
                type="submit"
                disabled={isUpdating}
                className="w-full h-14 font-black text-md shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Commit Market Rules
              </Button>
            </CardContent>
          </Card>

          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-4">
             <h4 className="font-black text-slate-900 uppercase text-xs tracking-[0.2em]">Calculator Audit</h4>
             <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                   <span>VAT Allocation</span>
                   <span className="text-slate-900">{vat || '0'}%</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                   <span>Tax Allocation</span>
                   <span className="text-slate-900">{tax || '0'}%</span>
                </div>
             </div>
             <Separator className="bg-slate-200" />
             <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                All values must be valid decimals. Percentages are capped at 100.00% by the regional registry.
             </p>
          </div>
        </div>
      </form>
    </div>
  );
}

import { Separator } from '@/components/ui/separator';
