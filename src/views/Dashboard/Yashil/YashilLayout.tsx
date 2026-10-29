import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useYashilT } from "@/features/yashil/i18n";
import { setScript } from "@/features/yashil/script";
import { useYashilAccess } from "@/features/yashil/permissions";
import { setCabinetId, useCabinetId } from "@/features/yashil/cabinet";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import { yashilApi } from "@/services/yashilApi";
import NotificationsBell from "./NotificationsBell";
import { useDispatch } from "react-redux";
import "./yashil.css";

interface Props {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

const MEMBER_TYPE_KEY = {
  mahalla: "member_type_mahalla",
  union: "member_type_union",
  supplier: "member_type_supplier",
  observer: "member_type_observer",
} as const;

/**
 * Modul sahifalari uchun umumiy qobiq: yashil tema, nomlar tasmasi, kabinet
 * tanlagich va kirill/lotin almashtirgich. Faqat `.yashil-root` ichida ishlaydi —
 * stat'ning qolgan dizayni o'zgarmaydi.
 */
function YashilLayout({ title, actions, children }: Props) {
  const { t, script } = useYashilT();
  const { me } = useYashilAccess();
  const cabinetId = useCabinetId();
  const dispatch = useDispatch();
  const location = useLocation();

  // Cookie'dagi kabinet foydalanuvchining ro'yxatida bo'lmasa (boshqa akkaunt) — tozalaymiz.
  useEffect(() => {
    if (!me) return;
    if (cabinetId && !me.cabinets.some((c) => c.id === cabinetId)) {
      setCabinetId(null);
      dispatch(yashilApi.util.invalidateTags(["YashilMe"]));
    }
  }, [me, cabinetId, dispatch]);

  const onCabinetChange = (id: string) => {
    setCabinetId(id || null);
    // Kabinet almashganda barcha modul keshlari qayta so'raladi (ko'lam o'zgaradi).
    dispatch(yashilApi.util.resetApiState());
  };

  const memberType = me?.active_cabinet?.member_type;
  const showWarehouse = memberType === "supplier" || memberType === "observer" || (!!me?.is_admin && !memberType);
  const nav = [
    { to: YASHIL_ROUTES.root, label: t("nav_overview") },
    { to: YASHIL_ROUTES.orders, label: t("nav_orders") },
    { to: YASHIL_ROUTES.acts, label: t("nav_acts") },
    ...(showWarehouse ? [{ to: YASHIL_ROUTES.warehouse, label: t("nav_warehouse") }] : []),
    { to: YASHIL_ROUTES.reports, label: t("nav_reports") },
    { to: YASHIL_ROUTES.stats, label: t("nav_stats") },
    { to: YASHIL_ROUTES.map, label: t("nav_map") },
    { to: YASHIL_ROUTES.reference, label: t("nav_reference") },
    ...(me?.is_admin ? [{ to: YASHIL_ROUTES.admin, label: t("nav_admin") }] : []),
  ];

  return (
    <div className="yashil-root px-3 py-3 sm:px-5 space-y-4">
      <div className="ym-card flex flex-wrap items-center justify-between gap-3 !py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="ym-stat-icon" aria-hidden="true">
            <Leaf size={20} />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] tracking-[1.5px] uppercase ym-muted">{t("module_title")}</div>
            <h1 className="ym-title leading-tight truncate">{title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {me && me.cabinets.length > 1 && (
            <label className="flex items-center gap-2 text-xs ym-muted">
              {t("cabinet")}
              <select
                className="ym-select"
                value={me.active_cabinet?.id ?? ""}
                onChange={(e) => onCabinetChange(e.target.value)}
                aria-label={t("choose_cabinet")}
              >
                {me.cabinets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(MEMBER_TYPE_KEY[c.member_type])}: {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="inline-flex rounded-[10px] overflow-hidden border border-[var(--ym-border)]" role="group" aria-label="Yozuv">
            <button
              type="button"
              className={`ym-btn !border-0 !rounded-none ${script === "cyr" ? "ym-btn--active" : ""}`}
              onClick={() => setScript("cyr")}
              aria-pressed={script === "cyr"}
            >
              {t("script_cyr")}
            </button>
            <button
              type="button"
              className={`ym-btn !border-0 !rounded-none ${script === "lat" ? "ym-btn--active" : ""}`}
              onClick={() => setScript("lat")}
              aria-pressed={script === "lat"}
            >
              {t("script_lat")}
            </button>
          </div>
          {me && <NotificationsBell unread={me.unread_notifications ?? 0} />}
          {actions}
        </div>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label={t("module_title")}>
        {nav.map((item) => {
          const active = item.to === YASHIL_ROUTES.root
            ? location.pathname === item.to || location.pathname === `${item.to}/`
            : location.pathname.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to} className={`ym-btn ${active ? "ym-btn--primary" : ""}`} aria-current={active ? "page" : undefined}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}

export default YashilLayout;
