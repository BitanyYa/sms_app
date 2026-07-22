import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/afromessage";

// This endpoint is called by external systems (e.g. warranty registration software)
// It does NOT require dashboard auth,  it uses its own schema validation
const WarrantySchema = z.object({
  warrantyId: z.string().min(1),
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
    // Step 1: API key authentication
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const warranty = WarrantySchema.parse(body);

    // Step 2: Duplicate protection — prevent sending multiple SMS for the same warranty registration.
    // Uses the external warranty system's warrantyId as the deduplication key, which is unique
    // per transaction and won't block legitimate re-registrations of the same device.
    const existingWarranty = await prisma.warranty.findUnique({
      where: { warrantyId: warranty.warrantyId },
      include: { smsLogs: { take: 1, orderBy: { createdAt: "desc" } } },
    });

    if (existingWarranty && existingWarranty.smsLogs.length > 0) {
      return NextResponse.json(
        {
          success: true,
          message: "Warranty already processed.",
          duplicate: true,
          data: { warranty: existingWarranty, smsLog: existingWarranty.smsLogs[0] },
        },
        { status: 200 }
      );
    }

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
        warrantyId: warranty.warrantyId,
        brand: warranty.brand,
        model: warranty.model,
        imei: warranty.imei,
        warrantyPeriod: warranty.warrantyPeriod,
        workItem: warranty.workItem,
      },
    });

    // Build bilingual SMS message
    const message = [
      "ውድ ደንበኛችን ስለጎበኙን እናመሰግናለን! የገዙት እቃ ሙሉ ዋስትና አለው።",
      "",
      `የዋስትና ቁጥር:: ${warrantyRecord.id}`,
      "",
      "ለእርዳታ ወይም ለአገልግሎት ሲመጡ ይህንን መልእክት ያሳዩ።",
      "",
      
      "Dear Customer,",
      "",
      "Thank you for shopping with us! Your item comes with a full warranty.",
      "",
      `Warranty ID: ${warrantyRecord.id}`,
      "Please save this message for any service or support.",
      "",
    ].join("\n");

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
