import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Official WRMax wordmark (white, transparent PNG) from the WRMax Design System
 * assets (Logos/wrmax-logo.png, 1024×170). Never recreate it in CSS.
 */
export function BrandLogo({ width = 120, className }: { width?: number; className?: string }) {
  return (
    <Image
      src="/brand/wrmax-logo.png"
      alt="WRMax Marketing"
      width={width}
      height={Math.round((width * 170) / 1024)}
      priority
      className={cn("h-auto select-none", className)}
    />
  );
}
