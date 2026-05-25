import { SaSidebar } from "@/components/super-admin/sa-sidebar";
import { SaHeader } from "@/components/super-admin/sa-header";
import { SaAuthGuard } from "@/components/super-admin/sa-auth-guard";
import { getSuperAdminTokenFromCookies } from "@/lib/auth";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const token = await getSuperAdminTokenFromCookies();
  if (!token) {
    return <>{children}</>;
  }

  return (
    <SaAuthGuard>
      <div className="min-h-screen bg-background">
        <SaSidebar />
        <div className="lg:pl-64 flex flex-col min-h-screen">
          <SaHeader />
          <main className="flex-1 px-4 lg:px-8 py-6 pb-20 lg:pb-8">{children}</main>
        </div>
      </div>
    </SaAuthGuard>
  );
}
