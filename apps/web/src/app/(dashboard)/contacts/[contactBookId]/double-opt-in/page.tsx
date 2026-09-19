"use client";

import { Editor } from "@usesend/email-editor";
import { Spinner } from "@usesend/ui/src/spinner";
import { Input } from "@usesend/ui/src/input";
import { toast } from "@usesend/ui/src/toaster";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import {
  EmailEditorShell,
  EditorMetaRow,
  EditorSaveStatus,
} from "~/components/email-editor-shell";
import {
  DEFAULT_DOUBLE_OPT_IN_SUBJECT,
  DOUBLE_OPT_IN_EDITOR_VARIABLES,
  getDefaultDoubleOptInContent,
  hasDoubleOptInUrlPlaceholder,
} from "~/lib/constants/double-opt-in";
import { api } from "~/trpc/react";

const DOUBLE_OPT_IN_URL_REQUIRED_MESSAGE =
  "Double opt-in email content must include {{doubleOptInUrl}}.";

function parseEditorContent(content: string | null | undefined) {
  if (!content) {
    return getDefaultDoubleOptInContent();
  }

  try {
    return JSON.parse(content) as Record<string, any>;
  } catch {
    return getDefaultDoubleOptInContent();
  }
}

export default function DoubleOptInEditorPage({
  params,
}: {
  params: Promise<{ contactBookId: string }>;
}) {
  const { contactBookId } = use(params);

  const {
    data: contactBook,
    isLoading,
    error,
  } = api.contacts.getContactBookDetails.useQuery({
    contactBookId,
  });

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
        <p className="text-red">Failed to load double opt-in settings</p>
      </div>
    );
  }

  if (!contactBook) {
    return <div>Contact book not found</div>;
  }

  return <DoubleOptInEditor contactBook={contactBook} />;
}

function DoubleOptInEditor({
  contactBook,
}: {
  contactBook: {
    id: string;
    name: string;
    updatedAt: Date;
    doubleOptInFrom: string | null;
    doubleOptInSubject: string | null;
    doubleOptInContent: string | null;
  };
}) {
  const utils = api.useUtils();

  const [json, setJson] = useState<Record<string, any>>(
    parseEditorContent(contactBook.doubleOptInContent),
  );
  const [subject, setSubject] = useState(
    contactBook.doubleOptInSubject ?? DEFAULT_DOUBLE_OPT_IN_SUBJECT,
  );
  const [from, setFrom] = useState(contactBook.doubleOptInFrom ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const hasShownMissingPlaceholderToast = useRef(false);

  const updateContactBook = api.contacts.updateContactBook.useMutation({
    onSuccess: async () => {
      await utils.contacts.getContactBookDetails.invalidate({
        contactBookId: contactBook.id,
      });
      setIsSaving(false);
    },
  });

  function updateContent(contentValue: string) {
    updateContactBook.mutate(
      {
        contactBookId: contactBook.id,
        doubleOptInContent: contentValue,
      },
      {
        onError: (error) => {
          toast.error(error.message);
          setIsSaving(false);
        },
      },
    );
  }

  const debouncedUpdateContent = useDebouncedCallback(updateContent, 1000);

  return (
    <EmailEditorShell
      topBarLeft={
        <>
          <Link
            href={`/contacts/${contactBook.id}`}
            className="mr-1 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back to contact book"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            href={`/contacts/${contactBook.id}`}
            className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            {contactBook.name}
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-sm font-medium whitespace-nowrap">
            Double opt-in email
          </span>
        </>
      }
      topBarRight={
        <EditorSaveStatus
          isSaving={isSaving}
          updatedAt={contactBook.updatedAt}
        />
      }
      metaRows={
        <>
          <EditorMetaRow label="Subject">
            <Input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
              }}
              onBlur={() => {
                const normalizedSubject =
                  subject.trim() || DEFAULT_DOUBLE_OPT_IN_SUBJECT;
                const currentSubject =
                  contactBook.doubleOptInSubject ??
                  DEFAULT_DOUBLE_OPT_IN_SUBJECT;

                if (normalizedSubject === currentSubject) {
                  return;
                }

                setIsSaving(true);
                updateContactBook.mutate(
                  {
                    contactBookId: contactBook.id,
                    doubleOptInSubject: normalizedSubject,
                  },
                  {
                    onError: (error) => {
                      toast.error(error.message);
                      setIsSaving(false);
                      setSubject(
                        contactBook.doubleOptInSubject ??
                          DEFAULT_DOUBLE_OPT_IN_SUBJECT,
                      );
                    },
                  },
                );
              }}
              className="py-1 text-sm block w-full outline-none border-0 bg-transparent px-0 focus-visible:ring-0"
            />
          </EditorMetaRow>
          <EditorMetaRow label="From">
            <div className="flex flex-col gap-1">
              <Input
                type="text"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                }}
                onBlur={() => {
                  const normalizedFrom = from.trim();
                  const currentFrom = contactBook.doubleOptInFrom ?? "";

                  if (normalizedFrom === currentFrom) {
                    return;
                  }

                  setIsSaving(true);
                  updateContactBook.mutate(
                    {
                      contactBookId: contactBook.id,
                      doubleOptInFrom: normalizedFrom || null,
                    },
                    {
                      onError: (error) => {
                        toast.error(error.message);
                        setIsSaving(false);
                        setFrom(contactBook.doubleOptInFrom ?? "");
                      },
                    },
                  );
                }}
                placeholder="Friendly name<hello@example.com>"
                className="py-1 text-sm block w-full outline-none border-0 bg-transparent px-0 focus-visible:ring-0"
              />
              <p className="text-xs text-muted-foreground">
                Use the variable <code>{"{{doubleOptInUrl}}"}</code> for the
                confirmation link.
              </p>
            </div>
          </EditorMetaRow>
        </>
      }
    >
      <div className="w-full">
        <Editor
          initialContent={json}
          onUpdate={(content) => {
            const nextContent = content.getJSON();
            const serializedContent = JSON.stringify(nextContent);

            setJson(nextContent);

            if (!hasDoubleOptInUrlPlaceholder(serializedContent)) {
              debouncedUpdateContent.cancel();
              setIsSaving(false);

              if (!hasShownMissingPlaceholderToast.current) {
                toast.error(DOUBLE_OPT_IN_URL_REQUIRED_MESSAGE);
                hasShownMissingPlaceholderToast.current = true;
              }

              return;
            }

            hasShownMissingPlaceholderToast.current = false;
            setIsSaving(true);
            debouncedUpdateContent(serializedContent);
          }}
          variables={DOUBLE_OPT_IN_EDITOR_VARIABLES}
        />
      </div>
    </EmailEditorShell>
  );
}
