import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/afromessage";

// This endpoint is called by external systems (e.g. warranty registration software)
// It does NOT require dashboard auth,  it uses its own schema validation
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
    //
    // TEMPORARY: Currently using IMEI as the deduplication key because the external warranty
    // system has not yet confirmed whether it sends a unique Warranty ID / Registration ID
    // per transaction.
    //
    // LIMITATION: IMEI identifies a device, not a warranty transaction. This means only ONE
    // warranty registration will ever be processed per device. If the same device is legitimately
    // re-registered (e.g. after a repair, resale, or renewed warranty), the second registration
    // will be silently treated as a duplicate and no SMS will be sent.
    //
    // TODO: Once confirmed with the warranty system developers, replace the IMEI check with a
    // unique transaction-level identifier (e.g. warrantyId, registrationId, transactionId).
    // Steps to refactor:
    //   1. Add the new field to WarrantySchema and the Warranty model (with @unique in schema.prisma)
    //   2. Run `prisma migrate dev` to apply the schema change
    //   3. Replace `where: { imei: warranty.imei }` with `where: { warrantyId: warranty.warrantyId }`
    const existingWarranty = await prisma.warranty.findUnique({
      where: { imei: warranty.imei },
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
