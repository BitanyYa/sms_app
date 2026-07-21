-- Add soft delete column to SmsLog
ALTER TABLE "SmsLog" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Add index for soft delete queries
CREATE INDEX "SmsLog_deletedAt_idx" ON "SmsLog"("deletedAt");
