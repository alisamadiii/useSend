"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";

export function EmailEditorShell({
  topBarLeft,
  topBarCenter,
  topBarRight,
  metaRows,
  children,
}: {
  topBarLeft: React.ReactNode;
  topBarCenter?: React.ReactNode;
  topBarRight: React.ReactNode;
  metaRows?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-background overflow-y-auto">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-2">{topBarLeft}</div>
        {topBarCenter ? (
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
            {topBarCenter}
          </div>
        ) : null}
        <div className="flex items-center gap-4">{topBarRight}</div>
      </div>

      <div className="mx-auto w-full max-w-[700px] px-4 pt-10 pb-24">
        {metaRows ? (
          <div className="mb-10 flex flex-col divide-y divide-border/60 border-b border-border/60 pb-2">
            {metaRows}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function EditorMetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-2.5">
      <label className="w-24 shrink-0 text-sm text-muted-foreground">
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function EditorSaveStatus({
  isSaving,
  updatedAt,
}: {
  isSaving: boolean;
  updatedAt: Date;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
      {isSaving ? (
        <div className="h-2 w-2 rounded-full bg-yellow-500" />
      ) : (
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
      )}
      {formatDistanceToNow(updatedAt) === "less than a minute"
        ? "just now"
        : `${formatDistanceToNow(updatedAt)} ago`}
    </div>
  );
}

