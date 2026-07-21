import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const [
    totalWarranties,
    totalCustomers,
    smsSent,
    smsPending,
    smsFailed,
    recentWarranties,
    recentSmsLogs,
  ] = await Promise.all([
    prisma.warranty.count(),
    prisma.customer.count(),
    prisma.smsLog.count({ where: { status: "SENT" } }),
    prisma.smsLog.count({ where: { status: "PENDING" } }),
    prisma.smsLog.count({ where: { status: "FAILED" } }),
    prisma.warranty.findMany({
      take: 5,
      orderBy: { registeredAt: "desc" },
      include: { customer: true },
    }),
    prisma.smsLog.findMany({
      take: 5,
      orderBy: { sentAt: "desc" },
      include: { warranty: { include: { customer: true } } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      stats: { totalWarranties, totalCustomers, smsSent, smsPending, smsFailed },
      recentWarranties,
      recentSmsLogs,
    },
  });
}
