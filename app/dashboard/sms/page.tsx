"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search, Trash2, RefreshCw, Filter, RotateCcw,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import type { SmsLog, SmsStatus, Pagination } from "@/app/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type SmsLogRow = SmsLog & {
  warranty: {
    id: string;
    warrantyId: string | null;
    brand: string;
    model: string;
    imei: string;
    warrantyPeriod: string;
    workItem: string;
    customer: { name: string; phone: string };
  };
};

type StatusFilter = "ALL" | SmsStatus;

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SmsStatus }) {
  return (
    <Badge
      variant={
        status === "SENT" ? "success" : status === "FAILED" ? "destructive" : "secondary"
      }
    >
      {status}
    </Badge>
  );
}

// ─── Detail row helper ────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm break-all">{value ?? "—"}</span>
    </div>
  );
}

// ─── SMS Details Dialog ───────────────────────────────────────────────────────
function SmsDetailsDialog({ sms }: { sms: SmsLogRow }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" aria-label="View SMS details" />}>
        View
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SMS Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pb-2">
          {/* Status + date */}
          <div className="flex items-center gap-3">
            <StatusBadge status={sms.status} />
            <span className="text-xs text-muted-foreground">
              {format(new Date(sms.sentAt), "PPpp")}
            </span>
          </div>

          {/* Customer */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Customer
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Name" value={sms.warranty.customer.name} />
              <DetailRow label="Phone" value={sms.phone} />
            </div>
          </div>

          {/* Device */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Device
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Brand" value={sms.warranty.brand} />
              <DetailRow label="Model" value={sms.warranty.model} />
              <DetailRow
                label="IMEI"
                value={<span className="font-mono text-xs">{sms.warranty.imei}</span>}
              />
              <DetailRow label="Warranty Period" value={sms.warranty.warrantyPeriod} />
              <DetailRow label="Work Item" value={sms.warranty.workItem} />
              <DetailRow
                label="Warranty ID"
                value={<span className="font-mono text-xs">{sms.warrantyId}</span>}
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Message
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">
              {sms.message}
            </div>
          </div>

          {/* Provider info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Provider
            </p>
            <div className="space-y-3">
              <DetailRow label="AfroMessage Message ID" value={sms.providerMessageId} />
              <DetailRow label="AfroMessage Response" value={sms.providerResponse} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pagination controls ──────────────────────────────────────────────────────
function PaginationBar({
  pagination,
  onPage,
}: {
  pagination: Pagination;
  onPage: (p: number) => void;
}) {
  const { page, totalPages, total, pageSize } = pagination;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {total === 0 ? "No records" : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-2">
          {page} / {totalPages || 1}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SmsPage() {
  const [logs, setLogs] = useState<SmsLogRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch current user role once
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.success) setIsAdmin(d.data.role === "ADMIN"); })
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        page: String(p),
      });
      const res = await fetch(`/api/sms?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.message);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  // Debounce search/filter changes, reset to page 1
  useEffect(() => {
    setPage(1);
    const t = setTimeout(() => fetchLogs(1), 350);
    return () => clearTimeout(t);
  }, [search, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Page change (no debounce)
  useEffect(() => {
    fetchLogs(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this SMS log? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/sms/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("SMS log deleted");
        setLogs((prev) => prev.filter((l) => l.id !== id));
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      const res = await fetch(`/api/sms/${id}/retry`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(
          data.data.status === "SENT" ? "SMS resent successfully" : "Retry attempted — still failed"
        );
        setLogs((prev) =>
          prev.map((l) => (l.id === id ? { ...l, ...data.data } : l))
        );
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Retry failed");
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>SMS Logs</CardTitle>
              <CardDescription>
                All warranty SMS messages — search, filter, and manage delivery status
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(page)}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, IMEI, or Warranty ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 shrink-0 text-muted-foreground" />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="ALL">All Status</option>
                <option value="SENT">Sent</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </Select>
            </div>
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchLogs(page)}>
                <RefreshCw className="size-4" /> Retry
              </Button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && logs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm font-medium">No SMS logs found</p>
              <p className="text-xs text-muted-foreground">
                {search || statusFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "SMS logs will appear here once messages are sent"}
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && logs.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Warranty ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((sms) => (
                    <TableRow key={sms.id}>
                      <TableCell className="font-medium">
                        {sms.warranty.customer.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sms.phone}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sms.warranty.brand}</div>
                          <div className="text-xs text-muted-foreground">
                            {sms.warranty.model}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {sms.warranty.imei}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {sms.warranty.warrantyId ?? <span className="italic text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sms.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(sms.sentAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SmsDetailsDialog sms={sms} />

                          {/* Retry — only for FAILED */}
                          {sms.status === "FAILED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(sms.id)}
                              disabled={retrying === sms.id}
                              aria-label="Retry SMS"
                            >
                              <RotateCcw
                                className={retrying === sms.id ? "animate-spin size-3.5" : "size-3.5"}
                              />
                              Retry
                            </Button>
                          )}

                          {/* Delete — admin only */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(sms.id)}
                              aria-label="Delete SMS log"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && pagination.total > 0 && (
            <PaginationBar pagination={pagination} onPage={setPage} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
