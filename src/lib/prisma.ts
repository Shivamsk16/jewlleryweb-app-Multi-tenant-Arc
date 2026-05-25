import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Always cache singleton (avoids extra clients when .env sets NODE_ENV=production during next dev)
globalForPrisma.prisma = prisma;

// AuditLog is append-only: never call prisma.auditLog.update() or prisma.auditLog.delete().

export default prisma;
