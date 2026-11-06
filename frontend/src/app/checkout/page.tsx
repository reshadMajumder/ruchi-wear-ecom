'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  User, 
  ShoppingBag,
  BadgePercent,
  ReceiptText,
  Printer,
  ArrowRight
} from 'lucide-react';
import { BASE_URL } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { tracker } from '@/lib/tracking';

interface PriceCalculation {
  total_amount_before_discount: string;
  discounted_subtotal: string;
  coupon_code: string | null;
  coupon_discount_amount: string;
  delivery_charge: string;
  vat_amount: string;
  tax_amount: string;
  total_amount: string;
  is_inside_dhaka: boolean;
}

interface OrderStatement {
  public_order_id: string;
  customer_name: string;
  customer_phone: string;
  division: string;
  city: string;
  detailed_address: string;
  items: Array<{
    product_name: string;
    variant_id: number;
    variant_sku: string;
    attribute_values: Array<{ attribute: string; value: string }>;
    quantity: number;
    unit_price: string;
    line_total: string;
  }>;
  total_amount_before_discount: string;
  coupon_code: string | null;
  coupon_discount_amount: string;
  delivery_charge: string;
  vat_amount: string;
  tax_amount: string;
  total_amount: string;
  created_at: string;
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const statementRef = useRef<HTMLDivElement>(null);
  
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [orderStatement, setOrderStatement] = useState<OrderStatement | null>(null);
  const [calculation, setCalculation] = useState<PriceCalculation | null>(null);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    division: '',
    city: '',
    detailed_address: '',
    is_inside_dhaka: true,
    coupon_code: '',
  });

  useEffect(() => {
    setMounted(true);
    // Track checkout start
    if (items.length > 0) {
      try { tracker.trackCheckoutStart(`cart_${items.length}`); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (mounted && items.length === 0 && !orderStatement) {
      router.push('/cart');
    }
  }, [items, orderStatement, router, mounted]);

  const formatApiError = (error: any): string => {
    if (typeof error === 'string') {
      return error.replace(/[\[\]']/g, '').trim();
    }
    if (typeof error === 'object' && error !== null) {
      return Object.entries(error)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        .join(' | ');
    }
    return 'An unknown error occurred';
  };

  const fetchCalculatedPrice = useCallback(async (isCouponApply = false) => {
    if (items.length === 0) return;
    
    try {
      setCalculating(true);
      const payload: any = {
        customer_name: formData.customer_name || "Guest",
        customer_phone: formData.customer_phone || "01700000000",
        division: formData.division || "Dhaka",
        city: formData.city || "Dhaka",
        detailed_address: formData.detailed_address || "Address",
        is_inside_dhaka: formData.is_inside_dhaka,
        items: items.map(item => ({ 
          variant_id: item.variant_id, 
          quantity: item.quantity 
        }))
      };

      if (formData.coupon_code.trim()) {
        payload.coupon_code = formData.coupon_code.trim();
      }

      const response = await fetch(`${BASE_URL}/api/order/price-calculator/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setCalculation(data.calculation);
        if (isCouponApply) {
          toast({
            title: "Coupon Applied",
            description: "Your discount has been calculated.",
          });
        }
      } else {
        const errorMsg = formatApiError(data.error);
        if (isCouponApply) {
          toast({
            variant: "destructive",
            title: "Coupon Error",
            description: errorMsg,
          });
        }
        setCalculation(null);
      }
    } catch (err) {
      // Error handled by calculation state
    } finally {
      setCalculating(false);
    }
  }, [formData, items, toast]);

  useEffect(() => {
    if (mounted) {
      fetchCalculatedPrice();
    }
  }, [formData.is_inside_dhaka, fetchCalculatedPrice, mounted]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (value: string) => {
    setFormData(prev => ({ ...prev, is_inside_dhaka: value === 'inside' }));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    if (!formData.customer_name || !formData.customer_phone || !formData.division || !formData.city || !formData.detailed_address) {
      toast({ 
        variant: "destructive", 
        title: "Information Required", 
        description: "Please fill in all mandatory fields marked with an asterisk (*)." 
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        division: formData.division,
        city: formData.city,
        detailed_address: formData.detailed_address,
        is_inside_dhaka: formData.is_inside_dhaka,
        items: items.map(item => ({ 
          variant_id: item.variant_id, 
          quantity: item.quantity 
        }))
      };

      if (formData.coupon_code.trim()) {
        payload.coupon_code = formData.coupon_code.trim();
      }

      const response = await fetch(`${BASE_URL}/api/order/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(formatApiError(data.error));
      }
      
      setOrderStatement(data.statement);
      clearCart();
      
      // Track purchase - wrapped in try-catch
      try { 
        tracker.trackPurchase(
          data.statement.public_order_id, 
          parseFloat(data.statement.total_amount)
        ); 
      } catch (e) {}
      
      toast({
        title: "Order Successful",
        description: `Your order ${data.statement.public_order_id} has been placed.`,
      });
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Order Failed", 
        description: err.message || "An unexpected error occurred while placing your order."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (orderStatement) return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5] print:bg-white">
      <div className="print:hidden"><Header /></div>
      <main className="flex-grow container mx-auto px-4 lg:px-12 xl:px-24 py-12 flex flex-col items-center">
        <div className="text-center mb-10 print:hidden">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Order Confirmed!</h1>
          <p className="text-gray-500 mt-2">Thank you for shopping with Adurys.com</p>
        </div>

        <div 
          ref={statementRef}
          className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border w-full max-w-3xl print:shadow-none print:border-none print:p-0"
        >
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-8 mb-8">
            <div>
              <h2 className="text-2xl font-black italic text-primary mb-1">Adurys.com</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Premium Shopping Destination</p>
              <div className="mt-4 space-y-1">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-tighter">Order Date</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(orderStatement.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Public Order ID</p>
              <p className="text-2xl font-black text-primary">{orderStatement.public_order_id}</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-green-100">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Status: Pending
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" /> Customer Information
              </h3>
              <div className="space-y-1">
                <p className="font-bold text-gray-900">{orderStatement.customer_name}</p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 opacity-40" /> {orderStatement.customer_phone}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Delivery Address
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {orderStatement.detailed_address},<br />
                {orderStatement.city}, {orderStatement.division}
              </p>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShoppingBag className="w-3 h-3" /> Itemized Statement
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="py-3 pr-4">Product Detail</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 pl-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orderStatement.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-4 pr-4">
                        <p className="font-bold text-gray-900">{item.product_name}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{item.variant_sku}</span>
                          {item.attribute_values.map((attr, aidx) => (
                            <span key={aidx} className="text-[10px] text-primary/60 font-bold uppercase">
                              • {attr.attribute}: {attr.value}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-gray-600">x{item.quantity}</td>
                      <td className="py-4 px-4 text-right text-gray-600">Tk {parseFloat(item.unit_price).toLocaleString()}</td>
                      <td className="py-4 pl-4 text-right font-bold text-gray-900">Tk {parseFloat(item.line_total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Subtotal</span>
              <span className="font-bold text-gray-900">Tk {parseFloat(orderStatement.total_amount_before_discount).toLocaleString()}</span>
            </div>
            
            {parseFloat(orderStatement.coupon_discount_amount) > 0 && (
              <div className="flex justify-between text-xs text-green-600 font-bold">
                <span className="flex items-center gap-1.5">
                  <BadgePercent className="w-3.5 h-3.5" /> Coupon Discount ({orderStatement.coupon_code})
                </span>
                <span>- Tk {parseFloat(orderStatement.coupon_discount_amount).toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">VAT & Tax Amount</span>
              <span className="font-bold text-gray-900">Tk {(parseFloat(orderStatement.vat_amount) + parseFloat(orderStatement.tax_amount)).toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-medium">Delivery Charge</span>
              <span className="font-bold text-gray-900">Tk {parseFloat(orderStatement.delivery_charge).toLocaleString()}</span>
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-gray-900 uppercase tracking-tight">Statement Total</span>
              <span className="text-xl font-black text-primary">Tk {parseFloat(orderStatement.total_amount).toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-dashed border-gray-200 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-2">Authentic Products • Fast Delivery • 7 Days Return</p>
            <p className="text-[10px] text-gray-300">This is a system-generated invoice. No signature is required.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-10 print:hidden w-full max-w-3xl">
          <Button 
            onClick={handlePrint}
            className="flex-grow h-14 rounded-xl font-black uppercase tracking-wider bg-white border-2 border-primary text-primary hover:bg-primary/5 transition-all"
          >
            <Printer className="w-5 h-5 mr-2" /> Print / Save as PDF
          </Button>
          <Link href="/" className="flex-grow">
            <Button className="w-full h-14 rounded-xl font-black uppercase tracking-wider shadow-xl shadow-primary/20">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </main>
      <div className="print:hidden"><Footer /></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Header />
      <main className="flex-grow container mx-auto px-4 lg:px-12 xl:px-24 py-8">
        <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/cart" className="hover:text-primary transition-colors">Shopping Bag</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">Checkout</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmitOrder} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-6 border-b bg-gray-50/50">
                <h3 className="text-lg font-black flex items-center gap-2 text-gray-900 uppercase tracking-tight">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  Secure Delivery Details
                </h3>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-tight text-gray-700">Full Name *</Label>
                      <Input 
                        name="customer_name" 
                        required 
                        placeholder="e.g. John Doe"
                        className="h-12 bg-gray-50/30 rounded-xl"
                        value={formData.customer_name} 
                        onChange={handleInputChange}
                        suppressHydrationWarning
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-tight text-gray-700">Phone Number *</Label>
                      <Input 
                        name="customer_phone" 
                        required 
                        placeholder="01XXXXXXXXX"
                        className="h-12 bg-gray-50/30 rounded-xl"
                        value={formData.customer_phone} 
                        onChange={handleInputChange}
                        suppressHydrationWarning
                      />
                    </div>
                  </div>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Delivery Location
                  </h4>
                  
                  <RadioGroup 
                    defaultValue="inside" 
                    className="grid grid-cols-2 gap-4"
                    onValueChange={handleLocationChange}
                  >
                    <div className={cn(
                      "flex items-center space-x-2 border-2 rounded-2xl p-4 cursor-pointer transition-all",
                      formData.is_inside_dhaka ? "border-primary bg-primary/5 shadow-sm" : "border-gray-100 hover:border-gray-200"
                    )}>
                      <RadioGroupItem value="inside" id="inside" />
                      <Label htmlFor="inside" className="font-bold cursor-pointer text-sm">Inside Dhaka</Label>
                    </div>
                    <div className={cn(
                      "flex items-center space-x-2 border-2 rounded-2xl p-4 cursor-pointer transition-all",
                      !formData.is_inside_dhaka ? "border-primary bg-primary/5 shadow-sm" : "border-gray-100 hover:border-gray-200"
                    )}>
                      <RadioGroupItem value="outside" id="outside" />
                      <Label htmlFor="outside" className="font-bold cursor-pointer text-sm">Outside Dhaka</Label>
                    </div>
                  </RadioGroup>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-tight text-gray-700">Division *</Label>
                      <Input 
                        name="division" 
                        required 
                        placeholder="e.g. Dhaka"
                        className="h-12 bg-gray-50/30 rounded-xl"
                        value={formData.division} 
                        onChange={handleInputChange}
                        suppressHydrationWarning
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-tight text-gray-700">City *</Label>
                      <Input 
                        name="city" 
                        required 
                        placeholder="e.g. Mirpur"
                        className="h-12 bg-gray-50/30 rounded-xl"
                        value={formData.city} 
                        onChange={handleInputChange}
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-tight text-gray-700">Detailed Address *</Label>
                    <Input 
                      name="detailed_address" 
                      required 
                      placeholder="House, Street, Area"
                      className="h-12 bg-gray-50/30 rounded-xl"
                      value={formData.detailed_address} 
                      onChange={handleInputChange}
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ReceiptText className="w-4 h-4" />
                    Payment Method
                  </h4>
                  <div className="p-5 rounded-2xl border-2 border-primary/20 bg-primary/5 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 rounded-full border-4 border-primary bg-white shadow-inner" />
                      <span className="font-black text-gray-900 uppercase text-sm tracking-tight">Cash on Delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black text-primary bg-white px-2 py-1 rounded-md border border-primary/10 uppercase tracking-tighter">Selected</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50/50 border-t">
                <Button 
                  type="submit" 
                  disabled={submitting || calculating} 
                  className="w-full h-16 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] group"
                  suppressHydrationWarning
                >
                  {submitting ? (
                    <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> PLACING ORDER...</>
                  ) : (
                    "CONFIRM ORDER NOW"
                  )}
                </Button>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <ShieldCheck className="w-3 h-3 text-gray-400" />
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">
                    Your personal data is encrypted and secure
                  </p>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6 sticky top-24">
              <h3 className="text-lg font-black flex items-center justify-between uppercase tracking-tight text-gray-900">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  Bag Summary
                </div>
                {calculating && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </h3>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item) => (
                  <div key={item.variant_id} className="flex gap-4 items-center group">
                    <div className="relative w-14 h-14 flex-shrink-0 bg-gray-50 border rounded-xl p-1.5 transition-colors group-hover:border-primary/20">
                      <Image src={item.image} alt={item.name} fill className="object-contain" />
                    </div>
                    <div className="flex-grow text-left">
                      <h4 className="text-xs font-bold text-gray-900 line-clamp-1 leading-tight mb-1">{item.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">Qty: {item.quantity}</span>
                        <span className="text-[10px] font-bold text-primary">Tk {item.price.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-xs font-black text-gray-900">
                      Tk {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-500">Original Product Total</span>
                    <span className="text-gray-900 font-black">
                      Tk {calculation ? parseFloat(calculation.total_amount_before_discount).toLocaleString() : totalPrice.toLocaleString()}
                    </span>
                  </div>
                  
                  {calculation && parseFloat(calculation.coupon_discount_amount) > 0 && (
                    <div className="flex justify-between text-xs text-green-600 font-black">
                      <span className="flex items-center gap-1.5">
                        <BadgePercent className="w-3.5 h-3.5" />
                        Coupon Discount
                      </span>
                      <span>- Tk {parseFloat(calculation.coupon_discount_amount).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-500">VAT Amount</span>
                    <span className="text-gray-900 font-black">
                      Tk {calculation ? parseFloat(calculation.vat_amount).toLocaleString() : '0.00'}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-500">Tax Amount</span>
                    <span className="text-gray-900 font-black">
                      Tk {calculation ? parseFloat(calculation.tax_amount).toLocaleString() : '0.00'}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-500">Delivery Charge</span>
                    <span className={cn("font-black", calculation ? "text-gray-900" : "text-gray-400 italic")}>
                      Tk {calculation ? parseFloat(calculation.delivery_charge).toLocaleString() : (formData.is_inside_dhaka ? '60.00' : '120.00')}
                    </span>
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-2xl border-2 border-primary/10 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-primary uppercase tracking-tight">Final Total</span>
                    <div className="text-right">
                      <span className="text-2xl font-black text-primary block leading-none">
                        Tk {calculation ? parseFloat(calculation.total_amount).toLocaleString() : (totalPrice + (formData.is_inside_dhaka ? 60 : 120)).toLocaleString()}
                      </span>
                      <span className="text-[9px] font-bold text-primary/60 uppercase tracking-tighter">VAT & Taxes Included</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Coupon Code (Optional)</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="e.g. SAVE20" 
                        className="h-11 text-xs uppercase font-black bg-white rounded-xl border-gray-200" 
                        name="coupon_code"
                        value={formData.coupon_code}
                        onChange={handleInputChange}
                        suppressHydrationWarning
                      />
                      <Button 
                        type="button"
                        variant="secondary" 
                        className="h-11 px-5 font-black text-xs rounded-xl"
                        onClick={() => fetchCalculatedPrice(true)}
                        disabled={calculating}
                        suppressHydrationWarning
                      >
                        {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "APPLY"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border border-dashed border-gray-300 rounded-2xl flex items-center gap-4 group">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center shadow-sm border border-green-100 flex-shrink-0 transition-transform group-hover:scale-110">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-tight">Premium Buyer Protection</h5>
                <p className="text-[10px] text-gray-500 font-medium">Your order is protected from payment to delivery. Guaranteed authentic products.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
