import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "ALL";

  const statusFilter = status !== "ALL" ? { status: status as "PENDING" | "SENT" | "FAILED" } : {};

  const searchFilter = search
    ? {
        OR: [
          { phone: { contains: search, mode: "insensitive" as const } },
          { warranty: { customer: { name: { contains: search, mode: "insensitive" as const } } } },
          { warranty: { imei: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const logs = await prisma.smsLog.findMany({
    where: { ...statusFilter, ...searchFilter },
    include: { warranty: { include: { customer: true } } },
    orderBy: { sentAt: "desc" },
  });

  return NextResponse.json({ success: true, data: logs });
}
