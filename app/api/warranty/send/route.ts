import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/afromessage";

/**
 * POST /api/warranty/send
 *
 * Called by the external Warranty Management System when a new warranty is registered.
 * Authenticated via the `x-api-key` header (must match the API_KEY env var).
 *
 * Request body:
 * {
 *   "warrantyId":     "482913",                         // required — unique ID from the warranty system
 *   "name":           "Abebe Kebede",                   // required — customer full name
 *   "phone":          "0912345678",                     // required — customer phone number
 *   "brand":          "Samsung",                        // required — device brand
 *   "model":          "Galaxy A56",                     // required — device model
 *   "imei":           "356789123456",                   // required — device IMEI
 *   "warrantyPeriod": "2 Years",                        // required — warranty duration
 *   "workItem":       "Hardware & Software Warranty"    // required — type of warranty service
 * }
 *
 * Success response (new registration):
 * HTTP 201
 * { "success": true, "message": "Warranty registered", "data": { warranty, smsLog } }
 *
 * Success response (duplicate — already processed):
 * HTTP 200
 * {
 *   "success": true,
 *   "duplicate": true,
 *   "message": "Warranty has already been processed. No new SMS was sent.",
 *   "data": { ...existing warranty record }
 * }
 *
 * Duplicate detection always uses warrantyId — never IMEI.
 */

const WarrantySchema = z.object({
  warrantyId:     z.string({ error: "warrantyId is required" })
                   .min(1, "warrantyId must not be empty"),
  name:           z.string().min(1, "name is required"),
  phone:          z.string().min(1, "phone is required"),
  brand:          z.string().min(1, "brand is required"),
  model:          z.string().min(1, "model is required"),
  imei:           z.string().min(1, "imei is required"),
  warrantyPeriod: z.string().min(1, "warrantyPeriod is required"),
  workItem:       z.string().min(1, "workItem is required"),
});

export async function POST(req: NextRequest) {
  try {
    // ── Step 1: API key authentication ───────────────────────────────────────
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // ── Step 2: Validate request body ─────────────────────────────────────────
    const body = await req.json();
    const warranty = WarrantySchema.parse(body);

    // ── Step 3: Duplicate detection via warrantyId ────────────────────────────
    // Uses the external warranty system's warrantyId as the deduplication key.
    // This is unique per transaction and won't block legitimate re-registrations
    // of the same device under a different warranty.
    const existingWarranty = await prisma.warranty.findUnique({
      where: { warrantyId: warranty.warrantyId },
      include: {
        customer: true,
        smsLogs: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    if (existingWarranty && existingWarranty.smsLogs.length > 0) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          message: "Warranty has already been processed. No new SMS was sent.",
          data: existingWarranty,
        },
        { status: 200 }
      );
    }

    // ── Step 4: Upsert customer ───────────────────────────────────────────────
    const customer = await prisma.customer.upsert({
      where: { phone: warranty.phone } as never,
      update: { name: warranty.name },
      create: { name: warranty.name, phone: warranty.phone },
    });

    // ── Step 5: Create warranty record ────────────────────────────────────────
    const warrantyRecord = await prisma.warranty.create({
      data: {
        customerId:     customer.id,
        warrantyId:     warranty.warrantyId,
        brand:          warranty.brand,
        model:          warranty.model,
        imei:           warranty.imei,
        warrantyPeriod: warranty.warrantyPeriod,
        workItem:       warranty.workItem,
      },
    });

    // ── Step 6: Build bilingual SMS message ───────────────────────────────────
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

    // ── Steps 7-9: Send SMS and log — runs after the response is returned ─────
    // Using next/server `after()` so the caller gets an immediate 201 and does
    // not have to wait for the AfroMessage network round-trip.
    after(async () => {
      const smsResponse = await sendSms(warranty.phone, message);

      if (!smsResponse.success) {
        console.error(
          [
            "",
            "SMS SEND FAILED",
            `  Warranty ID : ${warranty.warrantyId}`,
            `  Customer    : ${warranty.name}`,
            `  Phone       : ${warranty.phone}`,
            `  Time        : ${new Date().toISOString()}`,
            `  Reason      : ${smsResponse.response ?? "Unknown error"}`,
            "",
          ].join("\n")
        );
      }

      await prisma.smsLog.create({
        data: {
          warrantyId:        warrantyRecord.id,
          phone:             warranty.phone,
          message,
          status:            smsResponse.success ? "SENT" : "FAILED",
          providerMessageId: smsResponse.messageId,
          providerResponse:  smsResponse.response,
        },
      });
    });

    // Respond immediately — SMS is queued in the background
    return NextResponse.json(
      {
        success: true,
        message: "Warranty registered. SMS is being sent.",
        data: { warranty: warrantyRecord },
      },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0].message },
        { status: 400 }
      );
    }

    // Unique constraint violation — duck-type check avoids brittle Prisma runtime imports
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const meta = (error as { meta?: { target?: string[] } }).meta;
      const field = meta?.target?.join(", ") ?? "field";
      return NextResponse.json(
        { success: false, message: `A record with this ${field} already exists` },
        { status: 409 }
      );
    }

    // Log full internal error server-side; return only a generic message to the client
    console.error("Warranty send error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
