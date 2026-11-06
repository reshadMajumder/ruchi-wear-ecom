"use client";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const users = [
  { name: "John Smith", email: "john@example.com", joinDate: "Jan 12, 2024", orders: 15, status: "Active" },
  { name: "Sarah Williams", email: "sarah.w@test.com", joinDate: "Feb 05, 2024", orders: 3, status: "Active" },
  { name: "Michael Brown", email: "mike.b@gmail.com", joinDate: "Mar 18, 2024", orders: 0, status: "Inactive" },
  { name: "Emma Wilson", email: "emma_wilson@outlook.com", joinDate: "Apr 22, 2024", orders: 8, status: "Active" },
  { name: "James Davis", email: "jdavis@corporate.com", joinDate: "May 30, 2024", orders: 22, status: "Active" },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Customers</h1>
        <p className="text-muted-foreground">Browse registered user accounts and their history.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>{user.joinDate}</TableCell>
                  <TableCell>{user.orders}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'Active' ? 'outline' : 'secondary'} className={cn(
                      user.status === 'Active' && "text-emerald-600 bg-emerald-50 border-emerald-100"
                    )}>
                      {user.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { cn } from '@/lib/utils';