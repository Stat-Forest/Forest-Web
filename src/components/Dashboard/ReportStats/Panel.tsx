import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { STATUS_ORDER, useChartTheme } from "./theme";

export const panelClass =
  "bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs backdrop-blur-md transition-colors";

interface PanelProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  /** Tailwind klasslari: ikonka foni va rangi. */
  iconClass?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Bosh sahifa statistikasi kartasi: sarlavha + ikonka + kontent. */
export function Panel({ title, subtitle, icon: Icon, iconClass, actions, className, children }: PanelProps) {
  return (
    <section className={cn(panelClass, "p-4 sm:p-5 flex flex-col min-w-0", className)}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "p-2 rounded-xl shrink-0 bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
              iconClass,
            )}
          >
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </header>
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </section>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/80", className)} />;
}

export function EmptyHint({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="h-full min-h-[140px] flex flex-col items-center justify-center gap-2 text-center text-slate-400 dark:text-slate-500">
      <Icon size={28} strokeWidth={1.5} />
      <p className="text-xs font-medium">{text}</p>
    </div>
  );
}

export function StatusLegend({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useChartTheme();
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs ${className}`}>
      {STATUS_ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: theme.status[s] }} />
          {t(`report_stats.status.${s}`)}
        </span>
      ))}
    </div>
  );
}
