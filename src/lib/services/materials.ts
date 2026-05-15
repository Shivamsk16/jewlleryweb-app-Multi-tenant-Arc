import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeStock } from "@/lib/business";
import { parsePagination, toPaginatedResult } from "@/lib/pagination";
import { purityToFraction } from "@/lib/utils";

const purchaseSchema = z.object({
  material: z.enum(["GOLD", "SILVER"]),
  purity: z.string(),
  grossWeight: z.number().positive(),
  ratePerGram: z.number().nonnegative(),
  vendorName: z.string().optional().nullable(),
  invoiceNo: z.string().optional().nullable(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function listMaterials(query: Record<string, string | undefined>) {
  const { material, search, from, to } = query;
  const where: Record<string, unknown> = { isDeleted: false };
  if (material && material !== "ALL") where.material = material;
  if (search) {
    where.OR = [
      { vendorName: { contains: search, mode: "insensitive" } },
      { invoiceNo: { contains: search, mode: "insensitive" } },
      { material: { contains: search, mode: "insensitive" } },
      { purity: { contains: search, mode: "insensitive" } },
    ];
  }
  if (from || to) {
    where.purchaseDate = {};
    if (from) (where.purchaseDate as Record<string, Date>).gte = new Date(from);
    if (to) (where.purchaseDate as Record<string, Date>).lte = new Date(to);
  }
  const { page, limit, skip } = parsePagination(query);
  const [data, total] = await Promise.all([
    prisma.rawMaterialPurchase.findMany({
      where,
      orderBy: { purchaseDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.rawMaterialPurchase.count({ where }),
  ]);
  return toPaginatedResult(data, total, page, limit);
}

export async function createMaterial(body: unknown) {
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input", issues: parsed.error.issues } };
  }
  const d = parsed.data;
  const netWeight = +(d.grossWeight * purityToFraction(d.purity)).toFixed(3);
  const totalAmount = +(d.grossWeight * d.ratePerGram).toFixed(2);
  const created = await prisma.rawMaterialPurchase.create({
    data: {
      material: d.material,
      purity: d.purity,
      grossWeight: d.grossWeight,
      netWeight,
      ratePerGram: d.ratePerGram,
      totalAmount,
      vendorName: d.vendorName || null,
      invoiceNo: d.invoiceNo || null,
      purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : new Date(),
      notes: d.notes || null,
    },
  });
  return { status: 201 as const, body: created };
}

export async function updateMaterial(id: string, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (body.material) data.material = body.material;
  if (body.purity) data.purity = body.purity;
  if (body.grossWeight !== undefined) data.grossWeight = body.grossWeight;
  if (body.ratePerGram !== undefined) data.ratePerGram = body.ratePerGram;
  if (body.purchaseDate) data.purchaseDate = new Date(body.purchaseDate as string);
  if (body.vendorName !== undefined) data.vendorName = body.vendorName;
  if (body.invoiceNo !== undefined) data.invoiceNo = body.invoiceNo;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.grossWeight !== undefined && body.purity) {
    data.netWeight = +(
      Number(body.grossWeight) * purityToFraction(body.purity as string)
    ).toFixed(3);
  }
  if (body.grossWeight !== undefined && body.ratePerGram !== undefined) {
    data.totalAmount = +(Number(body.grossWeight) * Number(body.ratePerGram)).toFixed(2);
  }
  const updated = await prisma.rawMaterialPurchase.update({ where: { id }, data });
  return { status: 200 as const, body: updated };
}

export async function softDeleteMaterial(id: string) {
  await prisma.rawMaterialPurchase.update({ where: { id }, data: { isDeleted: true } });
  return { ok: true };
}

export async function stockMaterials() {
  return computeStock();
}
