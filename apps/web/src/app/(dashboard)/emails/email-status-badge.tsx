import { EmailStatus } from "@prisma/client";
import { Badge, type BadgeProps } from "@usesend/ui/src/badge";

export const EmailStatusBadge: React.FC<{ status: EmailStatus }> = ({
  status,
}) => {
  let variant: BadgeProps["variant"] = "neutral";
  switch (status) {
    case "DELIVERED":
      variant = "success";
      break;
    case "BOUNCED":
    case "FAILED":
      variant = "error";
      break;
    case "CLICKED":
      variant = "info";
      break;
    case "OPENED":
      variant = "purple";
      break;
    case "COMPLAINED":
    case "DELIVERY_DELAYED":
      variant = "warning";
      break;
  }

  return (
    <Badge variant={variant} className="min-w-[100px] capitalize">
      {status.toLowerCase().split("_").join(" ")}
    </Badge>
  );
};

export const EmailStatusIcon: React.FC<{ status: EmailStatus }> = ({
  status,
}) => {
  let outsideColor = "bg-gray/30"; // Default
  let insideColor = "bg-gray"; // Default

  switch (status) {
    case "DELIVERED":
      outsideColor = "bg-green/30";
      insideColor = "bg-green";
      break;
    case "BOUNCED":
    case "FAILED":
      outsideColor = "bg-red/30";
      insideColor = "bg-red";
      break;
    case "CLICKED":
      outsideColor = "bg-blue/30";
      insideColor = "bg-blue";
      break;
    case "OPENED":
      outsideColor = "bg-purple/30";
      insideColor = "bg-purple";
      break;
    case "DELIVERY_DELAYED":
      outsideColor = "bg-yellow/30";
      insideColor = "bg-yellow";
      break;
    case "COMPLAINED":
      outsideColor = "bg-yellow/30";
      insideColor = "bg-yellow";
      break;
    default:
      // Using the default values defined above
      outsideColor = "bg-gray/30";
      insideColor = "bg-gray";
  }

  return (
    <div
      className={`flex justify-center items-center p-1.5 ${outsideColor} rounded-full`}
    >
      <div className={`h-2 w-2 rounded-full ${insideColor}`}></div>
    </div>
  );
};
