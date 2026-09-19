import { CampaignStatus } from "@prisma/client";
import { Badge, type BadgeProps } from "@usesend/ui/src/badge";

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

export default function CampaignStatusBadge({
  status,
}: CampaignStatusBadgeProps) {
  const getVariant = (status: CampaignStatus): BadgeProps["variant"] => {
    switch (status) {
      case CampaignStatus.SENT:
        return "success";
      case CampaignStatus.RUNNING:
        return "info";
      case CampaignStatus.PAUSED:
        return "warning";
      case CampaignStatus.DRAFT:
      case CampaignStatus.SCHEDULED:
      default:
        return "neutral";
    }
  };

  return (
    <Badge variant={getVariant(status)} className="min-w-[100px] capitalize">
      {status.toLowerCase()}
    </Badge>
  );
}
