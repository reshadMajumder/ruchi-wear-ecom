'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ChevronRight, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { tracker } from '@/lib/tracking';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, totalPrice } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Header />
      <main className="flex-grow container mx-auto px-4 lg:px-12 xl:px-24 py-8">
        <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-8">
          <Link href="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">Shopping Bag</span>
        </nav>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl p-20 flex flex-col items-center text-center border shadow-sm">
            <ShoppingBag className="w-24 h-24 mb-6 opacity-20" />
            <h2 className="text-2xl font-bold mb-4">Your bag is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-xs mx-auto">Looks like you hasn't added anything to your bag yet.</p>
            <Link href="/">
              <Button className="h-14 px-10 text-lg font-bold rounded-xl">Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Items List */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 p-6 bg-gray-50 border-b text-[11px] font-black uppercase tracking-widest text-gray-500">
                  <div className="col-span-6">Product Details</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.variant_id} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="col-span-6 flex gap-4">
                        <div className="relative w-20 h-20 flex-shrink-0 bg-gray-50 border rounded-lg p-1">
                          <Image src={item.image} alt={item.name} fill className="object-contain" />
                        </div>
                        <div className="text-left flex flex-col justify-center">
                          <Link href={`/products/${item.id}`} className="font-bold text-gray-900 hover:text-primary transition-colors line-clamp-1">{item.name}</Link>
                          <p className="text-[11px] text-gray-500 mb-2">{item.variant_name}</p>
                          <button 
                            onClick={() => removeFromCart(item.variant_id)} 
                            className="text-[11px] text-red-500 font-bold flex items-center gap-1 hover:underline"
                          >
                            <Trash2 className="w-3 h-3" /> REMOVE
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2 text-center font-bold text-gray-700">Tk {item.price.toLocaleString()}</div>
                      <div className="col-span-2 flex justify-center">
                        <div className="flex items-center border rounded-xl overflow-hidden h-10 bg-white">
                          <button onClick={() => updateQuantity(item.variant_id, item.quantity - 1)} className="px-3 text-gray-400 hover:bg-gray-50 transition-colors"><Minus className="w-3 h-3" /></button>
                          <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.variant_id, item.quantity + 1)} className="px-3 text-gray-400 hover:bg-gray-50 transition-colors"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-black text-primary">Tk {(item.price * item.quantity).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                  ORDER SUMMARY
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal ({items.length} items)</span>
                    <span className="font-bold text-gray-900">Tk {totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping</span>
                    <span className="font-bold text-green-600 uppercase tracking-tighter">Calculated at checkout</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-black text-gray-900">Estimated Total</span>
                    <span className="text-2xl font-black text-primary">Tk {totalPrice.toLocaleString()}</span>
                  </div>
                </div>

                <Link href="/checkout" className="block w-full">
                  <Button 
                    onClick={() => {
                      try { tracker.trackCheckoutStart(`cart_${items.length}`); } catch (e) {}
                    }}
                    className="w-full h-14 text-lg font-black rounded-xl group"
                  >
                    PROCEED TO CHECKOUT
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                    Prices are inclusive of all taxes. Final shipping and discounts will be applied on the checkout page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
