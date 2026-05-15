import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeVendorBalances } from "@/lib/business";

const vendorSchema = z.object({
  name: z.string().min(1),
  nameHi: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  phone: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || /^[+0-9 ()-]{7,15}$/.test(v), "Phone format invalid"),
  address: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function listVendors() {
  return prisma.vendor.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createVendor(body: unknown) {
  const parsed = vendorSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input", issues: parsed.error.issues } };
  }
  const created = await prisma.vendor.create({ data: parsed.data });
  return { status: 201 as const, body: created };
}

export async function getVendor(id: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      issues: { orderBy: { issueDate: "desc" }, include: { receives: true } },
      receives: { orderBy: { receiveDate: "desc" } },
    },
  });
  if (!vendor) return { status: 404 as const, body: { message: "Not found" } };
  return { status: 200 as const, body: vendor };
}

export async function updateVendor(id: string, body: Record<string, unknown>) {
  const updated = await prisma.vendor.update({ where: { id }, data: body });
  return { status: 200 as const, body: updated };
}

export async function getVendorBalance(id: string) {
  const balances = await computeVendorBalances();
  const found = balances.find((b) => b.vendorId === id);
  if (!found) return { status: 404 as const, body: { message: "Not found" } };
  return { status: 200 as const, body: found };
}

export async function getVendorTransactions(
  id: string,
  query: Record<string, string | undefined>,
) {
  const { from, to } = query;
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) return { status: 404 as const, body: { message: "Not found" } };

  const dateFilter = (date: Date) => {
    if (from && date < new Date(from)) return false;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
    return true;
  };

  const [issues, receives] = await Promise.all([
    prisma.materialIssue.findMany({ where: { vendorId: id }, orderBy: { issueDate: "desc" } }),
    prisma.jewelleryReceive.findMany({
      where: { vendorId: id },
      include: { issue: true },
      orderBy: { receiveDate: "desc" },
    }),
  ]);

  const rows = [
    ...issues
      .filter((i) => dateFilter(new Date(i.issueDate)))
      .map((i) => ({
        id: i.id,
        date: i.issueDate,
        type: "Issue" as const,
        item: i.purpose ?? `${i.material} ${i.purity}`,
        quantity: 1,
        weight: i.issuedWeight,
        amount: null as number | null,
      })),
    ...receives
      .filter((r) => dateFilter(new Date(r.receiveDate)))
      .map((r) => ({
        id: r.id,
        date: r.receiveDate,
        type: "Receive" as const,
        item: r.itemName,
        quantity: 1,
        weight: r.netWeight,
        amount: null as number | null,
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { status: 200 as const, body: rows };
}
