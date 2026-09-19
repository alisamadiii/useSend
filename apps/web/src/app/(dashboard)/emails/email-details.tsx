"use client";

import { UAParser } from "ua-parser-js";
import { api } from "~/trpc/react";
import { EmailStatusBadge, EmailStatusIcon } from "./email-status-badge";
import { formatDate } from "date-fns";
import { motion } from "framer-motion";
import { EmailStatus } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
import {
  SesBounce,
  SesClick,
  SesComplaint,
  SesDeliveryDelay,
  SesOpen,
} from "~/types/aws-types";
import {
  BOUNCE_ERROR_MESSAGES,
  COMPLAINT_ERROR_MESSAGES,
  DELIVERY_DELAY_ERRORS,
} from "@usesend/lib/src/constants/ses-errors";
import { getEmailPreviewSrcDoc } from "~/lib/email-preview";
import CancelEmail from "./cancel-email";
import { useEffect } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@usesend/ui/src/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@usesend/ui/src/tabs";
import { TextWithCopyButton } from "@usesend/ui/src/text-with-copy";
import Spinner from "@usesend/ui/src/spinner";

const MetaField = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <div className="text-sm break-words">{value ?? "--"}</div>
  </div>
);

export default function EmailDetails({ emailId }: { emailId: string }) {
  const emailQuery = api.email.getEmail.useQuery({ id: emailId });
  const data = emailQuery.data;

  if (emailQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" innerSvgClass="stroke-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/emails" className="text-lg">
                    Emails
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-lg" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-lg">{data?.to}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <EmailStatusBadge status={data?.latestStatus ?? "SENT"} />
        </div>
        {data?.latestStatus === "SCHEDULED" && data?.scheduledAt ? (
          <CancelEmail emailId={emailId} />
        ) : null}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetaField label="From" value={data?.from} />
        <MetaField label="Subject" value={data?.subject} />
        <MetaField label="To" value={data?.to} />
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            ID
          </p>
          <TextWithCopyButton
            value={data?.id ?? ""}
            className="w-[200px] overflow-hidden text-sm"
          />
        </div>
        <MetaField
          label="Created"
          value={
            data?.createdAt
              ? formatDate(data.createdAt, "MMM dd, yyyy 'at' hh:mm a")
              : "--"
          }
        />
        {data?.scheduledAt ? (
          <MetaField
            label="Scheduled"
            value={formatDate(data.scheduledAt, "MMM dd, yyyy 'at' hh:mm a")}
          />
        ) : null}
      </div>

      {/* Email events */}
      {data?.latestStatus !== "SCHEDULED" && data?.emailEvents?.length ? (
        <div className="flex flex-col gap-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Email events
          </p>
          <div className="flex items-stretch">
            <div className="border-r border-border border-dashed" />
            <div className="flex w-full flex-col gap-10">
              {data.emailEvents.map((evt) => (
                <div key={evt.status} className="flex w-full items-start gap-5">
                  <div className="-ml-2.5">
                    <EmailStatusIcon status={evt.status} />
                  </div>
                  <div className="-mt-[0.125rem] w-full">
                    <EmailStatusBadge status={evt.status} />
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatDate(evt.createdAt, "MMM dd, hh:mm a")}
                    </div>
                    <div className="mt-1 text-foreground/80">
                      <EmailStatusText status={evt.status} data={evt.data} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.2 }}
        className="bg-card shadow-card rounded-xl p-4"
      >
        <Tabs defaultValue="preview" className="w-full">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="text">Plain Text</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="mt-4">
            <EmailPreview html={data?.html} text={data?.text} />
          </TabsContent>
          <TabsContent value="html" className="mt-4">
            <pre className="max-h-[500px] overflow-auto rounded-lg bg-muted/40 p-4 text-xs whitespace-pre-wrap">
              {data?.html || "No HTML content"}
            </pre>
          </TabsContent>
          <TabsContent value="text" className="mt-4">
            <pre className="max-h-[500px] overflow-auto rounded-lg bg-muted/40 p-4 text-xs whitespace-pre-wrap">
              {data?.text || "No plain text content"}
            </pre>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

const EmailPreview = ({
  html,
  text,
}: {
  html: string | null | undefined;
  text: string | null | undefined;
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const srcDoc = getEmailPreviewSrcDoc(html, text);

  if (!show) {
    return (
      <div className="dark:bg-slate-200 h-[350px] overflow-visible rounded border-t"></div>
    );
  }

  if (!srcDoc) {
    return (
      <div className="dark:bg-slate-200 h-[350px] overflow-visible rounded border-t flex items-center justify-center">
        <span className="text-sm text-muted-foreground dark:text-slate-500">
          No content to preview
        </span>
      </div>
    );
  }

  return (
    <div className="dark:bg-slate-200 h-[350px] overflow-visible rounded border-t">
      <iframe
        className="w-full h-full"
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
      />
    </div>
  );
};

const EmailStatusText = ({
  status,
  data,
}: {
  status: EmailStatus;
  data: JsonValue;
}) => {
  if (status === "SENT") {
    return (
      <div>
        We received your request and sent the email to recipient's server.
      </div>
    );
  } else if (status === "DELIVERED") {
    return <div>Mail is successfully delivered to the recipient.</div>;
  } else if (status === "DELIVERY_DELAYED") {
    const _errorData = data as unknown as SesDeliveryDelay;
    const errorMessage = DELIVERY_DELAY_ERRORS[_errorData.delayType];

    return <div>{errorMessage}</div>;
  } else if (status === "BOUNCED") {
    const _errorData = data as unknown as SesBounce;
    _errorData.bounceType;

    return (
      <div className="flex flex-col gap-4 w-full">
        <p>{getErrorMessage(_errorData)}</p>
        <div className="rounded-xl p-4 bg-muted/30 flex flex-col gap-4">
          <div className="flex gap-2 w-full">
            <div className="w-1/2">
              <p className="text-sm text-muted-foreground">Type</p>
              <p>{_errorData.bounceType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sub Type</p>
              <p>{_errorData.bounceSubType}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">SMTP response</p>
            <p>{_errorData.bouncedRecipients?.[0]?.diagnosticCode}</p>
          </div>
        </div>
      </div>
    );
  } else if (status === "FAILED") {
    const _errorData = data as unknown as { error: string };
    return <div>{_errorData.error}</div>;
  } else if (status === "OPENED") {
    const _data = data as unknown as SesOpen;
    const userAgent = getUserAgent(_data.userAgent);

    return (
      <div className="w-full rounded-xl p-4 bg-muted/30 mt-4">
        <div className="flex  w-full ">
          {userAgent.os.name ? (
            <div className="w-1/2">
              <p className="text-sm text-muted-foreground">OS</p>
              <p>{userAgent.os.name}</p>
            </div>
          ) : null}
          {userAgent.browser.name ? (
            <div>
              <p className="text-sm text-muted-foreground">Browser</p>
              <p>{userAgent.browser.name}</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  } else if (status === "CLICKED") {
    const _data = data as unknown as SesClick;
    const userAgent = getUserAgent(_data.userAgent);

    return (
      <div className="w-full mt-4 flex flex-col gap-4  rounded-xl p-4 bg-muted/30">
        <div className="flex  w-full ">
          {userAgent.os.name ? (
            <div className="w-1/2">
              <p className="text-sm text-muted-foreground">OS </p>
              <p>{userAgent.os.name}</p>
            </div>
          ) : null}
          {userAgent.browser.name ? (
            <div>
              <p className="text-sm text-muted-foreground">Browser </p>
              <p>{userAgent.browser.name}</p>
            </div>
          ) : null}
        </div>
        <div className="w-full">
          <p className="text-sm text-muted-foreground">URL</p>
          <p>{_data.link}</p>
        </div>
      </div>
    );
  } else if (status === "COMPLAINED") {
    const _errorData = data as unknown as SesComplaint;

    return (
      <div className="flex flex-col gap-4 w-full">
        <p>{getComplaintMessage(_errorData.complaintFeedbackType)}</p>
      </div>
    );
  } else if (status === "CANCELLED") {
    return <div>This scheduled email was cancelled</div>;
  } else if (status === "SUPPRESSED") {
    return (
      <div>
        This email was suppressed because this email is previously either
        bounced or the recipient complained.
      </div>
    );
  }

  return <div className="w-full">{status}</div>;
};

const getErrorMessage = (data: SesBounce) => {
  if (data.bounceType === "Permanent") {
    return BOUNCE_ERROR_MESSAGES[data.bounceType][
      data.bounceSubType as
        | "General"
        | "NoEmail"
        | "Suppressed"
        | "OnAccountSuppressionList"
    ];
  } else if (data.bounceType === "Transient") {
    return BOUNCE_ERROR_MESSAGES[data.bounceType][
      data.bounceSubType as
        | "General"
        | "MailboxFull"
        | "MessageTooLarge"
        | "ContentRejected"
        | "AttachmentRejected"
    ];
  } else if (data.bounceType === "Undetermined") {
    return BOUNCE_ERROR_MESSAGES.Undetermined;
  }
};

const getComplaintMessage = (errorType: string) => {
  return COMPLAINT_ERROR_MESSAGES[
    errorType as keyof typeof COMPLAINT_ERROR_MESSAGES
  ];
};

const getUserAgent = (userAgent: string) => {
  const parser = new UAParser(userAgent);
  return {
    browser: parser.getBrowser(),
    os: parser.getOS(),
    device: parser.getDevice(),
  };
};
