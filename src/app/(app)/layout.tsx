import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { AuthGuard } from "@/components/auth-guard";
import { ImpersonationBanner } from "@/components/impersonation-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64 flex flex-col min-h-screen">
          <Header />
          <ImpersonationBanner />
          <main className="flex-1 px-4 lg:px-8 py-6 pb-24 lg:pb-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
