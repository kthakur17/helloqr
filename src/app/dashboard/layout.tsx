import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
