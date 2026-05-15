import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { detectOverdue, getAvailableStock } from "@/lib/business";
import { parsePagination, toPaginatedResult } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";

function issueDateRangeFromSearch(search: string): { gte: Date; lte: Date } | null {
  const parsed = new Date(search);
  if (Number.isNaN(parsed.getTime())) return null;
  const gte = new Date(parsed);
  gte.setHours(0, 0, 0, 0);
  const lte = new Date(parsed);
  lte.setHours(23, 59, 59, 999);
  return { gte, lte };
}

const issueSchema = z.object({
  vendorId: z.string().uuid(),
  material: z.enum(["GOLD", "SILVER"]),
  purity: z.string(),
  issuedWeight: z.number().positive(),
  expectedReturn: z.string(),
  purpose: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  fileUrl: z
    .union([z.string().min(1), z.null(), z.undefined()])
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null)),
});

const updateSchema = z.object({
  vendorId: z.string().uuid().optional(),
  material: z.enum(["GOLD", "SILVER"]).optional(),
  purity: z.string().optional(),
  issuedWeight: z.number().positive().optional(),
  expectedReturn: z.string().optional(),
  purpose: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
  fileUrl: z
    .union([z.string().min(1), z.null(), z.undefined()])
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null)),
});

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileData: z.string().min(1),
});

export async function listIssues(query: Record<string, string | undefined>) {
  await detectOverdue();
  const { status, vendorId, search } = query;
  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (vendorId) where.vendorId = vendorId;
  if (search?.trim()) {
    const s = search.trim();
    const or: Record<string, unknown>[] = [
      { material: { contains: s, mode: "insensitive" } },
      { purity: { contains: s, mode: "insensitive" } },
      { purpose: { contains: s, mode: "insensitive" } },
      { status: { contains: s, mode: "insensitive" } },
      { vendor: { name: { contains: s, mode: "insensitive" } } },
    ];
    const dateRange = issueDateRangeFromSearch(s);
    if (dateRange) or.push({ issueDate: dateRange });
    where.OR = or;
  }
  const { page, limit, skip } = parsePagination(query);
  const [data, total] = await Promise.all([
    prisma.materialIssue.findMany({
      where,
      include: { vendor: true, receives: true },
      orderBy: { issueDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.materialIssue.count({ where }),
  ]);
  return toPaginatedResult(data, total, page, limit);
}

export async function createIssue(body: unknown) {
  const parsed = issueSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input", issues: parsed.error.issues } };
  }
  const d = parsed.data;
  const available = await getAvailableStock(d.material, d.purity);
  if (d.issuedWeight > available) {
    return {
      status: 400 as const,
      body: { message: `Insufficient stock. Available: ${available.toFixed(3)}g` },
    };
  }
  const created = await prisma.materialIssue.create({
    data: {
      vendorId: d.vendorId,
      material: d.material,
      purity: d.purity,
      issuedWeight: d.issuedWeight,
      expectedReturn: new Date(d.expectedReturn),
      purpose: d.purpose || null,
      notes: d.notes || null,
      fileUrl:
        typeof d.fileUrl === "string" && d.fileUrl.trim().length > 0 ? d.fileUrl.trim() : null,
    },
    include: { vendor: true, receives: true },
  });
  return { status: 201 as const, body: created };
}

export async function getIssue(id: string) {
  const issue = await prisma.materialIssue.findUnique({
    where: { id },
    include: { vendor: true, receives: true },
  });
  if (!issue) return { status: 404 as const, body: { message: "Not found" } };
  return { status: 200 as const, body: issue };
}

export async function updateIssue(id: string, body: unknown) {
  const parsed = updateSchema.safeParse(body ?? {});
  if (!parsed.success) return { status: 400 as const, body: { message: "Invalid input" } };
  const b = parsed.data;
  const data: Record<string, unknown> = {};
  if (b.vendorId) data.vendorId = b.vendorId;
  if (b.material) data.material = b.material;
  if (b.purity) data.purity = b.purity;
  if (b.issuedWeight !== undefined) data.issuedWeight = b.issuedWeight;
  if (b.expectedReturn) data.expectedReturn = new Date(b.expectedReturn);
  if (b.status) data.status = b.status;
  if (b.purpose !== undefined) data.purpose = b.purpose;
  if (b.notes !== undefined) data.notes = b.notes;
  if (b.fileUrl !== undefined) data.fileUrl = b.fileUrl;
  const updated = await prisma.materialIssue.update({
    where: { id },
    data,
    include: { vendor: true, receives: true },
  });
  return { status: 200 as const, body: updated };
}

export async function deleteIssue(id: string) {
  const issue = await prisma.materialIssue.findUnique({
    where: { id },
    include: { receives: true },
  });
  if (!issue) return { status: 404 as const, body: { message: "Not found" } };
  if (issue.receives.length > 0) {
    return { status: 400 as const, body: { message: "Cannot delete issue with linked receives" } };
  }
  await prisma.materialIssue.delete({ where: { id } });
  return { status: 200 as const, body: { ok: true } };
}

export async function uploadIssueFile(body: unknown) {
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return { status: 400 as const, body: { message: "Invalid file data" } };
  const { fileName, fileType, fileData } = parsed.data;
  const normalizedType = fileType === "image/jpg" ? "image/jpeg" : fileType;
  const allowed = ["image/jpeg", "image/png"];
  const extOk = /\.(jpe?g|png)$/i.test(fileName);
  if (!allowed.includes(normalizedType) && !extOk) {
    return {
      status: 400 as const,
      body: { message: "Only JPG and PNG image formats are accepted" },
    };
  }
  const buffer = Buffer.from(fileData, "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    return { status: 400 as const, body: { message: "File exceeds 5MB limit" } };
  }
  const path = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const contentType = allowed.includes(normalizedType) ? normalizedType : "image/jpeg";
  const dataUrl = `data:${contentType};base64,${fileData}`;

  if (supabase) {
    const bucket =
      process.env.SUPABASE_STORAGE_ISSUES_BUCKET?.trim() || "issues";
    const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: false,
    });
    if (error) {
      const msg = error.message ?? "";
      const bucketMissing =
        /bucket not found/i.test(msg) ||
        (/not found/i.test(msg) && /bucket|storage/i.test(msg));
      if (bucketMissing) {
        return { status: 200 as const, body: { fileUrl: dataUrl } };
      }
      return { status: 500 as const, body: { message: error.message } };
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { status: 200 as const, body: { fileUrl: urlData.publicUrl } };
  }
  return { status: 200 as const, body: { fileUrl: dataUrl } };
}

export async function listOverdueIssues() {
  await detectOverdue();
  return prisma.materialIssue.findMany({
    where: { status: "OVERDUE" },
    include: { vendor: true, receives: true },
    orderBy: { expectedReturn: "asc" },
  });
}
