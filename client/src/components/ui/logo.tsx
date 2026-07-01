import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * MomentumTXT logo mark — a rounded tile with an upward trendline
 * reaching a green data point. Brand blue (#2563eb) + growth green (#34d399).
 */
export function LogoMark({ size = 40, className }: LogoMarkProps) {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="MomentumTXT logo"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${gradId})`} />
      <polyline
        points="11,33 20,25 27,29 37,14"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="37" cy="14" r="4.2" fill="#34d399" />
    </svg>
  );
}

interface LogoProps {
  /** Icon size in px */
  size?: number;
  /** Show the "MomentumTXT" wordmark next to the mark */
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

/**
 * Full MomentumTXT logo: mark + wordmark. The wordmark inherits the current
 * text color, with "TXT" tinted in the brand primary so it reads as both
 * "text message" and a distinct syllable.
 */
export function Logo({
  size = 36,
  showWordmark = true,
  className,
  wordmarkClassName,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className={cn(
            "font-bold tracking-tight text-foreground",
            wordmarkClassName
          )}
        >
          Momentum<span className="text-primary">TXT</span>
        </span>
      )}
    </div>
  );
}

export default Logo;
