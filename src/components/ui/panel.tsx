import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

type PanelPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PanelPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  meta,
  actions,
  className,
}: PanelPageHeaderProps) {
  return (
    <header className={cn("ops-page-header ops-reveal", className)}>
      <div className="flex min-w-0 items-start gap-4">
        {Icon ? (
          <span className="ops-page-icon">
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="ops-eyebrow">{eyebrow}</p>
          <h1 className="ops-page-title">{title}</h1>
          <p className="ops-page-description">{description}</p>
        </div>
      </div>
      {meta || actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {meta}
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export type PanelMetric = {
  label: string;
  value: string;
  note?: string;
  icon: LucideIcon;
  tone?: "neutral" | "accent" | "success" | "warning";
  progress?: number;
};

export function MetricStrip({ metrics, label = "Temel metrikler" }: { metrics: PanelMetric[]; label?: string }) {
  return (
    <section
      className="ops-metric-strip ops-reveal ops-delay-1"
      aria-label={label}
      data-count={Math.min(metrics.length, 5)}
    >
      {metrics.map(({ label: itemLabel, value, note, icon: Icon, tone = "neutral", progress }, index) => {
        const style = {
          "--ops-metric-progress": `${Math.max(0, Math.min(progress ?? 0, 100))}%`,
          "--ops-item-delay": `${index * 45}ms`,
        } as CSSProperties;

        return (
          <article key={itemLabel} className="ops-metric" data-tone={tone} style={style}>
            <div className="flex items-center justify-between gap-3">
              <span className="ops-metric-label">{itemLabel}</span>
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="ops-metric-value">{value}</p>
            {note ? <p className="ops-metric-note">{note}</p> : null}
            {typeof progress === "number" ? <span className="ops-metric-track" aria-hidden="true"><i /></span> : null}
          </article>
        );
      })}
    </section>
  );
}

type PanelSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function PanelSection({
  title,
  description,
  icon: Icon,
  meta,
  children,
  className,
  contentClassName,
}: PanelSectionProps) {
  return (
    <section className={cn("ops-section ops-reveal ops-delay-2", className)}>
      <div className="ops-section-header">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? <Icon size={17} className="text-[var(--ops-accent)]" aria-hidden="true" /> : null}
          <div className="min-w-0">
            <h2 className="ops-section-title">{title}</h2>
            {description ? <p className="ops-section-description">{description}</p> : null}
          </div>
        </div>
        {meta ? <div className="shrink-0">{meta}</div> : null}
      </div>
      <div className={cn("ops-section-content", contentClassName)}>{children}</div>
    </section>
  );
}

export type PipelineItem = {
  label: string;
  value: number;
  description: string;
  tone?: "neutral" | "accent" | "success" | "warning";
};

export function ProcessRail({ items, label = "Operasyon akışı" }: { items: PipelineItem[]; label?: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <ol className="ops-process" aria-label={label}>
      {items.map((item, index) => {
        const style = { "--ops-process-width": `${Math.max(item.value ? 10 : 0, (item.value / max) * 100)}%` } as CSSProperties;
        return (
          <li key={item.label} className="ops-process-item" data-tone={item.tone ?? "neutral"} style={style}>
            <div className="ops-process-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-bold text-[var(--ops-text)]">{item.label}</p>
                <strong className="ops-process-value">{item.value}</strong>
              </div>
              <p className="mt-1 text-xs text-[var(--ops-muted)]">{item.description}</p>
              <span className="ops-process-track" aria-hidden="true"><i /></span>
            </div>
            {index < items.length - 1 ? <ArrowUpRight className="ops-process-arrow" size={15} aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function PanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Panel yükleniyor">
      <div className="ops-skeleton h-32" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="ops-skeleton h-28" />)}
      </div>
      <div className="ops-skeleton h-80" />
    </div>
  );
}
