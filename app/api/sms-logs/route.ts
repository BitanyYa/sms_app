import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.smsLog.findMany({
      orderBy: {
        sentAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });

  } catch (error) {
    console.error("SMS logs error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch SMS logs",
      },
      {
        status: 500,
      }
    );
  }
}
