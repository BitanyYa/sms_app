// ─── User ──────────────────────────────────────────────────────────────────
export type UserRole = "ADMIN" | "USER";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

// ─── Customer ───────────────────────────────────────────────────────────────
export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { warranties: number };
  warranties?: Warranty[];
};

// ─── Warranty ───────────────────────────────────────────────────────────────
export type Warranty = {
  id: string;
  customerId: string;
  customer?: Customer;
  brand: string;
  model: string;
  imei: string;
  warrantyPeriod: string;
  workItem: string;
  registeredAt: string;
  updatedAt: string;
  smsLogs?: SmsLog[];
};

// ─── SMS ─────────────────────────────────────────────────────────────────────
export type SmsStatus = "PENDING" | "SENT" | "FAILED";

export type SmsLog = {
  id: string;
  warrantyId: string;
  warranty?: Warranty;
  phone: string;
  message: string;
  status: SmsStatus;
  providerMessageId: string | null;
  providerResponse: string | null;
  sentAt: string;
  createdAt: string;
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export type DashboardStats = {
  totalWarranties: number;
  totalCustomers: number;
  smsSent: number;
  smsPending: number;
  smsFailed: number;
};

export type DashboardData = {
  stats: DashboardStats;
  recentWarranties: (Warranty & { customer: Customer })[];
  recentSmsLogs: (SmsLog & { warranty: Warranty & { customer: Customer } })[];
};

// ─── API Response wrapper ─────────────────────────────────────────────────
export type ApiResponse<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };
