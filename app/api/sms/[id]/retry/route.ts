import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendSms } from "@/lib/afromessage";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const log = await prisma.smsLog.findFirst({
    where: { id, deletedAt: null },
    include: { warranty: { include: { customer: true } } },
  });

  if (!log) {
    return NextResponse.json({ success: false, message: "SMS log not found" }, { status: 404 });
  }

  if (log.status !== "FAILED") {
    return NextResponse.json(
      { success: false, message: "Only FAILED messages can be retried" },
      { status: 400 }
    );
  }

  const smsResponse = await sendSms(log.phone, log.message);

  const updated = await prisma.smsLog.update({
    where: { id },
    data: {
      status: smsResponse.success ? "SENT" : "FAILED",
      providerMessageId: smsResponse.messageId ?? log.providerMessageId,
      providerResponse: smsResponse.response,
      sentAt: new Date(),
    },
    include: { warranty: { include: { customer: true } } },
  });

  return NextResponse.json({ success: true, data: updated });
}
