"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  RefreshCw, MessageSquareText, CheckCircle2, XCircle, Clock, CalendarCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardData } from "@/app/types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.message);
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const statCards = data
    ? [
        {
          label: "Total SMS",
          value: data.stats.totalSms,
          icon: MessageSquareText,
          color: "text-blue-600",
        },
        {
          label: "Sent",
          value: data.stats.smsSent,
          icon: CheckCircle2,
          color: "text-emerald-600",
        },
        {
          label: "Failed",
          value: data.stats.smsFailed,
          icon: XCircle,
          color: "text-destructive",
        },
        {
          label: "Pending",
          value: data.stats.smsPending,
          icon: Clock,
          color: "text-amber-600",
        },
        {
          label: "Sent Today",
          value: data.stats.smsSentToday,
          icon: CalendarCheck,
          color: "text-violet-600",
        },
      ]
    : [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">
            SMS delivery summary for Yonas Mobile
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Icon className={`size-3.5 ${color}`} />
                  {label}
                </CardDescription>
                <CardTitle className="text-3xl">{value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Recent SMS activity */}
      {!loading && !error && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent SMS</CardTitle>
            <CardDescription>Last 10 messages sent</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentSmsLogs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No SMS logs yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentSmsLogs.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.warranty.customer.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.phone} &middot; {s.warranty.brand} {s.warranty.model}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        variant={
                          s.status === "SENT"
                            ? "success"
                            : s.status === "FAILED"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {s.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.sentAt), "MMM d, HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
