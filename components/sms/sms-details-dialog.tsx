"use client";

import { SmsLog } from "@/app/types/sms";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

type Props = {
  sms: SmsLog;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export default function SmsDetailsDialog({ sms }: Props) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" aria-label="View SMS details" />
        }
      >
        <Eye className="size-3.5" />
        View
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>SMS Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge variant={sms.status === "SENT" ? "success" : "destructive"}>
              {sms.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(sms.sentAt).toLocaleString()}
            </span>
          </div>

          {/* Customer info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Customer
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Name" value={sms.name} />
              <DetailRow label="Phone" value={sms.phone} />
            </div>
          </div>

          {/* Product info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Product
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Brand" value={sms.brand} />
              <DetailRow label="Model" value={sms.model} />
              <DetailRow
                label="IMEI"
                value={
                  <span className="font-mono text-xs">{sms.imei}</span>
                }
              />
              <DetailRow label="Warranty Period" value={sms.warrantyPeriod} />
              <DetailRow label="Work Item" value={sms.workItem} />
            </div>
          </div>

          {/* SMS Message */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Message Sent
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed text-foreground">
              {sms.message}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
