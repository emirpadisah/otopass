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
    className: "bg-[rgba(245,158,11,0.18)] text-[#fbbf24] border-[rgba(245,158,11,0.35)]",
  },
  offered: {
    label: "Teklif Verildi",
    className: "bg-[rgba(59,130,246,0.18)] text-[#60a5fa] border-[rgba(59,130,246,0.35)]",
  },
  sold: {
    label: "Alindi",
    className: "bg-[rgba(34,197,94,0.18)] text-[#4ade80] border-[rgba(34,197,94,0.35)]",
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
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em]",
        config.className,
        className
      )}
    >
      {label ?? config.label}
    </span>
  );
}
