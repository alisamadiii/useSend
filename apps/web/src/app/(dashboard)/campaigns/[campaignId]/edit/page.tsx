"use client";

import { api } from "~/trpc/react";
import { Spinner } from "@usesend/ui/src/spinner";
import { Button } from "@usesend/ui/src/button";
import { Input } from "@usesend/ui/src/input";
import { Editor } from "@usesend/email-editor";
import { use, useMemo, useState } from "react";
import { Campaign } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@usesend/ui/src/select";
import { toast } from "@usesend/ui/src/toaster";
import { useDebouncedCallback } from "use-debounce";
import { ArrowLeft, CodeXml, LayoutTemplate } from "lucide-react";
import { type SlashCommandItem } from "@usesend/email-editor/src/extensions/SlashCommand";
import Link from "next/link";
import ScheduleCampaign from "../../schedule-campaign";
import CampaignStatusBadge from "../../campaign-status-badge";
import { useRouter } from "next/navigation";
import { getCampaignEditorVariables } from "~/lib/constants/campaign";
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

export default function EditCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);

  const {
    data: campaign,
    isLoading,
    error,
  } = api.campaign.getCampaign.useQuery(
    { campaignId },
    {
      enabled: !!campaignId,
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
        <p className="text-red-500">Failed to load campaign</p>
      </div>
    );
  }

  if (!campaign) {
    return <div>Campaign not found</div>;
  }

  return <CampaignEditor campaign={campaign} />;
}

