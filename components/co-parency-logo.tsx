/**
 * Co-Parency Logo Component
 * Professional family-focused branding for legal platform
 * Colors: Teal circle (#4DB6AC), Dark Blue parents (#1E3A5F), Orange child (#E67E22)
 */
"use client";

import { cn } from "@/lib/utils";

interface CoParencyLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textClassName?: string;
}

const sizeMap = {
  sm: { icon: 24, text: "text-sm" },
  md: { icon: 32, text: "text-base" },
  lg: { icon: 40, text: "text-lg" },
  xl: { icon: 56, text: "text-xl" },
};

export function CoParencyLogo({
  className,
  size = "md",
  showText = true,
  textClassName
}: CoParencyLogoProps) {
  const { icon, text } = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CoParencyIcon size={icon} />
      {showText && (
        <span className={cn(
          "font-bold bg-gradient-to-r from-[#1E3A5F] to-[#2C5282] bg-clip-text text-transparent",
          text,
          textClassName
        )}>
          Co-Parency
        </span>
      )}
    </div>
  );
}

interface CoParencyIconProps {
  size?: number;
  className?: string;
}

export function CoParencyIcon({ size = 32, className }: CoParencyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Teal circular border */}
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="#4DB6AC"
        strokeWidth="5"
        fill="white"
      />

      {/* Left parent (dark blue) */}
      <g>
        {/* Head */}
        <circle cx="30" cy="32" r="10" fill="#1E3A5F" />
        {/* Body */}
        <ellipse cx="30" cy="58" rx="12" ry="18" fill="#1E3A5F" />
      </g>

      {/* Right parent (dark blue) */}
      <g>
        {/* Head */}
        <circle cx="70" cy="32" r="10" fill="#1E3A5F" />
        {/* Body */}
        <ellipse cx="70" cy="58" rx="12" ry="18" fill="#1E3A5F" />
      </g>

      {/* Child in center (orange) */}
      <g>
        {/* Head */}
        <circle cx="50" cy="42" r="8" fill="#E67E22" />
        {/* Body */}
        <ellipse cx="50" cy="64" rx="9" ry="14" fill="#E67E22" />
      </g>
    </svg>
  );
}

// Compact version for small spaces (e.g., collapsed sidebar)
export function CoParencyIconCompact({ size = 24, className }: CoParencyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Simplified icon - just the family silhouette with teal accent */}
      <rect x="5" y="5" rx="20" ry="20" width="90" height="90" fill="#4DB6AC" fillOpacity="0.15" />

      {/* Left parent */}
      <circle cx="30" cy="35" r="9" fill="#1E3A5F" />
      <ellipse cx="30" cy="58" rx="10" ry="15" fill="#1E3A5F" />

      {/* Right parent */}
      <circle cx="70" cy="35" r="9" fill="#1E3A5F" />
      <ellipse cx="70" cy="58" rx="10" ry="15" fill="#1E3A5F" />

      {/* Child */}
      <circle cx="50" cy="42" r="7" fill="#E67E22" />
      <ellipse cx="50" cy="62" rx="8" ry="12" fill="#E67E22" />
    </svg>
  );
}

export default CoParencyLogo;
