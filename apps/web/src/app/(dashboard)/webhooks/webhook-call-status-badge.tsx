import { WebhookCallStatus } from "@prisma/client";
import { Badge, type BadgeProps } from "@usesend/ui/src/badge";

export function WebhookCallStatusBadge({
  status,
}: {
  status: WebhookCallStatus;
}) {
  let variant: BadgeProps["variant"] = "neutral";
  let label: string = status;

  switch (status) {
    case WebhookCallStatus.DELIVERED:
      variant = "success";
      label = "Delivered";
      break;
    case WebhookCallStatus.FAILED:
      variant = "error";
      label = "Failed";
      break;
    case WebhookCallStatus.PENDING:
      variant = "warning";
      label = "Pending";
      break;
    case WebhookCallStatus.IN_PROGRESS:
      variant = "info";
      label = "In Progress";
      break;
    case WebhookCallStatus.DISCARDED:
      variant = "neutral";
      label = "Discarded";
      break;
  }

  return (
    <Badge variant={variant} className="min-w-[100px] capitalize">
      {label}
    </Badge>
  );
}
