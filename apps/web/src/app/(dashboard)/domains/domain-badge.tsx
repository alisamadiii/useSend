import { DomainStatus } from "@prisma/client";
import { Badge, type BadgeProps } from "@usesend/ui/src/badge";

export const DomainStatusBadge: React.FC<{ status: DomainStatus }> = ({
  status,
}) => {
  let variant: BadgeProps["variant"] = "neutral";
  switch (status) {
    case DomainStatus.SUCCESS:
      variant = "success";
      break;
    case DomainStatus.FAILED:
      variant = "error";
      break;
    case DomainStatus.TEMPORARY_FAILURE:
    case DomainStatus.PENDING:
      variant = "warning";
      break;
  }

  return (
    <Badge variant={variant} className="min-w-[100px] capitalize">
      {status === "SUCCESS" ? "Verified" : status.toLowerCase()}
    </Badge>
  );
};
