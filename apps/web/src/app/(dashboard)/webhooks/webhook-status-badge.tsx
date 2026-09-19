import { WebhookStatus } from "@prisma/client";
import { Badge, type BadgeProps } from "@usesend/ui/src/badge";

export function WebhookStatusBadge({ status }: { status: WebhookStatus }) {
  let variant: BadgeProps["variant"] = "neutral";
  let label: string = status;

  if (status === WebhookStatus.ACTIVE) {
    variant = "success";
    label = "Active";
  } else if (status === WebhookStatus.PAUSED) {
    variant = "warning";
    label = "Paused";
  } else if (status === WebhookStatus.AUTO_DISABLED) {
    variant = "error";
    label = "Auto disabled";
  }

  return (
    <Badge variant={variant} className="min-w-[110px] capitalize">
      {label}
    </Badge>
  );
}
