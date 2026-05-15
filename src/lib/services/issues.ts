import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { detectOverdue, getAvailableStock } from "@/lib/business";
import { supabase } from "@/lib/supabase";

const issueSchema = z.object({
  vendorId: z.string().uuid(),
  material: z.enum(["GOLD", "SILVER"]),
  purity: z.string(),
  issuedWeight: z.number().positive(),
  expectedReturn: z.string(),
  purpose: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
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
  fileUrl: z.string().optional().nullable(),
});

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileData: z.string().min(1),
});

export async function listIssues(query: Record<string, string | undefined>) {
  await detectOverdue();
  const { status, vendorId } = query;
  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (vendorId) where.vendorId = vendorId;
  return prisma.materialIssue.findMany({
    where,
    include: { vendor: true, receives: true },
    orderBy: { issueDate: "desc" },
  });
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
      fileUrl: d.fileUrl || null,
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
  const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  if (!allowed.includes(fileType)) {
    return { status: 400 as const, body: { message: "Only PDF, JPG, PNG allowed" } };
  }
  const buffer = Buffer.from(fileData, "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    return { status: 400 as const, body: { message: "File exceeds 5MB limit" } };
  }
  const path = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  if (supabase) {
    const { data, error } = await supabase.storage.from("issues").upload(path, buffer, {
      contentType: fileType,
      upsert: false,
    });
    if (error) return { status: 500 as const, body: { message: error.message } };
    const { data: urlData } = supabase.storage.from("issues").getPublicUrl(data.path);
    return { status: 200 as const, body: { fileUrl: urlData.publicUrl } };
  }
  return { status: 200 as const, body: { fileUrl: `data:${fileType};base64,${fileData}` } };
}

export async function listOverdueIssues() {
  await detectOverdue();
  return prisma.materialIssue.findMany({
    where: { status: "OVERDUE" },
    include: { vendor: true, receives: true },
    orderBy: { expectedReturn: "asc" },
  });
}
