"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@usesend/ui/src/dialog";
import { Button } from "@usesend/ui/src/button";
import { Label } from "@usesend/ui/src/label";
import { Textarea } from "@usesend/ui/src/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@usesend/ui/src/select";
import { toast } from "@usesend/ui/src/toaster";
import { htmlToEditorJson } from "@usesend/email-editor/src/import-html";

export type ImportHtmlMode = "replace" | "append" | "prepend";

export function ImportHtmlDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (doc: Record<string, any>, mode: ImportHtmlMode) => void;
}) {
  const [html, setHtml] = useState("");
  const [mode, setMode] = useState<ImportHtmlMode>("replace");

  function handleImport() {
    if (!html.trim()) {
      return;
    }

    try {
      const doc = htmlToEditorJson(html);
      onImport(doc, mode);
      setHtml("");
      onOpenChange(false);
    } catch {
      toast.error("Could not parse HTML");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import HTML</DialogTitle>
          <DialogDescription>
            Paste your email HTML below. It will be converted into editable
            content.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<html>...</html>"
            rows={12}
            className="font-mono text-xs"
          />
          <div className="flex items-center gap-4">
            <Label className="text-muted-foreground shrink-0">On import</Label>
            <Select
              value={mode}
              onValueChange={(val) => setMode(val as ImportHtmlMode)}
            >
              <SelectTrigger className="w-[260px]">
                {mode === "replace"
                  ? "Replace current content"
                  : mode === "prepend"
                    ? "Add to start"
                    : "Append to end"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replace">Replace current content</SelectItem>
                <SelectItem value="prepend">Add to start</SelectItem>
                <SelectItem value="append">Append to end</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!html.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportHtmlDialog;
