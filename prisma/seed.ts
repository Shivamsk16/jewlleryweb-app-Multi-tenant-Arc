import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function purityFraction(p: string): number {
  const map: Record<string, number> = {
    "24K": 1,
    "22K": 22 / 24,
    "18K": 18 / 24,
    "14K": 14 / 24,
    "999": 0.999,
    "925": 0.925,
  };
  return map[p] ?? 1;
}

async function main() {
  console.log("Seeding JewelFlow...");

  await prisma.jewelleryReceive.deleteMany();
  await prisma.materialIssue.deleteMany();
  await prisma.rawMaterialPurchase.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.user.deleteMany();

  const adminPwd = await bcrypt.hash("Admin@123", 12);
  const userPwd = await bcrypt.hash("User@123", 12);

  await prisma.user.createMany({
    data: [
      {
        email: "admin@jewelflow.in",
        password: adminPwd,
        name: "Admin",
        role: "ADMIN",
      },
      {
        email: "user@jewelflow.in",
        password: userPwd,
        name: "Staff User",
        role: "USER",
      },
    ],
  });
  console.log("Users created (admin@jewelflow.in / Admin@123, user@jewelflow.in / User@123)");

  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: "Raju Jewellers",
        contact: "Raju Verma",
        phone: "+91 98765 43210",
        address: "Karol Bagh, New Delhi",
        specialty: "Casting",
        isActive: true,
      },
    }),
    prisma.vendor.create({
      data: {
        name: "Sharma & Sons",
        contact: "Anil Sharma",
        phone: "+91 98123 45678",
        address: "Zaveri Bazaar, Mumbai",
        specialty: "Stone Setting",
        isActive: true,
      },
    }),
    prisma.vendor.create({
      data: {
        name: "GoldCraft Works",
        contact: "Suresh Patel",
        phone: "+91 97777 11122",
        address: "C.P. Tank, Mumbai",
        specialty: "Polishing",
        isActive: true,
      },
    }),
    prisma.vendor.create({
      data: {
        name: "Mehta Art Jewellers",
        contact: "Vikram Mehta",
        phone: "+91 99999 88877",
        address: "Johari Bazaar, Jaipur",
        specialty: "Designing",
        isActive: true,
      },
    }),
  ]);
  console.log(`${vendors.length} vendors created`);

  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };

  const purchases = [
    { material: "GOLD", purity: "24K", gross: 100, rate: 5800, vendor: "Bullion House Delhi", inv: "BH-2026-001", days: 60 },
    { material: "GOLD", purity: "22K", gross: 250, rate: 5400, vendor: "Bullion House Delhi", inv: "BH-2026-002", days: 50 },
    { material: "GOLD", purity: "22K", gross: 180, rate: 5450, vendor: "Mumbai Gold Mart", inv: "MGM-2026-031", days: 30 },
    { material: "GOLD", purity: "18K", gross: 120, rate: 4400, vendor: "Mumbai Gold Mart", inv: "MGM-2026-032", days: 18 },
    { material: "SILVER", purity: "925", gross: 500, rate: 72, vendor: "Silver Traders Co.", inv: "STC-2026-099", days: 10 },
    { material: "SILVER", purity: "999", gross: 200, rate: 78, vendor: "Silver Traders Co.", inv: "STC-2026-100", days: 5 },
  ];

  for (const p of purchases) {
    const netWeight = +(p.gross * purityFraction(p.purity)).toFixed(3);
    const totalAmount = +(p.gross * p.rate).toFixed(2);
    await prisma.rawMaterialPurchase.create({
      data: {
        material: p.material,
        purity: p.purity,
        grossWeight: p.gross,
        netWeight,
        ratePerGram: p.rate,
        totalAmount,
        vendorName: p.vendor,
        invoiceNo: p.inv,
        purchaseDate: daysAgo(p.days),
      },
    });
  }
  console.log(`${purchases.length} purchases created`);

  const [raju, sharma, goldcraft, mehta] = vendors;

  const i1 = await prisma.materialIssue.create({
    data: {
      vendorId: raju.id,
      material: "GOLD",
      purity: "22K",
      issuedWeight: 50,
      issueDate: daysAgo(25),
      expectedReturn: daysAgo(10),
      purpose: "Making Order",
      status: "OVERDUE",
      notes: "Bangle set for client A",
    },
  });

  const i2 = await prisma.materialIssue.create({
    data: {
      vendorId: sharma.id,
      material: "GOLD",
      purity: "24K",
      issuedWeight: 30,
      issueDate: daysAgo(13),
      expectedReturn: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d;
      })(),
      purpose: "Making Order",
      status: "PENDING",
      notes: "Necklace centerpiece",
    },
  });

  await prisma.materialIssue.create({
    data: {
      vendorId: goldcraft.id,
      material: "SILVER",
      purity: "925",
      issuedWeight: 100,
      issueDate: daysAgo(5),
      expectedReturn: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d;
      })(),
      purpose: "Making Order",
      status: "PENDING",
      notes: "Silver chains lot of 5",
    },
  });

  const i4 = await prisma.materialIssue.create({
    data: {
      vendorId: mehta.id,
      material: "GOLD",
      purity: "22K",
      issuedWeight: 80,
      issueDate: daysAgo(30),
      expectedReturn: daysAgo(5),
      purpose: "Making Order",
      status: "RETURNED",
      notes: "Wedding set fully fulfilled",
    },
  });

  await prisma.materialIssue.create({
    data: {
      vendorId: sharma.id,
      material: "GOLD",
      purity: "18K",
      issuedWeight: 40,
      issueDate: daysAgo(2),
      expectedReturn: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d;
      })(),
      purpose: "Sample",
      status: "PENDING",
    },
  });

  await prisma.materialIssue.create({
    data: {
      vendorId: raju.id,
      material: "SILVER",
      purity: "925",
      issuedWeight: 60,
      issueDate: daysAgo(8),
      expectedReturn: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        return d;
      })(),
      purpose: "Making Order",
      status: "PENDING",
    },
  });
  console.log("6 material issues created (1 OVERDUE, 1 DUE SOON, 1 RETURNED)");

  await prisma.jewelleryReceive.create({
    data: {
      vendorId: raju.id,
      issueId: i1.id,
      itemName: "Gold Bangle Set",
      grossWeight: 48,
      stoneWeight: 2,
      netWeight: 46,
      wastage: 4,
      wastagePercent: 8.0,
      returnedMaterial: 0,
      qualityRemarks: "Good finish, minor polish needed",
      receiveDate: daysAgo(2),
    },
  });

  await prisma.jewelleryReceive.create({
    data: {
      vendorId: sharma.id,
      issueId: i2.id,
      itemName: "Necklace Centerpiece",
      grossWeight: 29,
      stoneWeight: 0.5,
      netWeight: 28.5,
      wastage: 1.5,
      wastagePercent: 5.0,
      returnedMaterial: 0,
      qualityRemarks: "Excellent craftsmanship",
      receiveDate: daysAgo(1),
    },
  });

  await prisma.jewelleryReceive.create({
    data: {
      vendorId: mehta.id,
      issueId: i4.id,
      itemName: "Wedding Bridal Set",
      grossWeight: 78,
      stoneWeight: 1,
      netWeight: 77,
      wastage: 3,
      wastagePercent: 3.75,
      returnedMaterial: 0,
      qualityRemarks: "Premium quality wedding set",
      receiveDate: daysAgo(6),
    },
  });
  console.log("3 jewellery receives created");

  await prisma.notification.create({
    data: {
      type: "OVERDUE",
      title: "Issue overdue",
      message: `Issue #${i1.id} to Raju Jewellers (50g GOLD 22K) is past expected return by 10 days.`,
      link: `/issues/${i1.id}`,
    },
  });

  console.log("\nSeed complete!");
  console.log("\n--- Login credentials ---");
  console.log("Admin: admin@jewelflow.in / Admin@123");
  console.log("User:  user@jewelflow.in  / User@123\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
