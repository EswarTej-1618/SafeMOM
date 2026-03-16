import React, { forwardRef } from "react";
import { LucideProps } from "lucide-react";

export const PartnerIcon = forwardRef<SVGSVGElement, LucideProps>(({
  size = 24,
  strokeWidth = 2,
  color = "currentColor",
  className,
  ...props
}, ref) => {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M7 21v-1c0-2.5 1.5-4 3.5-4l1.5 3 1.5-3c2 0 3.5 1.5 3.5 4v1" />
    </svg>
  );
});

PartnerIcon.displayName = "PartnerIcon";

export default PartnerIcon;
