import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/afromessage";

const WarrantySchema = z.object({
  warrantyId: z.string(),
  name: z.string(),
  phone: z.string(),
  brand: z.string(),
  model: z.string(),
  imei: z.string(),
  warrantyPeriod: z.string(),
  workItem: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const warranty = WarrantySchema.parse(body);

    const message = `
Dear ${warranty.name},

Your ${warranty.brand} ${warranty.model} warranty has been registered at Yonas Mobile.

IMEI: ${warranty.imei}
Warranty Period: ${warranty.warrantyPeriod}
Work Item: ${warranty.workItem}

Thank you for choosing Yonas Mobile.
    `.trim();


        const smsResponse = await sendSms(
    warranty.phone,
    message
    );
   
    const smsLog = await prisma.smsLog.create({
  data: {
    warrantyId: warranty.warrantyId,

    name: warranty.name,
    phone: warranty.phone,

    brand: warranty.brand,
    model: warranty.model,
    imei: warranty.imei,

    warrantyPeriod: warranty.warrantyPeriod,
    workItem: warranty.workItem,

    message,

    status: smsResponse.success
      ? "SENT"
      : "FAILED",

    providerMessageId:
      smsResponse.messageId,

    providerResponse:
      smsResponse.response,
  },
});


    return NextResponse.json(
      {
        success: true,
        message: "Warranty received",
        data: smsLog,
      },
      { status: 201 }
    );

  } catch (error) {
  console.error("Warranty SMS Error:", error);

  return NextResponse.json(
    {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    },
    { status: 500 }
  );
}
}