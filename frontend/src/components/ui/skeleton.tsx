/**
 * @file components/ui/skeleton.tsx
 * @version 2.0.0
 * @description Componente Skeleton para loading states
 * @author DevEPS
 * @since 2025-10-21
 */

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
