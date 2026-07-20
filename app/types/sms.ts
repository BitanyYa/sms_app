export type SmsLog = {
  id: string;
  warrantyId: string;
  name: string;
  phone: string;
  brand: string;
  model: string;
  imei: string;
  warrantyPeriod: string;
  workItem: string;
  message: string;
  status: "SENT" | "FAILED";
  sentAt: string;
};