import { cn } from "@/lib/cn";

const statusMap: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "Beklemede",
    className: "bg-[color:color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)] border-[color:color-mix(in_srgb,var(--warning)_42%,transparent)]",
  },
  offered: {
    label: "Teklif Verildi",
    className: "bg-[var(--accent-soft)] text-[var(--accent)] border-[color:var(--accent-soft-strong)]",
  },
  sold: {
    label: "Alındı",
    className: "bg-[color:color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)] border-[color:color-mix(in_srgb,var(--success)_42%,transparent)]",
  },
};

export function StatusBadge({
  status,
  className,
  label,
}: {
  status: string;
  className?: string;
  label?: string;
}) {
  const config = statusMap[status] ?? {
    label: status,
    className: "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border-soft)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
        config.className,
        className
      )}
    >
      {label ?? config.label}
    </span>
  );
}
