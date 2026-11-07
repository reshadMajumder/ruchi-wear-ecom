'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { tracker } from '@/lib/tracking';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, totalPrice } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
      <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container mx-auto flex-grow px-4 py-6 lg:px-12 xl:px-24">
        <h1 className="mb-4 text-xl font-semibold">Cart</h1>

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-600">Your cart is empty.</p>
            <Link href="/" className="mt-4 inline-block">
              <Button className="h-11 rounded-md px-6">Continue shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="divide-y lg:col-span-8">
              {items.map((item) => (
                <div key={item.variant_id} className="flex gap-4 py-4">
                  <Link href={`/products/${item.id}`} className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/products/${item.id}`} className="line-clamp-2 text-sm font-medium text-gray-950">{item.name}</Link>
                    <p className="mt-0.5 text-sm text-gray-500">{item.variant_name}</p>
                    <p className="mt-1 text-sm font-semibold">Tk {(item.price * item.quantity).toLocaleString()}</p>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex h-8 items-center rounded-md border">
                        <button onClick={() => updateQuantity(item.variant_id, item.quantity - 1)} className="w-8 text-gray-600" aria-label="Decrease quantity"><Minus className="mx-auto h-3.5 w-3.5" /></button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.variant_id, item.quantity + 1)} className="w-8 text-gray-600" aria-label="Increase quantity"><Plus className="mx-auto h-3.5 w-3.5" /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.variant_id)} className="text-sm text-gray-500 hover:text-gray-950">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:sticky lg:top-24 lg:col-span-4">
              <div className="space-y-3 border-t pt-4 lg:rounded-xl lg:border lg:p-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>Tk {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery</span>
                  <span className="text-gray-500">At checkout</span>
                </div>
                <div className="flex items-baseline justify-between border-t pt-3">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-semibold">Tk {totalPrice.toLocaleString()}</span>
                </div>
                <Link href="/checkout" className="block">
                  <Button
                    onClick={() => {
                      try { tracker.trackCheckoutStart(`cart_${items.length}`); } catch (e) {}
                    }}
                    className="h-11 w-full rounded-md text-sm font-semibold"
                  >
                    Checkout
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
