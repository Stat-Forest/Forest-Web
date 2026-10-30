/** Ishlab chiqarish kalendari (javob Д1): bayram va ko'chirilgan ish kunlari, manba rekviziti, Excel import. */
import { useState } from "react";
import { useYashilT } from "@/features/yashil/i18n";
import { useDeleteYashilAdminCalendarDayMutation, useGetYashilAdminCalendarQuery, useSaveYashilAdminCalendarDayMutation } from "@/services/yashilApi";
import { fmtDate } from "../Orders/orderUi";
import { FormDialog, inputCls, useSave } from "./adminUi";
import { ImportDialog } from "./ImportDialog";


export function CalendarTab() {
  const { t } = useYashilT();
  const [year, setYear] = useState(new Date().getFullYear());
  const { data } = useGetYashilAdminCalendarQuery(year);
  const [save, { isLoading }] = useSaveYashilAdminCalendarDayMutation();
  const [remove] = useDeleteYashilAdminCalendarDayMutation();
  const { error, field, run } = useSave();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({ date: "", kind: "holiday" as "holiday" | "workday", note: "", source_ref: "" });

  return (
    <div className="ym-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm flex items-center gap-2">{t("year")}
          <select className="ym-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[0, 1, 2, -1].map((d) => new Date().getFullYear() + d).sort().map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ym-btn" onClick={() => setImporting(true)}>{t("import_excel")}</button>
          <button type="button" className="ym-btn ym-btn--primary" onClick={() => { setForm({ date: "", kind: "holiday", note: "", source_ref: "" }); setOpen(true); }}>{t("add_new")}</button>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="ym-table text-[13px]">
          <thead><tr><th>{t("col_date")}</th><th>{t("col_type")}</th><th>{t("note")}</th><th>{t("calendar_source")}</th><th></th></tr></thead>
          <tbody>
            {(data?.results ?? []).map((d) => (
              <tr key={d.id}>
                <td className="whitespace-nowrap">{fmtDate(d.date)} <span className="ym-muted">{t("weekdays_short").split(",")[new Date(`${d.date}T00:00:00`).getDay()]}</span></td>
                <td><span className={`ym-badge ${d.kind === "holiday" ? "ym-badge--red" : "ym-badge--blue"}`}>{t(d.kind === "holiday" ? "kind_holiday" : "kind_workday")}</span></td>
                <td>{d.note || "—"}</td>
                <td>{d.source_ref || "—"}</td>
                <td><button type="button" className="ym-btn" onClick={() => { if (window.confirm(`${fmtDate(d.date)} — ${t("delete")}?`)) run(() => remove(d.id).unwrap()); }}>{t("delete")}</button></td>
              </tr>
            ))}
            {data && data.results.length === 0 && <tr><td colSpan={5} className="ym-muted text-center">{t("empty")}</td></tr>}
          </tbody>
        </table>
      </div>
      {open && (
        <FormDialog title={t("admin_tab_calendar")} open onClose={() => setOpen(false)} saving={isLoading} disabled={!form.date} error={error}
          onSave={() => run(() => save(form).unwrap(), () => setOpen(false))}>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm block">{t("col_date")} *<input type="date" className={inputCls(field === "date")} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label className="text-sm block">{t("col_type")} *
              <select className={inputCls(field === "kind")} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "holiday" | "workday" })}>
                <option value="holiday">{t("kind_holiday")}</option>
                <option value="workday">{t("kind_workday")}</option>
              </select>
            </label>
          </div>
          <label className="text-sm block">{t("note")}<input className={inputCls(field === "note")} value={form.note} maxLength={200} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <label className="text-sm block">{t("import_source")}<input className={inputCls(field === "source_ref")} value={form.source_ref} maxLength={300} onChange={(e) => setForm({ ...form, source_ref: e.target.value })} /></label>
        </FormDialog>
      )}
      {importing && <ImportDialog kind="calendar" title={`${t("admin_tab_calendar")} — ${t("import_excel")}`} withSource onClose={() => setImporting(false)} />}
    </div>
  );
}
