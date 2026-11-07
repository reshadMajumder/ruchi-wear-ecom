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
  Loader2, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  User, 
  ShoppingBag,
  Printer,
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
        title: "Missing details",
        description: "Add your name, phone, and delivery address.",
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

  const subtotal = calculation ? parseFloat(calculation.discounted_subtotal) : totalPrice;
  const couponOff = calculation ? parseFloat(calculation.coupon_discount_amount) : 0;
  const taxTotal = calculation ? parseFloat(calculation.vat_amount) + parseFloat(calculation.tax_amount) : 0;
  const delivery = calculation
    ? parseFloat(calculation.delivery_charge)
    : formData.is_inside_dhaka ? 60 : 120;
  const payable = calculation ? parseFloat(calculation.total_amount) : totalPrice + delivery;

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (orderStatement) return (
    <div className="min-h-screen flex flex-col print:bg-white">
      <div className="print:hidden"><Header /></div>
      <main className="flex-grow container mx-auto px-4 lg:px-12 xl:px-24 py-12 flex flex-col items-center">
        <div className="mb-6 text-center print:hidden">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-gray-900" />
          <h1 className="text-2xl font-semibold">Order placed</h1>
          <p className="mt-1 text-sm text-gray-500">{orderStatement.public_order_id}</p>
        </div>

        <div 
          ref={statementRef}
          className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border w-full max-w-3xl print:shadow-none print:border-none print:p-0"
        >
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-8 mb-8">
            <div>
              <img src="/brand/logo-black.png" alt="Ruchi Wear" className="h-16 w-auto mb-1" />
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Reflection of Taste</p>
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
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>Tk {orderStatement.items.reduce((sum, item) => sum + parseFloat(item.line_total), 0).toLocaleString()}</span>
            </div>

            {parseFloat(orderStatement.coupon_discount_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span>Coupon {orderStatement.coupon_code}</span>
                <span>− Tk {parseFloat(orderStatement.coupon_discount_amount).toLocaleString()}</span>
              </div>
            )}

            {(parseFloat(orderStatement.vat_amount) + parseFloat(orderStatement.tax_amount)) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span>Tk {(parseFloat(orderStatement.vat_amount) + parseFloat(orderStatement.tax_amount)).toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery</span>
              <span>Tk {parseFloat(orderStatement.delivery_charge).toLocaleString()}</span>
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-gray-900 uppercase tracking-tight">Statement Total</span>
              <span className="text-xl font-black text-primary">Tk {parseFloat(orderStatement.total_amount).toLocaleString()}</span>
            </div>
          </div>

          <p className="mt-6 border-t pt-4 text-center text-xs text-gray-400">Pay cash when the order arrives.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-10 print:hidden w-full max-w-3xl">
          <Button onClick={handlePrint} variant="outline" className="h-11 flex-1 rounded-md">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Link href="/" className="flex-1">
            <Button className="h-11 w-full rounded-md">Keep shopping</Button>
          </Link>
        </div>
      </main>
      <div className="print:hidden"><Footer /></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 lg:px-12 xl:px-24 py-8">
        <h1 className="mb-4 text-xl font-semibold">Checkout</h1>

        <div className="grid items-start gap-8 pb-20 lg:grid-cols-12 lg:pb-0">
          <div className="lg:col-span-7">
            <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="customer_name" className="text-sm">Name</Label>
                  <Input
                    id="customer_name"
                    name="customer_name"
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    className="h-11"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customer_phone" className="text-sm">Phone</Label>
                  <Input
                    id="customer_phone"
                    name="customer_phone"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="01XXXXXXXXX"
                    className="h-11"
                    value={formData.customer_phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <RadioGroup
                defaultValue="inside"
                className="grid grid-cols-2 gap-2"
                onValueChange={handleLocationChange}
              >
                <Label htmlFor="inside" className={cn(
                  "flex h-11 cursor-pointer items-center justify-center rounded-md border text-sm",
                  formData.is_inside_dhaka ? "border-black bg-black text-white" : "border-gray-200"
                )}>
                  <RadioGroupItem value="inside" id="inside" className="sr-only" />
                  Inside Dhaka
                </Label>
                <Label htmlFor="outside" className={cn(
                  "flex h-11 cursor-pointer items-center justify-center rounded-md border text-sm",
                  !formData.is_inside_dhaka ? "border-black bg-black text-white" : "border-gray-200"
                )}>
                  <RadioGroupItem value="outside" id="outside" className="sr-only" />
                  Outside Dhaka
                </Label>
              </RadioGroup>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="division" className="text-sm">Division</Label>
                  <Input
                    id="division"
                    name="division"
                    required
                    placeholder="Dhaka"
                    className="h-11"
                    value={formData.division}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-sm">City</Label>
                  <Input
                    id="city"
                    name="city"
                    required
                    placeholder="Mirpur"
                    className="h-11"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="detailed_address" className="text-sm">Address</Label>
                <Input
                  id="detailed_address"
                  name="detailed_address"
                  required
                  autoComplete="street-address"
                  placeholder="House, road, area"
                  className="h-11"
                  value={formData.detailed_address}
                  onChange={handleInputChange}
                />
              </div>

              <p className="text-sm text-gray-500">Cash on delivery.</p>

              <Button
                type="submit"
                disabled={submitting || calculating}
                className="hidden h-11 w-full rounded-md text-sm font-semibold lg:inline-flex"
              >
                {submitting ? "Placing order…" : `Place order · Tk ${payable.toLocaleString()}`}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="space-y-4 lg:sticky lg:top-24 lg:rounded-xl lg:border lg:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Your order</h2>
                {calculating && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.variant_id} className="flex items-center gap-3">
                    <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                      <Image src={item.image} alt="" fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.variant_name} · {item.quantity}</p>
                    </div>
                    <p className="text-sm">Tk {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>Tk {subtotal.toLocaleString()}</span>
                </div>
                {couponOff > 0 && (
                  <div className="flex justify-between text-gray-900">
                    <span>Coupon{calculation?.coupon_code ? ` ${calculation.coupon_code}` : ""}</span>
                    <span>− Tk {couponOff.toLocaleString()}</span>
                  </div>
                )}
                {taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax</span>
                    <span>Tk {taxTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery</span>
                  <span>Tk {delivery.toLocaleString()}</span>
                </div>
                <div className="flex items-baseline justify-between border-t pt-3">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-semibold">Tk {payable.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Coupon"
                  className="h-11 uppercase"
                  name="coupon_code"
                  value={formData.coupon_code}
                  onChange={handleInputChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-4"
                  onClick={() => fetchCalculatedPrice(true)}
                  disabled={calculating || !formData.coupon_code.trim()}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 lg:hidden">
          <Button
            type="submit"
            form="checkout-form"
            disabled={submitting || calculating}
            className="h-11 w-full rounded-md text-sm font-semibold"
          >
            {submitting ? "Placing order…" : `Place order · Tk ${payable.toLocaleString()}`}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
