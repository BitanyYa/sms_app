import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const PAGE_SIZE = 20;

type SearchBy = "all" | "name" | "phone" | "imei" | "product" | "warrantyId";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const search   = searchParams.get("search")?.trim() ?? "";
  const searchBy = (searchParams.get("searchBy") ?? "all") as SearchBy;
  const status   = searchParams.get("status") ?? "ALL";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const statusFilter =
    status !== "ALL" ? { status: status as "PENDING" | "SENT" | "FAILED" } : {};

  const fieldFilters: Record<SearchBy, object> = {
    all: {
      OR: [
        { phone:      { contains: search, mode: "insensitive" as const } },
        { warranty: { customer: { name: { contains: search, mode: "insensitive" as const } } } },
        { warranty: { imei:  { contains: search, mode: "insensitive" as const } } },
        { warranty: { brand: { contains: search, mode: "insensitive" as const } } },
        { warranty: { model: { contains: search, mode: "insensitive" as const } } },
        { warranty: { warrantyId: { contains: search, mode: "insensitive" as const } } },
      ],
    },
    name:       { warranty: { customer: { name: { contains: search, mode: "insensitive" as const } } } },
    phone:      { phone: { contains: search, mode: "insensitive" as const } },
    imei:       { warranty: { imei: { contains: search, mode: "insensitive" as const } } },
    product:    { OR: [
      { warranty: { brand: { contains: search, mode: "insensitive" as const } } },
      { warranty: { model: { contains: search, mode: "insensitive" as const } } },
    ]},
    warrantyId: { warranty: { warrantyId: { contains: search, mode: "insensitive" as const } } },
  };

  const searchFilter = search ? fieldFilters[searchBy] ?? fieldFilters.all : {};

  const where = {
    deletedAt: null,
    ...statusFilter,
    ...searchFilter,
  };

  const [total, logs] = await Promise.all([
    prisma.smsLog.count({ where }),
    prisma.smsLog.findMany({
      where,
      include: { warranty: { include: { customer: true } } },
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: logs,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
}
