"use client";

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Save, Loader2, Info, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-50 animate-pulse rounded-xl border" />
});
import 'react-quill-new/dist/quill.snow.css';

interface PolicyData {
  id?: number;
  policy_html: string;
  terms_html: string;
}

export default function PolicyManagementPage() {
  const { toast } = useToast();
  
  // Data State
  const [data, setData] = useState<PolicyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [policyHtml, setPolicyHtml] = useState('');
  const [termsHtml, setTermsHtml] = useState('');

  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      // Using admin GET endpoint
      const response = await fetch(API_ENDPOINTS.POLICIES_ADMIN, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setPolicyHtml(result.policy_html || '');
        setTermsHtml(result.terms_html || '');
      } else if (response.status === 404) {
        // Singleton doesn't exist yet, that's fine
        setData(null);
      } else {
        throw new Error('Failed to retrieve legal records.');
      }
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
    fetchPolicies();
  }, [fetchPolicies]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const payload = {
        policy_html: policyHtml,
        terms_html: termsHtml
      };

      // Determine method: POST if new singleton, PATCH if updating
      const method = data ? 'PATCH' : 'POST';
      
      const response = await fetch(API_ENDPOINTS.POLICIES_ADMIN, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.detail || 'Legal registry ingestion failed.');
      }

      toast({
        title: 'Registry Updated',
        description: 'Store policies and terms have been synchronized successfully.',
      });

      fetchPolicies();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-40 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-ping" />
          <Loader2 className="h-12 w-12 text-primary relative animate-spin" />
        </div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Legal Records...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Legal Intelligence</h1>
          </div>
          <p className="text-muted-foreground font-medium">Manage storefront governance documents and compliance policies.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSubmitting}
          className="gap-2 shadow-2xl shadow-primary/20 font-black px-10 h-14 text-md transition-all active:scale-95"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSubmitting ? 'Syncing...' : 'Commit Changes'}
        </Button>
      </div>

      <Tabs defaultValue="policy" className="w-full space-y-8">
        <TabsList className="bg-slate-100/50 p-1 rounded-xl h-14 w-fit border shadow-sm">
          <TabsTrigger value="policy" className="px-10 rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary h-full">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Privacy Policy
          </TabsTrigger>
          <TabsTrigger value="terms" className="px-10 rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary h-full">
            <FileText className="w-4 h-4 mr-2" />
            Terms of Service
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policy" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-slate-100">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-xl">Privacy Policy Workspace</CardTitle>
              <CardDescription>Define how customer data is handled and protected.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner min-h-[500px]">
                <ReactQuill 
                  theme="snow" 
                  value={policyHtml} 
                  onChange={setPolicyHtml}
                  className="h-[400px] mb-12"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-slate-100">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-xl">Terms of Service Workspace</CardTitle>
              <CardDescription>Legal framework for transactions and site usage.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner min-h-[500px]">
                <ReactQuill 
                  theme="snow" 
                  value={termsHtml} 
                  onChange={setTermsHtml}
                  className="h-[400px] mb-12"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100 flex items-start gap-4">
          <Info className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
          <div className="space-y-2">
            <h4 className="font-black text-blue-900 text-sm uppercase tracking-widest">Formatting Guide</h4>
            <p className="text-sm text-blue-700 font-medium leading-relaxed">
              Use headers (H1, H2) to structure your documents. Clear headings improve SEO and make legal text easier for customers to navigate.
            </p>
          </div>
        </div>

        <div className="bg-amber-50/50 p-8 rounded-3xl border border-amber-100 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
          <div className="space-y-2">
            <h4 className="font-black text-amber-900 text-sm uppercase tracking-widest">Compliance Sync</h4>
            <p className="text-sm text-amber-700 font-medium leading-relaxed">
              Changes committed here are published instantly to the storefront footer links. Ensure all text is reviewed for accuracy before saving.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
