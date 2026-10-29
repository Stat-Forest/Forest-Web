/** Modul ma'lumotnomalari va sozlamalari o'zgarishlari jurnali (TZ §17.2). */
import { useMemo, useState } from "react";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { useGetYashilAdminAuditQuery } from "@/services/yashilApi";
import { fmtDateTime } from "../Orders/orderUi";
import { Pager } from "./adminUi";

const MODELS = ["YashilMembership", "Mahalla", "UnionUnit", "MahallaUnionRoute", "SupplierProfile", "SupplierAssignment", "CalendarDay", "CatalogItem", "ServiceCapacity", "YashilSetting"];
const PER_PAGE = 25;

export function AuditTab() {
  const { t } = useYashilT();
  const [model, setModel] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ model: model || undefined, q: q || undefined, page, per_page: PER_PAGE }), [model, q, page]);
  const { data, isFetching } = useGetYashilAdminAuditQuery(params);
  return (
    <div className="ym-card space-y-3">
      <div className="flex flex-wrap gap-2">
        <select className="ym-select" value={model} onChange={(e) => { setModel(e.target.value); setPage(1); }} aria-label={t("col_object")}>
          <option value="">{t("filter_all")}</option>
          {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input className="ym-select" placeholder={t("search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label={t("search")} />
      </div>
      {data && data.results.length === 0 && !isFetching ? <p className="ym-muted text-sm py-6 text-center">{t("empty")}</p> : (
        <div className="overflow-auto">
          <table className="ym-table text-[13px]">
            <thead><tr><th>{t("col_date")}</th><th>{t("col_user")}</th><th>{t("col_action")}</th><th>{t("col_object")}</th></tr></thead>
            <tbody>
              {(data?.results ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                  <td>{r.user || "—"}</td>
                  <td><span className={`ym-badge ${r.action === "delete" ? "ym-badge--red" : r.action === "add" ? "" : "ym-badge--blue"}`}>{t(`action_${r.action}` as YashilKey)}</span></td>
                  <td>{r.model_name}<div className="ym-muted text-[11px]">{r.object_repr}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} count={data?.count ?? 0} perPage={PER_PAGE} onPage={setPage} />
    </div>
  );
}
