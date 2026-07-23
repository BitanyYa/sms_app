import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@yonasmobile.com";
  const password = await bcrypt.hash("admin123456", 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { password },
    create: {
      name: "Admin",
      email,
      password,
      role: "ADMIN",
    },
  });

  console.log(`✅ Admin user ready: ${admin.email}`);
  console.log(`   Password: admin123456`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
