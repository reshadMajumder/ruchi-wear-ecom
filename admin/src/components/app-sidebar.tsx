"use client";

import { useAuth } from '@/lib/auth-context';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  LogOut, 
  ChevronRight,
  Database,
  Layers,
  Percent,
  PlusCircle,
  Link2,
  CreditCard,
  ListOrdered,
  LayoutGrid,
  Ticket,
  Settings,
  Truck,
  ShieldCheck,
  HelpCircle,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { title: 'Analytics', icon: Activity, href: '/dashboard/analytics' },
  { title: 'Products', icon: Package, href: '/dashboard/products' },
  { title: 'Orders', icon: ShoppingCart, href: '/dashboard/orders' },
  { title: 'Courier', icon: Truck, href: '/dashboard/courier' },
];

const sectionItems = [
  { title: 'Section List', icon: ListOrdered, href: '/dashboard/sections' },
  { title: 'Create Section', icon: PlusCircle, href: '/dashboard/sections/create' },
];

const discountItems = [
  { title: 'Discount Cards', icon: CreditCard, href: '/dashboard/discounts/cards' },
  { title: 'Assign Discount', icon: Link2, href: '/dashboard/discounts/assign' },
];

const couponItems = [
  { title: 'Coupon List', icon: ListOrdered, href: '/dashboard/coupons' },
  { title: 'Create Coupon', icon: PlusCircle, href: '/dashboard/coupons/create' },
];

const foundationItems = [
  { title: 'Categories', href: '/dashboard/foundation/categories' },
  { title: 'Product Types', href: '/dashboard/foundation/product-types' },
  { title: 'Attributes', href: '/dashboard/foundation/attributes' },
];

const legalItems = [
  { title: 'Policy & Terms', icon: ShieldCheck, href: '/dashboard/policies' },
  { title: 'FAQs', icon: HelpCircle, href: '/dashboard/faqs' },
];

const settingsItems = [
  { title: 'Delivery & Taxes', icon: Truck, href: '/dashboard/settings/delivery' },
];

export function AppSidebar() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="py-4 px-3">
        <div className="flex items-center gap-3">
          <img src="/brand/mark-black.png" alt="" className="size-9 object-contain" />
          {!isCollapsed && (
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Ruchi Wear</span>
              <span className="truncate text-xs text-muted-foreground">Admin Panel</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === item.href}
                tooltip={item.title}
                className={cn(
                  "h-8 transition-all duration-200",
                  pathname === item.href ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"
                )}
              >
                <Link href={item.href}>
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {/* Sections Menu */}
          <Collapsible asChild defaultOpen={pathname.includes('/sections')} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip="Sections" className="h-8">
                  <LayoutGrid className="size-4" />
                  <span>Sections</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {sectionItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.href}>
                      <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                        <Link href={subItem.href} className="flex items-center gap-2">
                          <subItem.icon className="size-3.5" />
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

          {/* Discounts Menu */}
          <Collapsible asChild defaultOpen={pathname.includes('/discounts')} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip="Discounts" className="h-8">
                  <Percent className="size-4" />
                  <span>Discounts</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {discountItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.href}>
                      <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                        <Link href={subItem.href} className="flex items-center gap-2">
                          <subItem.icon className="size-3.5" />
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

          {/* Coupons Menu */}
          <Collapsible asChild defaultOpen={pathname.includes('/coupons')} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip="Coupons" className="h-8">
                  <Ticket className="size-4" />
                  <span>Coupons</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {couponItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.href}>
                      <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                        <Link href={subItem.href} className="flex items-center gap-2">
                          <subItem.icon className="size-3.5" />
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

          {/* Foundation Menu */}
          <Collapsible asChild defaultOpen={pathname.includes('/foundation')} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip="Foundation" className="h-8">
                  <Database className="size-4" />
                  <span>Foundation</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {foundationItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.href}>
                      <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                        <Link href={subItem.href}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

          {/* Legal & Support Menu */}
          <Collapsible asChild defaultOpen={pathname.includes('/policies') || pathname.includes('/faqs')} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip="Legal & Support" className="h-8">
                  <ShieldCheck className="size-4" />
                  <span>Legal & Support</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {legalItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.href}>
                      <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                        <Link href={subItem.href} className="flex items-center gap-2">
                          <subItem.icon className="size-3.5" />
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

          {/* Settings Menu */}
          <Collapsible asChild defaultOpen={pathname.includes('/settings')} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip="Settings" className="h-8">
                  <Settings className="size-4" />
                  <span>Settings</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {settingsItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.href}>
                      <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                        <Link href={subItem.href} className="flex items-center gap-2">
                          <subItem.icon className="size-3.5" />
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10",
            isCollapsed && "justify-center px-0"
          )}
          onClick={logout}
        >
          <LogOut className="size-4" />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
