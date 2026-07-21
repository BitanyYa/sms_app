import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // Start of today (server time)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalSms, smsSent, smsFailed, smsPending, smsSentToday, recentSmsLogs] =
    await Promise.all([
      prisma.smsLog.count({ where: { deletedAt: null } }),
      prisma.smsLog.count({ where: { deletedAt: null, status: "SENT" } }),
      prisma.smsLog.count({ where: { deletedAt: null, status: "FAILED" } }),
      prisma.smsLog.count({ where: { deletedAt: null, status: "PENDING" } }),
      prisma.smsLog.count({
        where: { deletedAt: null, status: "SENT", sentAt: { gte: todayStart } },
      }),
      prisma.smsLog.findMany({
        where: { deletedAt: null },
        take: 10,
        orderBy: { sentAt: "desc" },
        include: { warranty: { include: { customer: true } } },
      }),
    ]);

  return NextResponse.json({
    success: true,
    data: {
      stats: { totalSms, smsSent, smsFailed, smsPending, smsSentToday },
      recentSmsLogs,
    },
  });
}
