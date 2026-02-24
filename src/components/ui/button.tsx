import React from "react";
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
  {
    variants: {
      variant: {
        default: "bg-emerald-600 text-white hover:bg-emerald-700",
        ghost: "bg-transparent text-zinc-900 hover:bg-zinc-100",
        subtle: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
      },
      size: {
        default: "h-10",
        sm: "h-8 text-xs px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "subtle";
  size?: "default" | "sm";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${buttonVariants({ variant, size })} ${className ?? ""}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
