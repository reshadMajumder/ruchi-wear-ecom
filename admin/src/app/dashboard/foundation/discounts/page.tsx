"use client";

import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Percent,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const initialDiscounts = [
  { 
    id: 1, 
    name: "New Year Sale", 
    type: "percentage", 
    value: 15, 
    scope: "global", 
    is_active: true, 
    start: "2024-01-01", 
    end: "2024-12-31" 
  },
  { 
    id: 2, 
    name: "Summer Clearance", 
    type: "fixed", 
    value: 500, 
    scope: "category", 
    is_active: true, 
    start: "2024-06-01", 
    end: "2024-08-31" 
  },
  { 
    id: 3, 
    name: "Black Friday", 
    type: "percentage", 
    value: 40, 
    scope: "global", 
    is_active: false, 
    start: "2024-11-20", 
    end: "2024-11-30" 
  },
  { 
    id: 4, 
    name: "Apparel Promo", 
    type: "percentage", 
    value: 10, 
    scope: "product", 
    is_active: true, 
    start: "2024-03-01", 
    end: "2024-04-01" 
  },
];

export default function DiscountsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDiscounts = initialDiscounts.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.scope.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Percent className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Discounts</h1>
            <p className="text-muted-foreground">Manage promotions, coupons, and seasonal offers.</p>
          </div>
        </div>
        <Button className="gap-2 shadow-lg">
          <Plus className="w-4 h-4" />
          Create Discount
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white/50 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search discounts..." 
                className="pl-9 h-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/50">
                <TableHead className="font-bold">Name</TableHead>
                <TableHead className="font-bold">Value</TableHead>
                <TableHead className="font-bold">Scope</TableHead>
                <TableHead className="font-bold">Duration</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDiscounts.map((discount) => (
                <TableRow key={discount.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-semibold">
                    <div className="flex flex-col">
                      <span>{discount.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">{discount.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-black text-primary">
                      {discount.type === 'percentage' ? `${discount.value}%` : `৳${discount.value.toLocaleString()}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize bg-white">
                      {discount.scope}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{discount.start} to {discount.end}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {discount.is_active ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-50">
                          <XCircle className="w-3 h-3 mr-1" /> Inactive
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2">
                          <Edit2 className="w-4 h-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredDiscounts.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              No discounts found matching "{searchTerm}"
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
