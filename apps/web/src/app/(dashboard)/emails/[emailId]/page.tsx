"use client";

import { use } from "react";
import EmailDetails from "../email-details";

export default function EmailDetailPage({
  params,
}: {
  params: Promise<{ emailId: string }>;
}) {
  const { emailId } = use(params);

  return (
    <div className="mt-6">
      <EmailDetails emailId={emailId} />
    </div>
  );
}
