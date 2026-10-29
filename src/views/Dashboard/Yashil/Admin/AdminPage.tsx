/**
 * Модул маъмурияти (TZ §17.1; plans §11.1-9): faqat modul administratori. Tab URL `?tab=` da.
 * A'zoliklar, kalendar, mahallalar, biriktirishlar, katalog va quvvat, qoidalar, jurnal.
 */
import { Navigate, useSearchParams } from "react-router-dom";
import YashilLayout from "../YashilLayout";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { useYashilAccess } from "@/features/yashil/permissions";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import { AuditTab } from "./AuditTab";
import { CalendarTab } from "./CalendarTab";
import { CatalogTab } from "./CatalogTab";
import { LinksTab } from "./LinksTab";
import { MahallasTab } from "./MahallasTab";
import { MembershipsTab } from "./MembershipsTab";
import { SettingsTab } from "./SettingsTab";

const TABS: { key: string; label: YashilKey }[] = [
  { key: "members", label: "admin_tab_members" },
  { key: "calendar", label: "admin_tab_calendar" },
  { key: "mahallas", label: "admin_tab_mahallas" },
  { key: "links", label: "admin_tab_links" },
  { key: "catalog", label: "admin_tab_catalog" },
  { key: "settings", label: "admin_tab_settings" },
  { key: "audit", label: "admin_tab_audit" },
];

function AdminPage() {
  const { t } = useYashilT();
  const { me, isLoading } = useYashilAccess();
  const [sp, setSp] = useSearchParams();
  const tab = TABS.some((x) => x.key === sp.get("tab")) ? sp.get("tab")! : "members";
  if (!isLoading && me && !me.is_admin) return <Navigate to={YASHIL_ROUTES.root} replace />;
  return (
    <YashilLayout title={t("admin_title")}>
      <div className="ym-card !py-3 space-y-2">
        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map((x) => (
            <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} className={`ym-btn ${tab === x.key ? "ym-btn--active" : ""}`} onClick={() => setSp({ tab: x.key }, { replace: true })}>{t(x.label)}</button>
          ))}
        </div>
        <p className="text-xs ym-muted">{t("admin_note")}</p>
      </div>
      {tab === "members" && <MembershipsTab />}
      {tab === "calendar" && <CalendarTab />}
      {tab === "mahallas" && <MahallasTab />}
      {tab === "links" && <LinksTab />}
      {tab === "catalog" && <CatalogTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "audit" && <AuditTab />}
    </YashilLayout>
  );
}

export default AdminPage;
