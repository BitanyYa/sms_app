import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/afromessage";

// This endpoint is called by external systems (e.g. warranty registration software)
// It does NOT require dashboard auth — it uses its own schema validation
const WarrantySchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  imei: z.string().min(1),
  warrantyPeriod: z.string().min(1),
  workItem: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const warranty = WarrantySchema.parse(body);

    const message = `Dear ${warranty.name},\n\nYour ${warranty.brand} ${warranty.model} warranty has been registered at Yonas Mobile.\n\nIMEI: ${warranty.imei}\nWarranty Period: ${warranty.warrantyPeriod}\nWork Item: ${warranty.workItem}\n\nThank you for choosing Yonas Mobile.`;

    // Upsert customer
    const customer = await prisma.customer.upsert({
      where: { phone: warranty.phone } as never,
      update: { name: warranty.name },
      create: { name: warranty.name, phone: warranty.phone },
    });

    // Create warranty record
    const warrantyRecord = await prisma.warranty.create({
      data: {
        customerId: customer.id,
        brand: warranty.brand,
        model: warranty.model,
        imei: warranty.imei,
        warrantyPeriod: warranty.warrantyPeriod,
        workItem: warranty.workItem,
      },
    });

    // Send SMS
    const smsResponse = await sendSms(warranty.phone, message);

    // Log SMS
    const smsLog = await prisma.smsLog.create({
      data: {
        warrantyId: warrantyRecord.id,
        phone: warranty.phone,
        message,
        status: smsResponse.success ? "SENT" : "FAILED",
        providerMessageId: smsResponse.messageId,
        providerResponse: smsResponse.response,
      },
    });

    return NextResponse.json(
      { success: true, message: "Warranty registered", data: { warranty: warrantyRecord, smsLog } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Warranty send error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
