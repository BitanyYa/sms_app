"use client";

import { usePathname } from "next/navigation";
import { User } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/warranties": "Warranties",
  "/dashboard/sms": "SMS Logs",
  "/dashboard/customers": "Customers",
  "/dashboard/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
        <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="size-3.5" />
        </div>
        <span className="text-sm font-medium">Admin</span>
      </div>
    </header>
  );
}
