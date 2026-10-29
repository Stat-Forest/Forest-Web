/**
 * Eksport tugmalari (TZ §14.2): XLSX / CSV / PDF. Kichik hisobot darhol yuklanadi;
 * katta — fon vazifa: har 2 soniyada holat so'raladi, tayyor bo'lganda yuklab beriladi
 * (kabinet xabarnomasi ham keladi). «Сўнгги экспортлар» — oxirgi 20 vazifa.
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import type { ExportFormat, ExportJobOut, ExportKind, ReportFilterParams } from "@/features/yashil/types";
import { useCreateYashilExportMutation, useGetYashilExportsQuery, useLazyGetYashilExportQuery, yashilApi } from "@/services/yashilApi";
import { useDispatch } from "react-redux";
import { apiErrorText, fmtDateTime } from "../Orders/orderUi";

const absolute = (url: string) => (url.startsWith("http") ? url : `${window.location.origin}${url}`);

/** Faylni yuklab olish: `<a download>` — sahifa o'zgarmaydi, imzoli havola (`?t=`) 30 daqiqa amal qiladi. */
export function openExport(job: ExportJobOut) {
  if (!job.url) return;
  const a = document.createElement("a");
  a.href = absolute(job.url);
  a.download = job.filename || `export.${job.format}`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface Props {
  kind: ExportKind;
  filters: ReportFilterParams;
  columns?: string[];
  disabled?: boolean;
}

export function ExportMenu({ kind, filters, columns, disabled }: Props) {
  const { t } = useYashilT();
  const dispatch = useDispatch();
  const [create, { isLoading }] = useCreateYashilExportMutation();
  const [fetchJob] = useLazyGetYashilExportQuery();
  const [pending, setPending] = useState<ExportJobOut | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const poll = (id: string) => {
    timer.current = window.setTimeout(async () => {
      try {
        const job = await fetchJob(id).unwrap();
        if (job.status === "done") {
          setPending(null);
          toast.success(`${t("export_ready")} · ${job.row_count} ${t("export_rows")}`);
          openExport(job);
          dispatch(yashilApi.util.invalidateTags(["YashilExports", "YashilNotif", "YashilMe"]));
        } else if (job.status === "failed") {
          setPending(null);
          toast.error(`${t("export_failed")}: ${job.error || ""}`);
          dispatch(yashilApi.util.invalidateTags(["YashilExports"]));
        } else {
          setPending(job);
          poll(id);
        }
      } catch {
        setPending(null);
      }
    }, 2000);
  };

  const run = async (format: ExportFormat) => {
    try {
      const body = { kind, format, filters: { ...filters, ...(columns?.length ? { columns } : {}) } as Record<string, unknown> };
      const job = await create(body).unwrap();
      if (job.status === "done") {
        toast.success(`${t("export_ready")} · ${job.row_count} ${t("export_rows")}`);
        openExport(job);
      } else {
        setPending(job);
        toast.info(t("export_queued"));
        poll(job.id);
      }
    } catch (e) {
      toast.error(apiErrorText(e, t("export_failed")));
    }
  };

  const busy = isLoading || pending !== null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="ym-btn" disabled={disabled || busy} onClick={() => run("xlsx")}><FileSpreadsheet size={16} />{t("export_xlsx")}</button>
      <button type="button" className="ym-btn" disabled={disabled || busy} onClick={() => run("csv")}><Download size={16} />{t("export_csv")}</button>
      <button type="button" className="ym-btn" disabled={disabled || busy} onClick={() => run("pdf")}><FileText size={16} />{t("export_pdf")}</button>
      {busy && <span className="inline-flex items-center gap-1 text-xs ym-muted"><Loader2 size={14} className="animate-spin" />{t(pending ? (`export_status_${pending.status}` as YashilKey) : "loading")}</span>}
    </div>
  );
}

/** Oxirgi eksportlar ro'yxati (yuklab olish havolalari 7 kun). */
export function RecentExports() {
  const { t } = useYashilT();
  const [open, setOpen] = useState(false);
  const { data } = useGetYashilExportsQuery(undefined, { skip: !open });
  const jobs = data?.results ?? [];
  return (
    <div className="text-sm">
      <button type="button" className="ym-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{t("export_recent")}</button>
      {open && (
        <div className="mt-2 overflow-auto">
          {jobs.length === 0 ? <p className="ym-muted">{t("empty")}</p> : (
            <table className="ym-table">
              <thead><tr><th>{t("col_date")}</th><th>{t("col_type")}</th><th>{t("col_status")}</th><th>{t("export_rows")}</th><th></th></tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="whitespace-nowrap">{fmtDateTime(j.created_at)}</td>
                    <td>{t(j.kind === "acts" ? "tab_acts_registry" : "tab_registry")} · {j.format.toUpperCase()}</td>
                    <td><span className={`ym-badge ${j.status === "failed" ? "ym-badge--red" : j.status === "done" ? "" : "ym-badge--amber"}`}>{t(`export_status_${j.status}` as YashilKey)}</span></td>
                    <td>{j.row_count}</td>
                    <td>{j.url && <button type="button" className="ym-btn" onClick={() => openExport(j)}><Download size={14} />{t("export_download")}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
