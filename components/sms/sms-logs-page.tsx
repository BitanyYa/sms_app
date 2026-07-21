"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Search, Trash2, RefreshCw, Filter } from "lucide-react";
import { SmsLog } from "@/app/types/sms";
import SmsDetailsDialog from "@/components/sms/sms-details-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StatusFilter = "ALL" | "SENT" | "FAILED";

export function SmsLogsPage() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sms-logs", { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setLogs(data.data);
      } else {
        setError(data.message || "Failed to fetch logs");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SMS log?")) return;

    try {
      const res = await fetch(`/api/sms-logs/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("SMS log deleted");
        setLogs((prev) => prev.filter((log) => log.id !== id));
      } else {
        toast.error(data.message || "Failed to delete");
      }
    } catch (err) {
      toast.error("Delete failed");
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "SENT" | "FAILED") => {
    try {
      const res = await fetch(`/api/sms-logs/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Status updated to ${newStatus}`);
        setLogs((prev) =>
          prev.map((log) => (log.id === id ? { ...log, status: newStatus } : log))
        );
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch (err) {
      toast.error("Status update failed");
      console.error(err);
    }
  };

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.name.toLowerCase().includes(query) ||
          log.phone.toLowerCase().includes(query) ||
          log.brand.toLowerCase().includes(query) ||
          log.model.toLowerCase().includes(query) ||
          log.imei.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [logs, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((log) => log.status === "SENT").length;
    const failed = logs.filter((log) => log.status === "FAILED").length;
    return { total, sent, failed };
  }, [logs]);

  return (
    <div className="h-full space-y-6 p-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total SMS</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sent</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{stats.sent}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl text-destructive">{stats.failed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>SMS Records</CardTitle>
              <CardDescription>View and manage warranty SMS records</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
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
                placeholder="Search by name, phone, IMEI, brand, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="ALL">All Status</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
              </Select>
            </div>
          </div>

          {/* Loading */}
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
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="size-4" />
                Retry
              </Button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filteredLogs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm font-medium">No SMS logs found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "SMS logs will appear here once sent"}
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && filteredLogs.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((sms) => (
                    <TableRow key={sms.id}>
                      <TableCell className="font-medium">{sms.name}</TableCell>
                      <TableCell className="text-muted-foreground">{sms.phone}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sms.brand}</div>
                          <div className="text-xs text-muted-foreground">{sms.model}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {sms.imei}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sms.warrantyPeriod}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sms.status === "SENT" ? "success" : "destructive"}>
                          {sms.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(sms.sentAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SmsDetailsDialog sms={sms} />

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="More actions"
                                />
                              }
                            >
                              ···
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(sms.id, "SENT")}
                                disabled={sms.status === "SENT"}
                              >
                                Mark as Sent
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(sms.id, "FAILED")}
                                disabled={sms.status === "FAILED"}
                              >
                                Mark as Failed
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(sms.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4" />
                                Delete
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

          {!loading && !error && filteredLogs.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredLogs.length} of {stats.total} records
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
