/** GET /reports/dashboard/overview/ — bosh sahifa hisobotlar statistikasi (foydalanuvchi doirasida). */
export type OverviewPeriod = "month" | "quarter" | "year" | "all";

export type ReportStatusKey = "accepted" | "sent" | "saved" | "cancelled";

export interface OverviewKpi {
  value: number;
  /** Oldingi teng uzunlikdagi davr (period=all bo'lsa null). */
  previous: number | null;
  /** Oldingi davrga nisbatan o'zgarish, % (oldingi 0 yoki null bo'lsa null). */
  change_pct: number | null;
  /** Jami ichidagi ulush, %. */
  share_pct: number;
}

export type OverviewMonth = { month: string; total: number } & Record<ReportStatusKey, number>;

export interface OverviewDiscipline {
  total: number;
  on_time: number;
  late: number;
  in_review: number;
  missing: number;
  on_time_rate: number;
  completion_rate: number;
}

export interface OverviewTopForm {
  id: string;
  name: string;
  parent_name: string;
  total: number;
  accepted: number;
  cancelled: number;
  acceptance_rate: number;
}

export type OverviewRegion = {
  code: string;
  name: string;
  total: number;
  acceptance_rate: number;
} & Record<ReportStatusKey, number>;

export interface OverviewUpcomingDeadline {
  id: string;
  statement_id: string;
  statement_name: string;
  parent_name: string;
  submit_at: string;
  deadline_at: string;
  days_left: number;
  organizations: number;
  submitted: number;
  accepted: number;
}

export interface DashboardOverview {
  period: OverviewPeriod;
  period_start: string | null;
  period_end: string;
  generated_at: string;
  scope: {
    level: "all" | "organization" | "department" | "region" | "kadastr" | "none";
    regions_count: number;
  };
  kpis: Record<"total" | ReportStatusKey, OverviewKpi>;
  acceptance_rate: number;
  monthly: OverviewMonth[];
  discipline: OverviewDiscipline;
  top_forms: OverviewTopForm[];
  /** Faqat bir nechta hududni ko'radigan rollar uchun (aks holda bo'sh). */
  regions: OverviewRegion[];
  upcoming_deadlines: OverviewUpcomingDeadline[];
}
