'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { tracker } from '@/lib/tracking';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view on route changes - safe wrapper
    try { tracker.trackPageView(); } catch (e) {}
  }, [pathname, searchParams]);

  return null;
}
