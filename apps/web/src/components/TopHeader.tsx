"use client";

import Link from "next/link";
import { LifeBuoy, Mail } from "lucide-react";
import { SidebarTrigger } from "@usesend/ui/src/sidebar";
import { Button } from "@usesend/ui/src/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@usesend/ui/src/dropdown-menu";
import { useIsMobile } from "@usesend/ui/src/hooks/use-mobile";

const SUPPORT_EMAIL = "a@alisamadii.com";

export function TopHeader() {
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-20 mb-8 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-sidebar-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-sidebar-background/60">
      <div className="flex items-center gap-2">
        {isMobile ? (
          <SidebarTrigger className="h-5 w-5 text-muted-foreground" />
        ) : null}
      </div>

      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <LifeBuoy className="size-4" />
              Need help?
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Get in touch</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`mailto:${SUPPORT_EMAIL}`}>
                <Mail className="size-4" />
                <div className="flex flex-col">
                  <span className="text-sm">Email support</span>
                  <span className="text-xs text-muted-foreground">
                    {SUPPORT_EMAIL}
                  </span>
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
