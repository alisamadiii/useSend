"use client";

import * as React from "react";
import { Button } from "@usesend/ui/src/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@usesend/ui/src/dropdown-menu";
import { MoreVertical } from "lucide-react";

export function RowActions({
  children,
}: {
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[12rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {children(() => setOpen(false))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RowActionItem({
  icon,
  label,
  onSelect,
  destructive,
  disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={onSelect}
      className={
        destructive
          ? "text-destructive focus:bg-destructive/10 focus:text-destructive"
          : ""
      }
    >
      {icon}
      <span>{label}</span>
    </DropdownMenuItem>
  );
}
