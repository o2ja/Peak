import { prisma } from "../db.ts";
import type { Prisma } from "../generated/prisma/client.ts";

export function audit(adminId: string, action: string, entity: string, entityId: string | null, details?: Prisma.InputJsonValue) {
  return prisma.auditLog.create({ data: { adminId, action, entity, entityId, details } });
}
