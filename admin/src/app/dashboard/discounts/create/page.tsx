"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Save, ChevronLeft, Info, Loader2, ImageIcon, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/lib/api-config';

export default function CreateDiscountPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Form State
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [value, setValue] = useState('');
  const [scope, setScope] = useState('global');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [makeCard, setMakeCard] = useState(false);
  
  // Image State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // UI Status
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !value || !startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields marked with an asterisk.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = '';

      // 1. Upload to Django Backend if image selected
      if (selectedFile) {
        const token = localStorage.getItem('commercehub_access_token');
        const formData = new FormData();
        formData.append('image', selectedFile);
        const uploadRes = await fetch(API_ENDPOINTS.IMAGE_UPLOAD, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Could not upload image to storage.');
        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.image_url;
      }

      // 2. Prepare Payload
      const payload = {
        name,
        discount_type: discountType,
        value: parseFloat(value),
        scope,
        is_active: isActive,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        priority: parseInt(priority),
        image_url: finalImageUrl,
        make_card: makeCard,
      };

      // 3. Send to API
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.CREATE_DISCOUNT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create promotion logic.');
      }

      toast({
        title: 'Promotion Created',
        description: `${name} has been successfully added to the active registry.`,
      });

      router.push('/dashboard/discounts');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/discounts">
          <Button variant="ghost" size="sm" className="pl-0 gap-2 hover:bg-transparent text-primary font-bold">
            <ChevronLeft className="h-4 w-4" />
            Back to List
          </Button>
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          <PlusCircle className="text-primary h-10 w-10" />
          Create Promotion
        </h1>
        <p className="text-lg text-muted-foreground">Define logical rules for seasonal discounts and flash sales.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 space-y-8">
          <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-xl">Campaign Configuration</CardTitle>
              <CardDescription>Core logic and parameters for the promotion.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold">Campaign Name *</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Winter Clearance 2024" 
                  className="h-12 border-slate-200" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Discount Type *</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value" className="text-sm font-bold">Discount Value *</Label>
                  <Input 
                    id="value" 
                    type="number" 
                    placeholder="0" 
                    className="h-12 border-slate-200" 
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Application Scope *</Label>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (Full Catalog)</SelectItem>
                      <SelectItem value="product">Specific Products</SelectItem>
                      <SelectItem value="category">Specific Categories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-bold">System Priority</Label>
                  <Input 
                    id="priority" 
                    type="number" 
                    placeholder="0" 
                    className="h-12 border-slate-200" 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-xl">Active Window</CardTitle>
              <CardDescription>Define when this promotion will be visible and applicable.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-sm font-bold">Start Date & Time *</Label>
                <Input 
                  type="datetime-local" 
                  className="h-12 border-slate-200" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">End Date & Time *</Label>
                <Input 
                  type="datetime-local" 
                  className="h-12 border-slate-200" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/30 p-6 flex items-center gap-3">
              <Info className="w-5 h-5 text-primary" />
              <p className="text-xs font-medium text-slate-500 italic">
                Dates are synchronized with the regional BDT (৳) market schedule.
              </p>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-4 space-y-8">
          <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg">Campaign Assets</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Label className="text-sm font-bold text-slate-700">Promotion Banner</Label>
              <div 
                className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 transition-all bg-slate-50/30 relative min-h-[160px] flex items-center justify-center"
                onClick={() => document.getElementById('promo-image')?.click()}
              >
                <input 
                  id="promo-image"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {previewUrl ? (
                  <div className="relative w-full h-full">
                    <img src={previewUrl} alt="Preview" className="rounded-lg object-cover w-full h-40 border" />
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearImage();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-3 rounded-full shadow-sm">
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Banner</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Immediate Activation</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Visible in store</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Generate Promo Card</Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Visual display</p>
                </div>
                <Switch checked={makeCard} onCheckedChange={setMakeCard} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5 text-primary" />
                Finalize
              </CardTitle>
              <CardDescription className="text-slate-400">Process and ingest into database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Current Status</span>
                  <span className="font-bold text-emerald-400">Draft Ready</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Market Sync</span>
                  <span className="font-bold">Real-time</span>
                </div>
              </div>
              <Button 
                type="submit"
                className="w-full h-12 font-black text-md shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Syncing...
                  </>
                ) : "Publish Promotion"}
              </Button>
            </CardContent>
            <CardFooter className="bg-white/5 border-t border-white/10 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                Ensure dates are verified before publishing
              </div>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
