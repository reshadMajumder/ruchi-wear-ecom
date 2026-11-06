"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  PlusCircle, 
  Save, 
  ChevronLeft, 
  Info, 
  Loader2, 
  Ticket, 
  X, 
  AlertCircle,
  Hash,
  Users,
  Phone,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PhoneUsageInput {
  holder_name: string;
  phone_number: string;
  usable_count: number;
}

export default function CreateCouponPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [scope, setScope] = useState('global');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Targeted Scope State
  const [phoneUsages, setPhoneUsages] = useState<PhoneUsageInput[]>([]);
  
  // UI Status
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addPhoneUsage = () => {
    setPhoneUsages([...phoneUsages, { holder_name: '', phone_number: '', usable_count: 1 }]);
  };

  const removePhoneUsage = (index: number) => {
    setPhoneUsages(phoneUsages.filter((_, i) => i !== index));
  };

  const updatePhoneUsage = (index: number, field: keyof PhoneUsageInput, val: string | number) => {
    const updated = [...phoneUsages];
    updated[index] = { ...updated[index], [field]: val };
    setPhoneUsages(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || !value || !startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all mandatory fields marked with an asterisk.',
      });
      return;
    }

    if (scope === 'specific' && phoneUsages.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Recipients Required',
        description: 'Specific coupons require at least one phone usage entry.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: code.toUpperCase(),
        discount_type: discountType,
        scope,
        value: parseFloat(value),
        min_order_amount: parseFloat(minOrderAmount),
        max_discount_amount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        is_active: isActive,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        ...(scope === 'specific' && { phone_usages: phoneUsages })
      };

      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.COUPONS_CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle backend list errors
        const errorMsg = data.non_field_errors?.[0] || data.code?.[0] || data.error || 'Failed to ingest coupon logic.';
        throw new Error(errorMsg);
      }

      toast({
        title: 'Campaign Published',
        description: `Code ${code.toUpperCase()} is now active in the registry.`,
      });

      router.push('/dashboard/coupons');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Ingestion Failed',
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link href="/dashboard/coupons">
            <Button variant="ghost" size="sm" className="pl-0 gap-2 hover:bg-transparent text-primary font-bold">
              <ChevronLeft className="h-4 w-4" />
              Back to Registry
            </Button>
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Define Coupon Logic</h1>
          <p className="text-muted-foreground font-medium">Create targeted incentives and global promotional triggers.</p>
        </div>
        <Button 
          form="coupon-form"
          type="submit" 
          disabled={isSubmitting}
          className="gap-2 shadow-2xl shadow-primary/20 font-black px-10 h-14 text-md transition-all active:scale-95"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSubmitting ? 'Syncing...' : 'Publish Coupon'}
        </Button>
      </div>

      <form id="coupon-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Core Configuration */}
        <div className="lg:col-span-7 space-y-10">
          <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <Ticket className="w-6 h-6 text-primary" />
                Campaign Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-bold text-slate-700">Coupon Identifier (Unique Code) *</Label>
                <div className="relative">
                  <Hash className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                  <Input 
                    id="code" 
                    placeholder="e.g. SUMMER100" 
                    className="h-12 pl-12 text-md font-black uppercase tracking-widest border-slate-200 focus:ring-primary"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Logic Type *</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger className="h-12 font-bold border-slate-200">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage" className="font-bold">Percentage (%)</SelectItem>
                      <SelectItem value="fixed" className="font-bold">Fixed Amount (৳)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Benefit Value *</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="h-12 text-md font-black border-slate-200"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Threshold (Min Order ৳)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="h-12 font-bold border-slate-200"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Discount Cap (Max ৳)</Label>
                  <Input 
                    type="number" 
                    placeholder="No cap" 
                    className="h-12 font-bold border-slate-200"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                Targeting Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Application Window</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Start Time (ISO)</Label>
                    <Input 
                      type="datetime-local" 
                      className="h-12 border-slate-200 font-medium"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">End Time (ISO)</Label>
                    <Input 
                      type="datetime-local" 
                      className="h-12 border-slate-200 font-medium"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-md font-black">Recipient Mapping</Label>
                    <p className="text-xs text-slate-400 font-medium">Define who can trigger this code.</p>
                  </div>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger className="w-[180px] h-10 font-bold bg-white">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global" className="font-bold">Global (Public)</SelectItem>
                      <SelectItem value="specific" className="font-bold">Specific (Targeted)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scope === 'specific' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <ScrollArea className="max-h-[300px] pr-4">
                      <div className="space-y-3">
                        {phoneUsages.map((usage, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border shadow-sm flex items-end gap-3 group relative">
                            <div className="flex-1 space-y-2">
                              <Label className="text-[9px] font-black uppercase text-slate-400">Holder Name</Label>
                              <Input 
                                placeholder="Name" 
                                className="h-9 text-xs font-bold"
                                value={usage.holder_name}
                                onChange={(e) => updatePhoneUsage(idx, 'holder_name', e.target.value)}
                              />
                            </div>
                            <div className="flex-1 space-y-2">
                              <Label className="text-[9px] font-black uppercase text-slate-400">Mobile Number</Label>
                              <Input 
                                placeholder="01XXX..." 
                                className="h-9 text-xs font-bold"
                                value={usage.phone_number}
                                onChange={(e) => updatePhoneUsage(idx, 'phone_number', e.target.value)}
                              />
                            </div>
                            <div className="w-20 space-y-2">
                              <Label className="text-[9px] font-black uppercase text-slate-400">Limit</Label>
                              <Input 
                                type="number" 
                                className="h-9 text-xs font-bold text-center"
                                value={usage.usable_count}
                                onChange={(e) => updatePhoneUsage(idx, 'usable_count', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-slate-300 hover:text-destructive"
                              onClick={() => removePhoneUsage(idx)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-12 border-primary/20 text-primary font-black uppercase tracking-widest text-[10px] bg-white hover:bg-primary/5 transition-all"
                      onClick={addPhoneUsage}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Targeted Recipient
                    </Button>
                  </div>
                )}

                {scope === 'global' && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                    <Info className="w-5 h-5 shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">
                      Global scope coupons can be used by any customer meeting the order threshold. No individual phone mapping is required.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Sidebars */}
        <div className="lg:col-span-5 space-y-10">
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden">
            <CardHeader className="bg-white/5 border-b p-8">
              <CardTitle className="text-xl">Campaign Visibility</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10">
                <div className="space-y-1">
                  <Label className="text-md font-bold">Immediate Activation</Label>
                  <p className="text-[10px] text-slate-400 uppercase font-black">Enable usage triggers</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary rounded-lg shadow-lg">
                      <Ticket className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-black uppercase text-xs tracking-widest">Logic Overview</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-400">Regional Currency</span>
                      <span className="font-bold">BDT (৳)</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-400">Targeting</span>
                      <span className="font-bold uppercase text-primary">{scope}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-400">Market Sync</span>
                      <span className="font-bold text-emerald-400">Real-time Ingestion</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-900/30 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-200 leading-relaxed">
                    CRITICAL: Code identifiers must be unique. Existing codes cannot be overwritten; they must be purged before re-use.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white ring-1 ring-slate-100 p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-slate-50 rounded-full">
                <Phone className="w-8 h-8 text-slate-300" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-800">Support Coordination</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Campaign windows are synchronized with central server time. Ensure dates align with the regional timezone of Bangladesh.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
