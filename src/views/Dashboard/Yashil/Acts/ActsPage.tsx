/** Dalolatnomalar reestri (TZ §14): yetkazib beruvchida «Рад этилган», mahallada «Тасдиқ кутаётган» bo'limlari. */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import YashilLayout from "../YashilLayout";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import { useYashilAccess } from "@/features/yashil/permissions";
import { YASHIL_ROUTES } from "@/features/yashil/constants";
import { useGetYashilActsQuery } from "@/services/yashilApi";
import type { MemberType } from "@/features/yashil/types";
import { ActStatusBadge, fmtDate, fmtDateTime } from "../Orders/orderUi";

interface Tab { key: YashilKey; status: string }

const TABS: Record<MemberType | "admin", Tab[]> = {
  supplier: [
    { key: "tab_act_draft", status: "draft" },
    { key: "tab_act_returned", status: "returned" },
    { key: "tab_act_review", status: "mahalla_review" },
    { key: "tab_act_approved", status: "approved" },
    { key: "tab_all", status: "" },
  ],
  mahalla: [
    { key: "tab_act_review", status: "mahalla_review" },
    { key: "tab_act_approved", status: "approved" },
    { key: "tab_act_returned", status: "returned" },
    { key: "tab_all", status: "" },
  ],
  union: [
    { key: "tab_act_review", status: "mahalla_review" },
    { key: "tab_act_approved", status: "approved" },
    { key: "tab_act_returned", status: "returned" },
    { key: "tab_all", status: "" },
  ],
  observer: [
    { key: "tab_all", status: "" },
    { key: "tab_act_review", status: "mahalla_review" },
    { key: "tab_act_approved", status: "approved" },
    { key: "tab_act_returned", status: "returned" },
  ],
  admin: [{ key: "tab_all", status: "" }, { key: "tab_act_review", status: "mahalla_review" }],
};

function ActsPage() {
  const { t } = useYashilT();
  const { cabinet } = useYashilAccess();
  const navigate = useNavigate();
  const tabs = TABS[cabinet?.member_type ?? "admin"];
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ status: tabs[tab]?.status || undefined, q: q || undefined, page, per_page: 20 }), [tabs, tab, q, page]);
  const { data, isFetching } = useGetYashilActsQuery(params);
  const pages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  return (
    <YashilLayout title={t("acts_title")}>
      <div className="ym-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2" role="tablist">
            {tabs.map((tb, i) => (
              <button key={tb.key} type="button" role="tab" aria-selected={i === tab} className={`ym-btn ${i === tab ? "ym-btn--active" : ""}`} onClick={() => { setTab(i); setPage(1); }}>{t(tb.key)}</button>
            ))}
          </div>
          <input className="ym-select" placeholder={t("search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label={t("search")} />
        </div>
        {data && data.results.length === 0 && !isFetching ? (
          <p className="ym-muted text-sm py-6 text-center">{t("no_acts")}</p>
        ) : (
          <div className="overflow-auto">
            <table className="ym-table">
              <thead><tr><th>{t("col_number")}</th><th>{t("col_title")}</th><th>{t("col_mahalla")}</th><th>{t("col_supplier")}</th><th>{t("delivery_date")}</th><th>{t("col_state")}</th><th>{t("col_date")}</th></tr></thead>
              <tbody>
                {(data?.results ?? []).map((a) => (
                  <tr key={a.id} className="cursor-pointer" onClick={() => navigate(YASHIL_ROUTES.act(a.id))}>
                    <td className="font-semibold whitespace-nowrap">{a.number}<div className="ym-muted text-[11px] font-normal">v{a.version_no}{a.is_partial ? ` · ${t("partial_badge")}` : ""}</div></td>
                    <td>{a.order.title || a.order.number}</td>
                    <td>{a.order.mahalla_name}</td>
                    <td>{a.order.supplier_name}</td>
                    <td className="whitespace-nowrap">{fmtDate(a.delivery_date)}</td>
                    <td><ActStatusBadge status={a.status} /></td>
                    <td className="ym-muted whitespace-nowrap">{fmtDateTime(a.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <button type="button" className="ym-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
            <span className="ym-muted">{page} / {pages}</span>
            <button type="button" className="ym-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </div>
    </YashilLayout>
  );
}

export default ActsPage;
