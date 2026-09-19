import React from "react";
import { Loader2Icon } from "lucide-react";
import { cn } from "..";

export const Spinner: React.FC<
  React.SVGProps<SVGSVGElement> & { innerSvgClass?: string }
> = ({ className, innerSvgClass, ...props }) => {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className, innerSvgClass)}
      {...props}
    />
  );
};

export default Spinner;
