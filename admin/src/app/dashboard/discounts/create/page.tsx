"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateDiscountRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/discounts/cards');
  }, [router]);
  return null;
}
