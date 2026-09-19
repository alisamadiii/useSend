"use client";

import { AppSidebar } from "~/components/AppSideBar";
import { SidebarInset, SidebarProvider } from "@usesend/ui/src/sidebar";
import { TopHeader } from "~/components/TopHeader";
import { UpgradeModal } from "~/components/payments/UpgradeModal";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollLeft = 0;
    }

    window.scrollTo({ left: 0 });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [pathname]);

  return (
    <div className="h-full bg-sidebar-background">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-col">
          <TopHeader />
          <main
            ref={mainRef}
            className="h-full flex-1 overflow-y-auto overflow-x-hidden p-4 xl:px-40"
          >
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <UpgradeModal />
    </div>
  );
}
