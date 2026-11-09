"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('commercehub_access_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsReady(true);
    }
  }, [router, isAuthenticated]);

  if (!isReady || !isAuthenticated) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-11 shrink-0 items-center gap-2 border-b px-3 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Admin Console</p>
          </div>
        </header>
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
