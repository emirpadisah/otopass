import React from "react";
import { cn } from "@/lib/cn";

const fieldBaseClass =
  "input-base disabled:cursor-not-allowed disabled:opacity-60";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]", className)}
    {...props}
  />
));

Label.displayName = "Label";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBaseClass, className)} {...props} />
));

Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBaseClass, "min-h-24 resize-y", className)} {...props} />
));

Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(fieldBaseClass, "appearance-none", className)} {...props} />
));

Select.displayName = "Select";

type FieldProps = {
  children: React.ReactNode;
  className?: string;
  description?: string;
  error?: string;
  label?: React.ReactNode;
  labelFor?: string;
};

export function Field({ children, className, description, error, label, labelFor }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label htmlFor={labelFor}>{label}</Label> : null}
      {children}
      {description ? <p className="text-xs text-[var(--text-muted)]">{description}</p> : null}
      {error ? <p className="text-xs font-semibold text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export { fieldBaseClass };
