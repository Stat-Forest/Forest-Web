/** Buyurtma UI yordamchilari: holat belgisi, bosqich tasmasi, muddat matni, formatlash. */
import { CheckCircle2 } from "lucide-react";
import { stateKey, useYashilT, type YashilKey } from "@/features/yashil/i18n";
import type { DeadlineInfo, OrderState } from "@/features/yashil/types";
import type { YashilApiError } from "@/features/yashil/types";

export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = iso.slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : iso;
};

export const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
};

export const fmtBytes = (n: number): string => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** Backend xato shartnomasidan foydalanuvchiga ko'rsatiladigan matn. */
export const apiErrorText = (error: unknown, fallback: string): string => {
  const data = (error as { data?: Partial<YashilApiError> | string })?.data;
  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  const detail = (data as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  return fallback;
};

export const apiErrorField = (error: unknown): string | null =>
  ((error as { data?: Partial<YashilApiError> })?.data?.field as string | undefined) ?? null;

const STATE_CLASS: Record<OrderState, string> = {
  draft: "",
  union_new: "ym-badge--amber",
  union_review: "ym-badge--amber",
  returned: "ym-badge--red",
  supplier_new: "ym-badge--amber",
  supplier_review: "ym-badge--amber",
  execution: "ym-badge--blue",
};

export function StateBadge({ state }: { state: OrderState }) {
  const { t } = useYashilT();
  return <span className={`ym-badge ${STATE_CLASS[state] ?? ""}`}>{t(stateKey(state))}</span>;
}

export function DeadlineText({ info, state }: { info: DeadlineInfo; state: OrderState }) {
  const { t } = useYashilT();
  if (state === "draft" || !info.stage) return <span className="ym-muted">{t("no_deadline")}</span>;
  const due = info.stage === "review" ? info.review_due : info.delivery_due;
  const label = info.stage === "review" ? t("review_due") : t("delivery_due");
  return (
    <span className="text-xs">
      <span className="ym-muted">{label}:</span> {fmtDate(due)}
      {info.late_workdays > 0 && (
        <span className="ym-badge ym-badge--red ml-2">{info.late_workdays} {t("late_days")}</span>
      )}
    </span>
  );
}

const STEPS: { key: YashilKey; states: OrderState[] }[] = [
  { key: "journey_order", states: ["draft", "returned"] },
  { key: "journey_union", states: ["union_new", "union_review"] },
  { key: "journey_supplier", states: ["supplier_new", "supplier_review"] },
  { key: "journey_execution", states: ["execution"] },
  { key: "journey_act", states: [] },
  { key: "journey_done", states: [] },
];

export function JourneyStrip({ state }: { state: OrderState }) {
  const { t } = useYashilT();
  const idx = Math.max(0, STEPS.findIndex((s) => s.states.includes(state)));
  return (
    <ol className="ym-card flex flex-wrap items-center gap-2 !py-3 !px-4" aria-label={t("journey_order")}>
      {STEPS.map((s, n) => {
        const done = n < idx;
        const here = n === idx;
        return (
          <li key={s.key} className={`flex items-center gap-2 text-xs ${here ? "font-semibold text-[var(--ym-green-dark)]" : done ? "text-[var(--ym-green)]" : "ym-muted"}`} aria-current={here ? "step" : undefined}>
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] ${here ? "bg-[var(--ym-green)] text-white" : done ? "bg-[var(--ym-green-soft)]" : "bg-[var(--ym-bg)] border border-[var(--ym-border)]"}`}>
              {done ? <CheckCircle2 size={14} /> : n + 1}
            </span>
            {t(s.key)}
            {n < STEPS.length - 1 && <span className="w-4 h-px bg-[var(--ym-border)] hidden sm:inline-block" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
