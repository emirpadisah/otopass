import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const cardVariants = cva("rounded-3xl border", {
  variants: {
    tone: {
      elevated:
        "border-[var(--border-soft)] bg-[var(--surface-1)] shadow-[var(--shadow-elevated)]",
      flat: "border-[var(--border-soft)] bg-[var(--surface-2)] shadow-none",
      outlined: "border-[var(--border-strong)] bg-transparent shadow-none",
    },
    padding: {
      sm: "p-4",
      md: "p-5",
      lg: "p-6",
    },
  },
  defaultVariants: {
    tone: "elevated",
    padding: "md",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, tone, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ tone, padding }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--text-muted)]", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-4", className)} {...props} />;
}
