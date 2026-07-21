"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Trash2, RefreshCw, Filter, Eye } from "lucide-react";
import type { SmsLog, Warranty, Customer, SmsStatus } from "@/app/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SmsLogWithRelations = SmsLog & {
  warranty: Warranty & { customer: Customer };
};

type StatusFilter = "ALL" | SmsStatus;

function SmsDetailsDialog({ sms }: { sms: SmsLogWithRelations }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" aria-label="View SMS" />}>
        <Eye className="size-3.5" />
        View
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>SMS Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={sms.status === "SENT" ? "success" : sms.status === "FAILED" ? "destructive" : "secondary"}>
              {sms.status}
            </Badge>
            <span className="text-xs text-muted-foreground">{format(new Date(sms.sentAt), "PPpp")}</span>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Name</p><p>{sms.warranty.customer.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Phone</p><p>{sms.phone}</p></div>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Device</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Brand</p><p>{sms.warranty.brand}</p></div>
              <div><p className="text-xs text-muted-foreground">Model</p><p>{sms.warranty.model}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">IMEI</p><p className="font-mono text-xs">{sms.warranty.imei}</p></div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Message Sent</p>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">{sms.message}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SmsPage() {
  const [logs, setLogs] = useState<SmsLogWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ search, status: statusFilter });
      const res = await fetch(`/api/sms?${params}`);
      const data = await res.json();
      if (data.success) setLogs(data.data);
      else setError(data.message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchLogs, 300);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this SMS log?")) return;
    try {
      const res = await fetch(`/api/sms/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("SMS log deleted");
        setLogs((prev) => prev.filter((l) => l.id !== id));
      } else toast.error(data.message);
    } catch { toast.error("Delete failed"); }
  };

  const handleStatusChange = async (id: string, newStatus: SmsStatus) => {
    try {
      const res = await fetch(`/api/sms/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status updated to ${newStatus}`);
        setLogs((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l));
      } else toast.error(data.message);
    } catch { toast.error("Update failed"); }
  };

  const stats = useMemo(() => ({
    total: logs.length,
    sent: logs.filter((l) => l.status === "SENT").length,
    pending: logs.filter((l) => l.status === "PENDING").length,
    failed: logs.filter((l) => l.status === "FAILED").length,
  }), [logs]);

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-3"><CardDescription>Total</CardDescription><CardTitle className="text-3xl">{stats.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardDescription>Sent</CardDescription><CardTitle className="text-3xl text-emerald-600">{stats.sent}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardDescription>Pending</CardDescription><CardTitle className="text-3xl text-amber-600">{stats.pending}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardDescription>Failed</CardDescription><CardTitle className="text-3xl text-destructive">{stats.failed}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle>SMS Logs</CardTitle><CardDescription>All warranty SMS messages</CardDescription></div>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name, phone, or IMEI..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                <option value="ALL">All Status</option>
                <option value="SENT">Sent</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </Select>
            </div>
          </div>

          {loading && <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchLogs}><RefreshCw className="size-4" /> Retry</Button>
            </div>
          )}
          {!loading && !error && logs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm font-medium">No SMS logs found</p>
              <p className="text-xs text-muted-foreground">{search || statusFilter !== "ALL" ? "Try adjusting your filters" : "SMS logs will appear here once messages are sent"}</p>
            </div>
          )}
          {!loading && !error && logs.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((sms) => (
                    <TableRow key={sms.id}>
                      <TableCell className="font-medium">{sms.warranty.customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">{sms.phone}</TableCell>
                      <TableCell>
                        <div><div className="font-medium">{sms.warranty.brand}</div><div className="text-xs text-muted-foreground">{sms.warranty.model}</div></div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sms.status === "SENT" ? "success" : sms.status === "FAILED" ? "destructive" : "secondary"}>
                          {sms.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(sms.sentAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SmsDetailsDialog sms={sms} />
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>···</DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStatusChange(sms.id, "SENT")} disabled={sms.status === "SENT"}>Mark as Sent</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(sms.id, "PENDING")} disabled={sms.status === "PENDING"}>Mark as Pending</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(sms.id, "FAILED")} disabled={sms.status === "FAILED"}>Mark as Failed</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(sms.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="size-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && !error && logs.length > 0 && <p className="text-xs text-muted-foreground">Showing {logs.length} records</p>}
        </CardContent>
      </Card>
    </div>
  );
}
