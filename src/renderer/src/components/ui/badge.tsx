import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-0.5 text-[11px] font-medium transition-colors tabular-nums select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--surface-hover)] text-[var(--text-muted)]",
        accent:
          "bg-[var(--accent)]/15 text-[var(--accent)] font-semibold",
        success:
          "bg-[var(--success)]/15 text-[var(--success)] font-semibold",
        danger:
          "bg-[var(--danger)]/15 text-[var(--danger)] font-semibold",
        warning:
          "bg-amber-500/15 text-amber-300 font-semibold",
        outline:
          "bg-[var(--surface-hover)] text-[var(--text-muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
