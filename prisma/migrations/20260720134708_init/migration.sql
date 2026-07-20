-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "warrantyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "warrantyPeriod" TEXT NOT NULL,
    "workItem" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SmsStatus" NOT NULL,
    "providerMessageId" TEXT,
    "providerResponse" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsLog_warrantyId_key" ON "SmsLog"("warrantyId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsLog_requestId_key" ON "SmsLog"("requestId");
