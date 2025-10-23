/**
 * @file components/ui/badge.tsx
 * @version 2.0.0
 * @description Componente Badge reutilizável
 * @author DevEPS
 * @since 2025-10-21
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-success-500 text-white",
        warning: "border-transparent bg-warning-500 text-white",
        error: "border-transparent bg-error-500 text-white",
        active: "border-transparent bg-success-100 text-success-800",
        pending: "border-transparent bg-warning-100 text-warning-800",
        completed: "border-transparent bg-eps-100 text-eps-800",
        bronze: "border-transparent bg-amber-100 text-amber-800",
        prata: "border-transparent bg-gray-100 text-gray-800",
        ouro: "border-transparent bg-yellow-100 text-yellow-800",
        platina: "border-transparent bg-slate-100 text-slate-800",
        diamante: "border-transparent bg-blue-100 text-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
