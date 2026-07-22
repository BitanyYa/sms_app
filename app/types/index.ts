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
  warrantyId: string | null;
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
  warranty?: Warranty & { customer: Customer };
  phone: string;
  message: string;
  status: SmsStatus;
  providerMessageId: string | null;
  providerResponse: string | null;
  sentAt: string;
  createdAt: string;
  deletedAt: string | null;
};

// ─── Pagination ───────────────────────────────────────────────────────────────
export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export type DashboardStats = {
  totalSms: number;
  smsSent: number;
  smsFailed: number;
  smsPending: number;
  smsSentToday: number;
};

export type DashboardData = {
  stats: DashboardStats;
  recentSmsLogs: (SmsLog & { warranty: Warranty & { customer: Customer } })[];
};

// ─── API Response wrapper ─────────────────────────────────────────────────
export type ApiResponse<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };
