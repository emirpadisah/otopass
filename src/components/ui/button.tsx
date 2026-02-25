import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[0_18px_35px_-28px_var(--accent-shadow)] hover:bg-[var(--accent-strong)]",
        secondary:
          "border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]",
        ghost:
          "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
        tonal:
          "border-[color:var(--accent-soft-strong)] bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft-strong)]",
        danger: "border-transparent bg-[var(--danger)] text-white hover:brightness-95",
      },
      size: {
        sm: "h-9 px-3.5 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);

Button.displayName = "Button";
