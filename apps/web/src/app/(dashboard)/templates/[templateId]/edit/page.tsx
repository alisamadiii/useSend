"use client";

import { api } from "~/trpc/react";
import { Spinner } from "@usesend/ui/src/spinner";
import { Input } from "@usesend/ui/src/input";
import { Button } from "@usesend/ui/src/button";
import { Editor } from "@usesend/email-editor";
import { useState } from "react";
import { Template } from "@prisma/client";
import { toast } from "@usesend/ui/src/toaster";
import { useDebouncedCallback } from "use-debounce";
import { ArrowLeft, CodeXml } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import {
  EmailEditorShell,
  EditorMetaRow,
  EditorSaveStatus,
} from "~/components/email-editor-shell";
import {
  ImportHtmlDialog,
  type ImportHtmlMode,
} from "~/components/ImportHtmlDialog";

const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024;

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);

  const {
    data: template,
    isLoading,
    error,
  } = api.template.getTemplate.useQuery(
    { templateId: templateId },
    {
      enabled: !!templateId,
    },
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-background">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-background">
        <p className="text-red-500">Failed to load template</p>
      </div>
    );
  }

  if (!template) {
    return <div>Template not found</div>;
  }

  return <TemplateEditor template={template} />;
}

function TemplateEditor({
  template,
}: {
  template: Template & { imageUploadSupported: boolean };
}) {
  const utils = api.useUtils();

  const [json, setJson] = useState<Record<string, any> | undefined>(
    template.content ? JSON.parse(template.content) : undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);

  const updateTemplateMutation = api.template.updateTemplate.useMutation({
    onSuccess: () => {
      utils.template.getTemplate.invalidate();
      setIsSaving(false);
    },
  });
  const getUploadUrl = api.template.generateImagePresignedUrl.useMutation();

  function updateEditorContent() {
    updateTemplateMutation.mutate({
      templateId: template.id,
      content: JSON.stringify(json),
    });
  }

  const deboucedUpdateTemplate = useDebouncedCallback(
    updateEditorContent,
    1000,
  );

  function handleImportHtml(doc: Record<string, any>, mode: ImportHtmlMode) {
    const next =
      mode === "replace"
        ? doc
        : mode === "prepend"
          ? {
              type: "doc",
              content: [...(doc.content ?? []), ...(json?.content ?? [])],
            }
          : {
              type: "doc",
              content: [...(json?.content ?? []), ...(doc.content ?? [])],
            };
    setJson(next);
    setContentVersion((v) => v + 1);
    setIsSaving(true);
    updateTemplateMutation.mutate({
      templateId: template.id,
      content: JSON.stringify(next),
    });
  }

  const handleFileChange = async (file: File) => {
    if (file.size > IMAGE_SIZE_LIMIT) {
      throw new Error(
        `File should be less than ${IMAGE_SIZE_LIMIT / 1024 / 1024}MB`,
      );
    }

    const { uploadUrl, imageUrl } = await getUploadUrl.mutateAsync({
      name: file.name,
      type: file.type,
      templateId: template.id,
    });

    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
    });

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    return imageUrl;
  };

  return (
    <EmailEditorShell
      topBarLeft={
        <>
          <Link
            href="/templates"
            className="mr-1 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back to templates"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/templates"
            className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Templates
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-[220px] border-0 bg-transparent px-1 text-sm font-medium focus-visible:ring-0 sm:w-[300px]"
            onBlur={() => {
              if (name === template.name || !name) {
                return;
              }
              updateTemplateMutation.mutate(
                {
                  templateId: template.id,
                  name,
                },
                {
                  onError: (e) => {
                    toast.error(`${e.message}. Reverting changes.`);
                    setName(template.name);
                  },
                },
              );
            }}
          />
        </>
      }
      topBarRight={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md border border-border/60"
            onClick={() => setIsImportOpen(true)}
            aria-label="Import HTML"
          >
            <CodeXml className="h-4 w-4" />
          </Button>
          <EditorSaveStatus isSaving={isSaving} updatedAt={template.updatedAt} />
        </>
      }
      metaRows={
        <EditorMetaRow label="Subject">
          <input
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
            }}
            onBlur={() => {
              if (subject === template.subject || !subject) {
                return;
              }
              updateTemplateMutation.mutate(
                {
                  templateId: template.id,
                  subject,
                },
                {
                  onError: (e) => {
                    toast.error(`${e.message}. Reverting changes.`);
                    setSubject(template.subject);
                  },
                },
              );
            }}
            className="py-1 text-sm block w-full outline-none bg-transparent"
          />
        </EditorMetaRow>
      }
    >
      <div className="w-full">
        <Editor
          key={`template-editor-${contentVersion}`}
          initialContent={json}
          onUpdate={(content) => {
            setJson(content.getJSON());
            setIsSaving(true);
            deboucedUpdateTemplate();
          }}
          variables={["email", "firstName", "lastName"]}
          uploadImage={
            template.imageUploadSupported ? handleFileChange : undefined
          }
        />
      </div>
      <ImportHtmlDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={handleImportHtml}
      />
    </EmailEditorShell>
  );
}
