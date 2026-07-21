import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const WarrantySchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Phone is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  imei: z.string().min(1, "IMEI is required"),
  warrantyPeriod: z.string().min(1, "Warranty period is required"),
  workItem: z.string().min(1, "Work item is required"),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const where = search
    ? {
        OR: [
          { customer: { name: { contains: search, mode: "insensitive" as const } } },
          { customer: { phone: { contains: search, mode: "insensitive" as const } } },
          { brand: { contains: search, mode: "insensitive" as const } },
          { model: { contains: search, mode: "insensitive" as const } },
          { imei: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [warranties, total] = await Promise.all([
    prisma.warranty.findMany({
      where,
      include: { customer: true, smsLogs: { orderBy: { sentAt: "desc" }, take: 1 } },
      orderBy: { registeredAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.warranty.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: warranties, meta: { total, page, limit } });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = WarrantySchema.parse(body);

    // Upsert customer by phone
    const customer = await prisma.customer.upsert({
      where: { phone: data.customerPhone } as never,
      update: { name: data.customerName, email: data.customerEmail || null },
      create: {
        name: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail || null,
      },
    });

    const warranty = await prisma.warranty.create({
      data: {
        customerId: customer.id,
        brand: data.brand,
        model: data.model,
        imei: data.imei,
        warrantyPeriod: data.warrantyPeriod,
        workItem: data.workItem,
      },
      include: { customer: true },
    });

    return NextResponse.json({ success: true, data: warranty }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0].message }, { status: 400 });
    }
    console.error("Create warranty error:", error);
    return NextResponse.json({ success: false, message: "Failed to create warranty" }, { status: 500 });
  }
}
