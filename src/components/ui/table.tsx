import React from "react";
import { cn } from "@/lib/cn";

export function DataTable({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("table-shell overflow-x-auto ui-scrollbar", className)} {...props} />;
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("min-w-full text-sm", className)} {...props} />;
}

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "bg-[color:color-mix(in_srgb,var(--surface-2)_82%,transparent)] text-[var(--text-muted)]",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-[var(--border-soft)]", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-[color:color-mix(in_srgb,var(--surface-2)_84%,transparent)]",
        className
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-[0.69rem] font-semibold uppercase tracking-[0.11em]",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-[var(--text-secondary)]", className)} {...props} />;
}

export function TableEmptyState({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
        {message}
      </td>
    </tr>
  );
}
