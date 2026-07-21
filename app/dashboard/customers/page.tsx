"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Search, RefreshCw, Eye } from "lucide-react";
import type { Customer, Warranty, SmsLog } from "@/app/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type CustomerRow = Customer & {
  _count: { warranties: number };
  warranties: (Warranty & { smsLogs: SmsLog[] })[];
};

function CustomerDetailsDialog({ customer }: { customer: CustomerRow }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" aria-label="View customer" />}>
        <Eye className="size-3.5" />
        View
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profile</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Name</p><p>{customer.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Phone</p><p>{customer.phone}</p></div>
              {customer.email && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Email</p><p>{customer.email}</p></div>
              )}
              <div><p className="text-xs text-muted-foreground">Member Since</p><p>{format(new Date(customer.createdAt), "PPP")}</p></div>
              <div><p className="text-xs text-muted-foreground">Warranties</p><p>{customer._count.warranties}</p></div>
            </div>
          </div>

          {customer.warranties.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Registered Devices</p>
              <div className="space-y-2">
                {customer.warranties.map((w) => {
                  const lastSms = w.smsLogs?.[0];
                  return (
                    <div key={w.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <p className="font-medium">{w.brand} {w.model}</p>
                        <p className="font-mono text-xs text-muted-foreground">{w.imei}</p>
                        <p className="text-xs text-muted-foreground">{w.warrantyPeriod}</p>
                      </div>
                      {lastSms && (
                        <Badge variant={lastSms.status === "SENT" ? "success" : lastSms.status === "FAILED" ? "destructive" : "secondary"}>
                          {lastSms.status}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      if (data.success) setCustomers(data.data);
      else setError(data.message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Customers</CardTitle>
              <CardDescription>All registered customers and their warranty history</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading && <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchCustomers}><RefreshCw className="size-4" /> Retry</Button>
            </div>
          )}
          {!loading && !error && customers.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm font-medium">No customers found</p>
              <p className="text-xs text-muted-foreground">{search ? "Try a different search" : "Customers are created automatically when warranties are registered"}</p>
            </div>
          )}
          {!loading && !error && customers.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Warranties</TableHead>
                    <TableHead>Last Registration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c._count.warranties}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.warranties[0] ? format(new Date(c.warranties[0].registeredAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <CustomerDetailsDialog customer={c} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && !error && customers.length > 0 && (
            <p className="text-xs text-muted-foreground">{customers.length} customers total</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
