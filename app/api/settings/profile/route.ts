import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const ProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const { name, email } = ProfileSchema.parse(await req.json());

    // Check email uniqueness if changed
    if (email !== session.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ success: false, message: "Email already in use" }, { status: 400 });
      }
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { name, email },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}
