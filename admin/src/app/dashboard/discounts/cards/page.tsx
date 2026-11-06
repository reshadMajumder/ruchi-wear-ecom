"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { CreditCard, ArrowUpRight, Loader2, PackageX, Percent, Tag, Calendar, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface DiscountCard {
  id: number;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: string;
  scope: 'global' | 'product' | 'category';
  image_url: string | null;
  priority: number;
  start_date: string;
  end_date: string;
}

export default function DiscountCardsPage() {
  const [cards, setCards] = useState<DiscountCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    try {
      // Endpoint 9: Public Discount Cards (is_active=true, make_card=true)
      const response = await fetch(API_ENDPOINTS.DISCOUNT_CARDS);
      if (!response.ok) throw new Error('Failed to fetch promotional cards.');
      const data = await response.json();
      // Documentation says ordered by priority descending, but we ensure sorting just in case
      const sortedCards = (Array.isArray(data) ? data : []).sort((a, b) => b.priority - a.priority);
      setCards(sortedCards);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Network Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          <CreditCard className="text-primary h-10 w-10" />
          Discount Cards
        </h1>
        <p className="text-lg text-muted-foreground">High-density overview of active campaign health and public-facing visual banners.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase animate-pulse">Scanning Promo Registry...</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="py-40 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/30 rounded-3xl border-2 border-dashed">
          <div className="p-6 bg-white rounded-full shadow-inner ring-1 ring-slate-100">
            <PackageX className="h-12 w-12 text-slate-200" />
          </div>
          <h3 className="text-xl font-bold text-slate-600">No active promo cards found</h3>
          <p className="text-sm text-slate-400 max-w-xs">Enable 'Generate Promo Card' and ensure 'Immediate Activation' is ON in the campaign panel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((promo) => (
            <Card key={promo.id} className="border-none shadow-2xl overflow-hidden bg-white ring-1 ring-slate-100 flex flex-col group hover:shadow-primary/10 transition-all duration-300">
              <div className="h-2 bg-primary w-full" />
              
              <div className="relative h-48 bg-slate-100 overflow-hidden border-b">
                {promo.image_url ? (
                  <img 
                    src={promo.image_url} 
                    alt={promo.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                    <Tag className="w-12 h-12 opacity-20" />
                    <span className="text-[10px] font-black uppercase tracking-widest">No Banner Assets</span>
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-emerald-500 text-white border-none shadow-lg font-black text-[10px] flex items-center gap-1.5 px-3 py-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </Badge>
                </div>
                <div className="absolute bottom-4 left-4">
                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm border-none shadow-sm text-slate-900 font-bold uppercase text-[9px] tracking-tight">
                    Priority: {promo.priority}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-black text-slate-800 line-clamp-1">{promo.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 font-bold text-primary uppercase text-[10px] tracking-widest">
                  {promo.discount_type} • {promo.scope} TARGETING
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 flex-1 flex flex-col">
                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col items-center justify-center text-center gap-1">
                  <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Value In BDT</span>
                  <p className="text-4xl font-black text-primary">
                    {promo.discount_type === 'percentage' ? `${parseFloat(promo.value)}%` : `৳${parseFloat(promo.value).toLocaleString()}`}
                  </p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">OFF ON SELECTION</span>
                </div>
                
                <div className="mt-auto space-y-4 pt-4 border-t border-dashed">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Valid until {new Date(promo.end_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Link href={`/dashboard/discounts/cards/${promo.id}`} className="block w-full">
                    <Button variant="outline" className="w-full font-black text-xs uppercase tracking-widest h-11 bg-white hover:bg-primary hover:text-white transition-all group">
                      Review Items
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <Card className="border-none shadow-xl bg-slate-900 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32" />
        <CardContent className="flex flex-col md:flex-row items-center justify-between py-12 px-12 gap-8 text-center md:text-left relative z-10">
          <div className="space-y-3">
            <div className="bg-white/10 p-3 rounded-2xl w-fit mx-auto md:mx-0">
              <Percent className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-black">Campaign Performance Archives</h3>
            <p className="text-slate-400 max-w-md font-medium text-sm leading-relaxed">
              Historical view of all visual cards, including expired seasonal banners and their total conversion impact in the regional market.
            </p>
          </div>
          <Button variant="secondary" className="font-black px-10 h-12 text-md shadow-xl bg-white text-slate-900 hover:bg-slate-100">
            Access Archives
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
