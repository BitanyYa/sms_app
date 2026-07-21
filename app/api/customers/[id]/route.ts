import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      warranties: {
        orderBy: { registeredAt: "desc" },
        include: { smsLogs: { orderBy: { sentAt: "desc" }, take: 1 } },
      },
      _count: { select: { warranties: true } },
    },
  });

  if (!customer) {
    return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: customer });
}
