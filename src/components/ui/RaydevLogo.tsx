import { type SVGProps } from "react";
import { cn } from "@/lib/cn";

export interface RaydevIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  animated?: boolean;
}

/**
 * High-fidelity vector SVG of the official RAYDEV emblem:
 * - 3D isometric green angled A-chevron
 * - Dark forest dimensional depth extrusion
 * - Concentric green bullseye / target
 */
export function RaydevIcon({ size = 32, animated = false, className, ...props }: RaydevIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
      aria-label="RAYDEV logo"
      {...props}
    >
      <defs>
        {/* Front face primary green gradient */}
        <linearGradient id="raydev-green-grad" x1="45" y1="35" x2="160" y2="165" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="45%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>

        {/* 3D depth extrusion gradient (dark forest shadow) */}
        <linearGradient id="raydev-depth-grad" x1="40" y1="40" x2="150" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14532D" />
          <stop offset="60%" stopColor="#0B3D1E" />
          <stop offset="100%" stopColor="#083014" />
        </linearGradient>

        {/* Top gloss highlight */}
        <linearGradient id="raydev-gloss-grad" x1="50" y1="30" x2="150" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Subtle ambient green glow filter */}
        <filter id="raydev-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#22C55E" floodOpacity="0.38" />
        </filter>
      </defs>

      <g filter="url(#raydev-glow)">
        {/* â”€â”€ 3D DEPTH / EXTRUSION LAYER (UNDERNEATH) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* Left leg shadow extrusion */}
        <g transform="translate(-7, 9)">
          <rect
            x="48"
            y="42"
            width="28"
            height="116"
            rx="14"
            fill="url(#raydev-depth-grad)"
            transform="rotate(-26 48 42)"
          />
        </g>
        {/* Right leg shadow extrusion */}
        <g transform="translate(-6, 9)">
          <rect
            x="96"
            y="44"
            width="28"
            height="124"
            rx="14"
            fill="url(#raydev-depth-grad)"
            transform="rotate(27 96 44)"
          />
        </g>

        {/* Seamless fill polygon between feet and shadow */}
        <polygon
          points="46,144 39,153 64,153 71,144"
          fill="#0B3D1E"
        />
        <polygon
          points="136,152 130,161 155,161 161,152"
          fill="#0A3418"
        />

        {/* â”€â”€ FRONT FACE LAYER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* Left Leg: Pill angled upwards to the apex */}
        <rect
          x="48"
          y="42"
          width="28"
          height="116"
          rx="14"
          fill="url(#raydev-green-grad)"
          transform="rotate(-26 48 42)"
        />

        {/* Right Leg: Overlapping pill angled downwards from the apex */}
        <rect
          x="96"
          y="44"
          width="28"
          height="124"
          rx="14"
          fill="url(#raydev-green-grad)"
          transform="rotate(27 96 44)"
        />

        {/* Highlight sheen across the top face */}
        <path
          d="M 98 44 L 148 142"
          stroke="url(#raydev-gloss-grad)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M 92 48 L 54 130"
          stroke="url(#raydev-gloss-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* â”€â”€ CENTER TARGET / BULLSEYE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <g className={animated ? "animate-pulse" : undefined}>
          {/* Outer circle ring */}
          <circle
            cx="98"
            cy="137"
            r="16"
            stroke="#22C55E"
            strokeWidth="5.5"
            fill="none"
          />
          {/* Inner solid dot */}
          <circle
            cx="98"
            cy="137"
            r="6"
            fill="#22C55E"
          />
        </g>
      </g>
    </svg>
  );
}

export interface RaydevLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  layout?: "horizontal" | "vertical" | "icon";
  withTagline?: boolean;
  animated?: boolean;
  className?: string;
}

const ICON_SIZES = {
  sm: 22,
  md: 32,
  lg: 48,
  xl: 72,
} as const;

export function RaydevLogo({
  size = "md",
  layout = "horizontal",
  withTagline = true,
  animated = false,
  className,
}: RaydevLogoProps) {
  const iconSize = ICON_SIZES[size];

  if (layout === "icon") {
    return <RaydevIcon size={iconSize} animated={animated} className={className} />;
  }

  if (layout === "vertical") {
    return (
      <div className={cn("flex flex-col items-center text-center select-none", className)}>
        <RaydevIcon size={iconSize} animated={animated} className="mb-3" />
        <div className="flex items-baseline font-sans leading-none tracking-tight">
          <span className="text-white font-medium text-xl md:text-2xl">RAY</span>
          <span className="text-[#22C55E] font-extrabold text-xl md:text-2xl">DEV</span>
        </div>
        {withTagline && (
          <p className="mt-2 text-[9px] md:text-[10px] uppercase font-semibold tracking-[0.24em] text-[#D6E7F3]/80">
            Native WSL 2 Dev Environment
          </p>
        )}
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <RaydevIcon size={iconSize} animated={animated} />
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline font-sans text-[15px] font-medium tracking-tight">
          <span className="text-white">RAY</span>
          <span className="ml-1 text-[#22C55E] font-extrabold">DEV</span>
        </div>
        {withTagline && (
          <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#D6E7F3]/75">
            Native WSL 2 Dev Environment
          </span>
        )}
      </div>
    </div>
  );
}
