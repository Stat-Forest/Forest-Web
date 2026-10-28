import { CheckCircle2, Clock, Droplets, Leaf, ListChecks, ShieldCheck, Sprout } from "lucide-react";
import YashilLayout from "./YashilLayout";
import { useYashilT } from "@/features/yashil/i18n";
import { useYashilAccess } from "@/features/yashil/permissions";
import { useGetYashilDueQuery } from "@/services/yashilApi";

const formatDate = (iso: string | undefined): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};

/**
 * Umumiy ko'rinish (1-bosqich): kartalar hozircha 0 — buyurtmalar 2-bosqichda.
 * Muddat qoidalari va bugundan hisoblangan sanalar backend kalendaridan.
 */
function Overview() {
  const { t } = useYashilT();
  const { me } = useYashilAccess();
  const { data: due } = useGetYashilDueQuery();

  const stats = [
    { key: "stat_total", icon: <ListChecks size={20} />, value: 0 },
    { key: "stat_review", icon: <Clock size={20} />, value: 0 },
    { key: "stat_execution", icon: <Sprout size={20} />, value: 0 },
    { key: "stat_done", icon: <CheckCircle2 size={20} />, value: 0 },
  ] as const;

  return (
    <YashilLayout title={t("nav_overview")}>
      <section className="ym-card grid gap-4 md:grid-cols-[1.2fr_1fr] items-center">
        <div>
          <div className="ym-stat-icon mb-3" aria-hidden="true">
            <Sprout size={26} />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">{t("module_title")}</h2>
          <p className="ym-muted mt-1">{t("module_subtitle")}</p>
          {me?.active_cabinet && (
            <p className="mt-3 text-sm">
              <span className="ym-badge">{me.active_cabinet.name}</span>
              {me.is_admin && <span className="ym-badge ym-badge--blue ml-2">{t("admin_badge")}</span>}
            </p>
          )}
          {!me?.active_cabinet && me?.is_admin && (
            <p className="mt-3 text-sm"><span className="ym-badge ym-badge--blue">{t("admin_badge")}</span></p>
          )}
        </div>
        <div className="ym-notice">{t("stage1_note")}</div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.key} className="ym-stat">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] ym-muted">{t(s.key)}</span>
              <span className="ym-stat-icon" aria-hidden="true">{s.icon}</span>
            </div>
            <strong>
              {s.value}
              <small>{t("orders_count_unit")}</small>
            </strong>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="ym-card">
          <h3 className="font-semibold text-lg mb-3">{t("rules_title")}</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <span className="font-semibold text-[var(--ym-green)]">{me?.rules.review_workdays ?? 3}</span> {t("rule_review")}
            </li>
            <li>
              <span className="font-semibold text-[var(--ym-green)]">{me?.rules.delivery_workdays ?? 10}</span> {t("rule_delivery")}
            </li>
          </ul>
          <div className="mt-4 text-sm ym-muted">{t("due_from_today")} ({formatDate(due?.start)}):</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="ym-badge ym-badge--amber">{t("review_due")}: {formatDate(due?.review_due)}</span>
            <span className="ym-badge ym-badge--blue">{t("delivery_due")}: {formatDate(due?.delivery_due)}</span>
          </div>
        </div>
        <div className="ym-card">
          <h3 className="font-semibold text-lg mb-3">{t("services_title")}</h3>
          <div className="ym-service-strip">
            <div><Sprout size={22} /><span>{t("svc_seedlings")}</span></div>
            <div><ShieldCheck size={22} /><span>{t("svc_protection")}</span></div>
            <div><Leaf size={22} /><span>{t("svc_fertilizer")}</span></div>
            <div><Droplets size={22} /><span>{t("svc_irrigation")}</span></div>
          </div>
        </div>
      </section>
    </YashilLayout>
  );
}

export default Overview;
