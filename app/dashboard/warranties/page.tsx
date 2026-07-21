"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, Trash2, RefreshCw, Eye, Plus } from "lucide-react";
import { format } from "date-fns";
import type { Warranty, Customer, SmsLog } from "@/app/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type WarrantyWithRelations = Warranty & {
  customer: Customer;
  smsLogs: SmsLog[];
};

function WarrantyDetailsDialog({ warranty }: { warranty: WarrantyWithRelations }) {
  const lastSms = warranty.smsLogs[0];
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" aria-label="View warranty" />}>
        <Eye className="size-3.5" />
        View
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Warranty Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Name</p><p>{warranty.customer.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Phone</p><p>{warranty.customer.phone}</p></div>
              {warranty.customer.email && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Email</p><p>{warranty.customer.email}</p></div>
              )}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Product</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Brand</p><p>{warranty.brand}</p></div>
              <div><p className="text-xs text-muted-foreground">Model</p><p>{warranty.model}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">IMEI</p><p className="font-mono text-xs">{warranty.imei}</p></div>
              <div><p className="text-xs text-muted-foreground">Warranty Period</p><p>{warranty.warrantyPeriod}</p></div>
              <div><p className="text-xs text-muted-foreground">Work Item</p><p>{warranty.workItem}</p></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Registered</span>
            <span>{format(new Date(warranty.registeredAt), "PPP")}</span>
          </div>
          {lastSms && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SMS Status</span>
              <Badge variant={lastSms.status === "SENT" ? "success" : lastSms.status === "FAILED" ? "destructive" : "secondary"}>
                {lastSms.status}
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<WarrantyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchWarranties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/warranties?${params}`);
      const data = await res.json();
      if (data.success) setWarranties(data.data);
      else setError(data.message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchWarranties, 300);
    return () => clearTimeout(t);
  }, [fetchWarranties]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this warranty? All related SMS logs will also be deleted.")) return;
    try {
      const res = await fetch(`/api/warranties/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Warranty deleted");
        setWarranties((prev) => prev.filter((w) => w.id !== id));
      } else toast.error(data.message);
    } catch {
      toast.error("Delete failed");
    }
  };

  const stats = useMemo(() => ({
    total: warranties.length,
    sent: warranties.filter((w) => w.smsLogs[0]?.status === "SENT").length,
    failed: warranties.filter((w) => w.smsLogs[0]?.status === "FAILED").length,
  }), [warranties]);

  return (
    <div className="space-y-6 p-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-3"><CardDescription>Total</CardDescription><CardTitle className="text-3xl">{stats.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardDescription>SMS Sent</CardDescription><CardTitle className="text-3xl text-emerald-600">{stats.sent}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardDescription>SMS Failed</CardDescription><CardTitle className="text-3xl text-destructive">{stats.failed}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Warranty Records</CardTitle>
              <CardDescription>All registered device warranties</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchWarranties} disabled={loading}>
                <RefreshCw className={loading ? "animate-spin" : ""} />
                Refresh
              </Button>
              <Button size="sm" disabled>
                <Plus />
                Add Warranty
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, IMEI, brand, or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading && (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          )}
          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchWarranties}><RefreshCw className="size-4" /> Retry</Button>
            </div>
          )}
          {!loading && !error && warranties.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm font-medium">No warranties found</p>
              <p className="text-xs text-muted-foreground">{search ? "Try a different search" : "Warranties will appear here once registered"}</p>
            </div>
          )}
          {!loading && !error && warranties.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead>SMS</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warranties.map((w) => {
                    const lastSms = w.smsLogs[0];
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.customer.name}</TableCell>
                        <TableCell className="text-muted-foreground">{w.customer.phone}</TableCell>
                        <TableCell>
                          <div><div className="font-medium">{w.brand}</div><div className="text-xs text-muted-foreground">{w.model}</div></div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{w.imei}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{w.warrantyPeriod}</TableCell>
                        <TableCell>
                          {lastSms ? (
                            <Badge variant={lastSms.status === "SENT" ? "success" : lastSms.status === "FAILED" ? "destructive" : "secondary"}>
                              {lastSms.status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(w.registeredAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <WarrantyDetailsDialog warranty={w} />
                            <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(w.id)} aria-label="Delete warranty">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && !error && warranties.length > 0 && (
            <p className="text-xs text-muted-foreground">Showing {warranties.length} records</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
