import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const createPlanSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  priceMonthly: z.number().nonnegative().default(0),
  priceYearly: z.number().nonnegative().default(0),
  maxUsers: z.number().int().positive().default(5),
  maxVendors: z.number().int().positive().default(10),
  trialDays: z.number().int().nonnegative().default(14),
  features: z.record(z.unknown()),
  isActive: z.boolean().default(true),
});

const updatePlanSchema = z.object({
  displayName: z.string().min(1).optional(),
  priceMonthly: z.number().nonnegative().optional(),
  priceYearly: z.number().nonnegative().optional(),
  maxUsers: z.number().int().positive().optional(),
  maxVendors: z.number().int().positive().optional(),
  features: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function listPlans() {
  const plans = await prisma.plan.findMany({
    orderBy: { priceMonthly: "asc" },
  });
  return { status: 200 as const, body: plans };
}

export async function createPlan(body: unknown) {
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input", issues: parsed.error.issues } };
  }
  const d = parsed.data;

  const existing = await prisma.plan.findUnique({ where: { name: d.name } });
  if (existing) return { status: 409 as const, body: { message: "Plan name already exists" } };

  const created = await prisma.plan.create({
    data: {
      ...d,
      features: d.features as Prisma.InputJsonValue,
    },
  });
  return { status: 201 as const, body: created };
}

export async function updatePlan(id: string, body: unknown) {
  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input", issues: parsed.error.issues } };
  }

  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) return { status: 404 as const, body: { message: "Plan not found" } };

  const updateData: Prisma.PlanUpdateInput = {
    displayName: parsed.data.displayName,
    priceMonthly: parsed.data.priceMonthly,
    priceYearly: parsed.data.priceYearly,
    maxUsers: parsed.data.maxUsers,
    maxVendors: parsed.data.maxVendors,
    isActive: parsed.data.isActive,
  };
  if (parsed.data.features !== undefined) {
    updateData.features = parsed.data.features as Prisma.InputJsonValue;
  }

  const updated = await prisma.plan.update({
    where: { id },
    data: updateData,
  });
  return { status: 200 as const, body: updated };
}

export async function deletePlan(id: string) {
  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) return { status: 404 as const, body: { message: "Plan not found" } };

  const usage = await prisma.tenant.count({
    where: {
      planId: id,
      deletedAt: null,
    },
  });
  if (usage > 0) {
    return {
      status: 409 as const,
      body: { message: "Plan is assigned to active tenants", count: usage },
    };
  }

  await prisma.plan.delete({ where: { id } });
  return { status: 204 as const, body: null };
}

export async function assignPlanToTenant(tenantId: string, planId: string) {
  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);
  if (!tenant) return { status: 404 as const, body: { message: "Tenant not found" } };
  if (!plan) return { status: 404 as const, body: { message: "Plan not found" } };

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planId: plan.id,
      plan: plan.name,
      maxUsers: plan.maxUsers,
      maxVendors: plan.maxVendors,
    },
  });
  return { status: 200 as const, body: updated };
}