function CampaignEditor({
  campaign,
}: {
  campaign: Campaign & { imageUploadSupported: boolean };
}) {
  const router = useRouter();
  const isApiCampaign = campaign.isApi;
  const contactBooksQuery = api.contacts.getContactBooks.useQuery({});
  const templatesQuery = api.template.getTemplates.useQuery({ page: 1 });
  const utils = api.useUtils();

  const [json, setJson] = useState<Record<string, any> | undefined>(
    campaign.content ? JSON.parse(campaign.content) : undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [from, setFrom] = useState(campaign.from);
  const [contactBookId, setContactBookId] = useState(campaign.contactBookId);
  const [replyTo, setReplyTo] = useState<string | undefined>(
    campaign.replyTo[0],
  );
  const [previewText, setPreviewText] = useState<string | null>(
    campaign.previewText,
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);

  const updateCampaignMutation = api.campaign.updateCampaign.useMutation({
    onSuccess: () => {
      utils.campaign.getCampaign.invalidate();
      setIsSaving(false);
    },
  });
  const getUploadUrl = api.campaign.generateImagePresignedUrl.useMutation();

  function updateEditorContent() {
    if (isApiCampaign) {
      return;
    }
    updateCampaignMutation.mutate({
      campaignId: campaign.id,
      content: JSON.stringify(json),
    });
  }

  const deboucedUpdateCampaign = useDebouncedCallback(
    updateEditorContent,
    1000,
  );

  function handleImportHtml(doc: Record<string, any>, mode: ImportHtmlMode) {
    if (isApiCampaign) {
      return;
    }
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
    updateCampaignMutation.mutate({
      campaignId: campaign.id,
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
      campaignId: campaign.id,
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

  const contactBook = contactBooksQuery.data?.find(
    (book) => book.id === contactBookId,
  );
  const editorVariables = useMemo(
    () => getCampaignEditorVariables(contactBook?.variables),
    [contactBook],
  );
  const variableSuggestionsHelperText = contactBookId
    ? undefined
    : "Select the contact book for related variable";

  const templateSlashCommands = useMemo<SlashCommandItem[]>(
    () =>
      (templatesQuery.data?.templates ?? []).map((t) => ({
        title: t.name,
        description: "Insert template",
        searchTerms: ["template", t.name.toLowerCase()],
        icon: <LayoutTemplate size={18} />,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          utils.template.getTemplate
            .fetch({ templateId: t.id })
            .then((full) => {
              const doc = full?.content ? JSON.parse(full.content) : null;
              if (!doc?.content?.length) {
                toast.error("Template is empty");
                return;
              }
              editor
                .chain()
                .focus()
                .insertContentAt(editor.state.selection.from, doc.content)
                .run();
            })
            .catch(() => toast.error("Failed to load template"));
        },
      })),
    [templatesQuery.data, utils],
  );

  return (
    <EmailEditorShell
      topBarLeft={
        <>
          <Link
            href="/campaigns"
            className="mr-1 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back to campaigns"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/campaigns"
            className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Campaigns
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-[220px] border-0 bg-transparent px-1 text-sm font-medium focus-visible:ring-0 sm:w-[300px]"
            disabled={isApiCampaign}
            readOnly={isApiCampaign}
            onBlur={() => {
              if (isApiCampaign) {
                return;
              }
              if (name === campaign.name || !name) {
                return;
              }
              updateCampaignMutation.mutate(
                {
                  campaignId: campaign.id,
                  name,
                },
                {
                  onError: (e) => {
                    toast.error(`${e.message}. Reverting changes.`);
                    setName(campaign.name);
                  },
                },
              );
            }}
          />
        </>
      }
      topBarCenter={<CampaignStatusBadge status={campaign.status} />}
      topBarRight={
        <>
          {!isApiCampaign ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md border border-border/60"
              onClick={() => setIsImportOpen(true)}
              aria-label="Import HTML"
            >
              <CodeXml className="h-4 w-4" />
            </Button>
          ) : null}
          <EditorSaveStatus isSaving={isSaving} updatedAt={campaign.updatedAt} />
          <ScheduleCampaign
            campaign={campaign}
            onScheduled={() => {
              router.push(`/campaigns/${campaign.id}`);
            }}
          />
        </>
      }
      metaRows={
        <>
          <EditorMetaRow label="From">
            <input
              type="text"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
              }}
              className="py-1 w-full text-sm outline-none bg-transparent"
              placeholder="Friendly name<hello@example.com>"
              onBlur={() => {
                if (isApiCampaign) {
                  return;
                }
                if (from === campaign.from || !from) {
                  return;
                }
                updateCampaignMutation.mutate(
                  {
                    campaignId: campaign.id,
                    from,
                  },
                  {
                    onError: (e) => {
                      toast.error(`${e.message}. Reverting changes.`);
                      setFrom(campaign.from);
                    },
                  },
                );
              }}
              disabled={isApiCampaign}
              readOnly={isApiCampaign}
            />
          </EditorMetaRow>
          <EditorMetaRow label="Reply-To">
            <input
              type="text"
              value={replyTo}
              onChange={(e) => {
                setReplyTo(e.target.value);
              }}
              className="py-1 text-sm block w-full outline-none bg-transparent"
              placeholder="hello@example.com"
              onBlur={() => {
                if (isApiCampaign) {
                  return;
                }
                if (replyTo === campaign.replyTo[0]) {
                  return;
                }
                updateCampaignMutation.mutate(
                  {
                    campaignId: campaign.id,
                    replyTo: replyTo ? [replyTo] : [],
                  },
                  {
                    onError: (e) => {
                      toast.error(`${e.message}. Reverting changes.`);
                      setReplyTo(campaign.replyTo[0]);
                    },
                  },
                );
              }}
              disabled={isApiCampaign}
              readOnly={isApiCampaign}
            />
          </EditorMetaRow>
          <EditorMetaRow label="To">
            {contactBooksQuery.isLoading ? (
              <Spinner className="w-6 h-6" />
            ) : (
              <Select
                value={contactBookId ?? ""}
                disabled={isApiCampaign}
                onValueChange={(val) => {
                  if (isApiCampaign) {
                    return;
                  }
                  // Update the campaign's contactBookId
                  updateCampaignMutation.mutate(
                    {
                      campaignId: campaign.id,
                      contactBookId: val,
                    },
                    {
                      onError: () => {
                        setContactBookId(campaign.contactBookId);
                      },
                    },
                  );
                  setContactBookId(val);
                }}
              >
                <SelectTrigger className="w-[300px]">
                  {contactBook ? contactBook.name : "Select a contact book"}
                </SelectTrigger>
                <SelectContent>
                  {contactBooksQuery.data?.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.name}{" "}
                      <span className="text-xs text-muted-foreground ml-4">
                        {" "}
                        {book._count.contacts} contacts
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </EditorMetaRow>
          <EditorMetaRow label="Subject">
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
              }}
              onBlur={() => {
                if (isApiCampaign) {
                  return;
                }
                if (subject === campaign.subject || !subject) {
                  return;
                }
                updateCampaignMutation.mutate(
                  {
                    campaignId: campaign.id,
                    subject,
                  },
                  {
                    onError: (e) => {
                      toast.error(`${e.message}. Reverting changes.`);
                      setSubject(campaign.subject);
                    },
                  },
                );
              }}
              className="py-1 text-sm block w-full outline-none bg-transparent"
              disabled={isApiCampaign}
              readOnly={isApiCampaign}
            />
          </EditorMetaRow>
          <EditorMetaRow label="Preview">
            <input
              type="text"
              value={previewText ?? undefined}
              onChange={(e) => {
                setPreviewText(e.target.value);
              }}
              onBlur={() => {
                if (isApiCampaign) {
                  return;
                }
                if (previewText === campaign.previewText || !previewText) {
                  return;
                }
                updateCampaignMutation.mutate(
                  {
                    campaignId: campaign.id,
                    previewText,
                  },
                  {
                    onError: (e) => {
                      toast.error(`${e.message}. Reverting changes.`);
                      setPreviewText(campaign.previewText ?? "");
                    },
                  },
                );
              }}
              className="py-1 text-sm block w-full outline-none bg-transparent"
              disabled={isApiCampaign}
              readOnly={isApiCampaign}
            />
          </EditorMetaRow>
        </>
      }
    >
      {isApiCampaign ? (
        <p className="text-sm text-center text-muted-foreground">
          Email created from API. Campaign content can only be updated via API.
        </p>
      ) : (
        <div className="w-full">
          <Editor
            key={`campaign-editor-${contactBookId ?? "none"}-${editorVariables.join(",")}-${contentVersion}-tpl${templatesQuery.data?.templates.length ?? 0}`}
            initialContent={json}
            slashCommands={templateSlashCommands}
            onUpdate={(content) => {
              setJson(content.getJSON());
              setIsSaving(true);
              deboucedUpdateCampaign();
            }}
            variables={editorVariables}
            variableSuggestionsHelperText={variableSuggestionsHelperText}
            uploadImage={
              campaign.imageUploadSupported ? handleFileChange : undefined
            }
          />
        </div>
      )}
      <ImportHtmlDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={handleImportHtml}
      />
    </EmailEditorShell>
  );
}
