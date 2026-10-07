// /billing/contracts/upload-excel — Excel'dan shartnomalarni yuklash
// (billing pages/contracts/upload-excel.vue porti). Faqat canEdit
// (BillingEditRoute bilan o'ralgan).
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Download, FileSpreadsheet, Loader2, Pencil, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import BillingLayout from "../BillingLayout";
import ImportRowEditDialog from "./ContractForm/ImportRowEditDialog";
import { useDownloadImportTemplateMutation, useImportContractsExcelMutation } from "@/services/billingApi";
import { useBillingAccess } from "@/features/billing/permissions";
import { BILLING_ROUTES, IMPORT_CHUNK_SIZE, IMPORT_MAX_ROWS_PER_REQUEST } from "@/features/billing/constants";
import {
  buildColumnIndex,
  chunkArray,
  collapseText,
  columnLetter,
  describeRowErrors,
  ExcelImportError,
  flattenErrorMessage,
  formatCellForPreview,
  parseContractsExcel,
  type CellValue,
  type ParsedExcel,
} from "@/features/billing/excelImport";
import type { ContractWriteErrors, ImportRow } from "@/features/billing/types";
import { getApiErrorMessage, triggerBlobDownload } from "@/utils/downloadFile";

interface PreviewRow {
  excelRow: number;
  cells: CellValue[];
  row: ImportRow;
  edited: boolean;
}

const PAGE_SIZE = 200;
const CHUNK = Math.min(IMPORT_CHUNK_SIZE, IMPORT_MAX_ROWS_PER_REQUEST);

function ImportExcelPage() {
  const { t } = useTranslation();
  const { canEdit } = useBillingAccess();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [parsed, setParsed] = useState<ParsedExcel | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  /** Saqlangan yoki o'chirilgan qatorlar (Excel qator raqami) */
  const [hidden, setHidden] = useState<Set<number>>(() => new Set());
  const [rowErrors, setRowErrors] = useState<Record<number, ContractWriteErrors>>({});
  const [fileError, setFileError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [importContracts] = useImportContractsExcelMutation();
  const [downloadTemplate, { isLoading: downloading }] = useDownloadImportTemplateMutation();
  const sending = progress !== null;

  const visibleRows = useMemo(() => rows.filter((r) => !hidden.has(r.excelRow)), [rows, hidden]);
  const columns = parsed?.columns ?? [];

  const sectionTitles = useMemo<Record<string, string>>(
    () => ({
      contract: t("billing.import_section_contract"),
      renter: t("billing.import_section_renter"),
      lands: t("billing.import_section_lands"),
      activities: t("billing.import_section_activities"),
      privileges: t("billing.import_section_privileges"),
      action: t("billing.import_section_action"),
      action_products: t("billing.import_section_products"),
      yearly_amounts: t("billing.import_section_yearly"),
      umumiy: t("billing.import_section_general"),
    }),
    [t],
  );

  const describedErrors = useMemo(() => {
    if (!parsed) return [];
    const index = buildColumnIndex(parsed);
    return Object.entries(rowErrors)
      .map(([row, errors]) => ({ excelRow: Number(row), items: describeRowErrors(errors, index, sectionTitles) }))
      .filter((r) => r.items.length && !hidden.has(r.excelRow))
      .sort((a, b) => a.excelRow - b.excelRow);
  }, [parsed, rowErrors, sectionTitles, hidden]);

  const resetAll = () => {
    setParsed(null);
    setRows([]);
    setHidden(new Set());
    setRowErrors({});
    setFileError("");
    setLimit(PAGE_SIZE);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (file: File | undefined) => {
    resetAll();
    if (!file) return;
    setParsing(true);
    try {
      const result = await parseContractsExcel(file);
      const dataRows = result.rows
        .filter((r) => r.kind === "data")
        .map((r) => ({ excelRow: r.excelRow, cells: r.cells, row: r.row, edited: false }));
      setParsed(result);
      setRows(dataRows);
      if (dataRows.length) toast.success(t("billing.import_parsed", { count: dataRows.length }));
      else setFileError(t("billing.import_no_rows"));
    } catch (err) {
      const code = err instanceof ExcelImportError ? err.code : "read_failed";
      const key =
        code === "not_xlsx"
          ? "billing.import_only_xlsx"
          : code === "empty"
            ? "billing.import_empty_file"
            : code === "too_short"
              ? "billing.import_too_short"
              : "billing.import_read_failed";
      setFileError(t(key));
    } finally {
      setParsing(false);
    }
  };

  const handleTemplate = async () => {
    try {
      const { blob, filename } = await downloadTemplate().unwrap();
      triggerBlobDownload(blob, filename);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("billing.import_template_error")));
    }
  };

  const handleDelete = (excelRow: number) => {
    setHidden((prev) => new Set(prev).add(excelRow));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[excelRow];
      return next;
    });
    toast.success(t("billing.import_deleted"));
  };

  const handleSend = async () => {
    if (sending || !canEdit) return;
    const toSend = visibleRows;
    if (!toSend.length) {
      toast.error(t("billing.import_no_rows"));
      return;
    }
    const total = toSend.length;
    const chunks = chunkArray(toSend, CHUNK);
    const savedRows = new Set<number>();
    const collected: Record<number, ContractWriteErrors> = {};
    let done = 0;
    setProgress({ done: 0, total });

    for (const chunk of chunks) {
      try {
        const res = await importContracts({ rows: chunk.map((r) => r.row) }).unwrap();
        (res.saved ?? []).forEach((idx) => {
          const item = chunk[idx];
          if (item) savedRows.add(item.excelRow);
        });
        Object.entries(res.errors ?? {}).forEach(([idx, errors]) => {
          const item = chunk[Number(idx)];
          if (item) collected[item.excelRow] = errors;
        });
      } catch (err) {
        // Qatorga bog'lanmagan xato (server / tarmoq) — guruhning birinchi qatoriga
        const data = (err as { data?: unknown })?.data as { errors?: unknown } | undefined;
        const message =
          (data?.errors ? flattenErrorMessage(data.errors) : "") ||
          getApiErrorMessage(err, t("billing.import_unknown_error"));
        const first = chunk[0].excelRow;
        const last = chunk[chunk.length - 1].excelRow;
        collected[first] = {
          umumiy: { xatolik: t("billing.import_chunk_failed", { from: first, to: last, message }) },
        } as unknown as ContractWriteErrors;
      }
      done += chunk.length;
      setProgress({ done, total });
    }

    setProgress(null);
    const failed = total - savedRows.size;
    if (failed === 0) {
      toast.success(t("billing.import_all_saved", { count: total }));
      resetAll();
      return;
    }
    setHidden((prev) => {
      const next = new Set(prev);
      savedRows.forEach((r) => next.add(r));
      return next;
    });
    setRowErrors(collected);
    toast.error(t("billing.import_partial", { saved: savedRows.size, failed }));
  };

  const editing = editingRow !== null ? rows.find((r) => r.excelRow === editingRow) ?? null : null;

  const headerActions = (
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleTemplate()}
      disabled={downloading}
      className="rounded-xl h-9 border-slate-200 dark:border-slate-700"
    >
      {downloading ? <Loader2 className="animate-spin" /> : <Download />}
      {t("billing.import_template")}
    </Button>
  );

  const progressPct = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <BillingLayout
      title={t("billing.import_title")}
      section={t("billing.contracts_title")}
      backTo={BILLING_ROUTES.contracts}
      actions={headerActions}
    >
      {/* Fayl tanlash */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 shadow-xs backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            id="billing-import-file"
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing || sending}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
          >
            {parsing ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
            {t("billing.import_choose_file")}
          </Button>
          <span className="min-w-0 truncate text-sm text-slate-600 dark:text-slate-300">
            {parsed?.fileName ?? t("billing.import_file_label")}
          </span>
          {parsed && (
            <>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t("billing.import_rows_count", { count: visibleRows.length })}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" variant="outline" onClick={resetAll} disabled={sending} className="rounded-xl">
                  <X />
                  {t("billing.import_clear")}
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={sending || visibleRows.length === 0}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {sending ? <Loader2 className="animate-spin" /> : <Send />}
                    {sending
                      ? t("billing.import_sending", { done: progress?.done ?? 0, total: progress?.total ?? 0 })
                      : t("billing.import_send")}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("billing.import_hint", { chunk: CHUNK })}</p>
        {fileError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{fileError}</p>}
        {progress && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      {/* Xatolar paneli */}
      {describedErrors.length > 0 && (
        <div className="rounded-2xl border-2 border-red-300 dark:border-red-900/70 bg-red-50/70 dark:bg-red-950/30 p-4 space-y-3">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">
            {t("billing.import_errors_title", { count: describedErrors.length })}
          </p>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {describedErrors.map((rowError) => (
              <div
                key={rowError.excelRow}
                className="rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-3"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-red-700 dark:text-red-300">
                    {t("billing.import_error_row", { row: rowError.excelRow })}
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingRow(rowError.excelRow)}
                    className="h-7 rounded-lg text-xs"
                  >
                    <Pencil />
                    {t("billing.import_edit")}
                  </Button>
                </div>
                <ul className="space-y-1">
                  {rowError.items.map((item, idx) => (
                    <li key={idx} className="text-[13px] leading-snug text-red-800 dark:text-red-200">
                      {item.section && <span>{item.section} → </span>}
                      {item.column && <strong>{item.column}: </strong>}
                      <span>{item.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ko'rib chiqish jadvali */}
      {parsed && visibleRows.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xs">
          {hidden.size > 0 && (
            <p className="px-4 pt-3 text-xs text-slate-500 dark:text-slate-400">
              {t("billing.import_hidden_rows", { count: hidden.size })}
            </p>
          )}
          <div className="relative max-h-[70vh] overflow-auto rounded-2xl">
            <table className="min-w-max border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-2 text-center font-bold text-slate-700 dark:text-slate-200">
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.index}
                      title={col.key ?? undefined}
                      className="sticky top-0 z-20 w-[150px] min-w-[110px] max-w-[220px] border-b border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-2 text-left align-top font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <span className="mb-0.5 block text-[10px] font-medium text-slate-400">{columnLetter(col.index)}</span>
                      <span className="line-clamp-3 whitespace-normal">
                        {col.label || collapseText(col.key) || "—"}
                      </span>
                    </th>
                  ))}
                  <th className="sticky right-0 top-0 z-30 border-b border-l border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-2 text-center font-bold text-slate-700 dark:text-slate-200">
                    {t("billing.import_actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.slice(0, limit).map((r) => {
                  const hasError = !!rowErrors[r.excelRow];
                  const rowBg = hasError ? "bg-red-50 dark:bg-red-950/40" : "bg-white dark:bg-slate-900";
                  return (
                    <tr key={r.excelRow} className={cn("group", hasError && "text-red-900 dark:text-red-100")}>
                      <td
                        title={t("billing.import_excel_row")}
                        className={cn(
                          "sticky left-0 z-10 border-b border-r border-slate-200 dark:border-slate-800 px-2 py-1.5 text-center font-bold tabular-nums",
                          rowBg,
                          hasError && "border-l-4 border-l-red-500",
                        )}
                      >
                        {r.excelRow}
                        {r.edited && (
                          <span className="ml-1 rounded bg-amber-100 dark:bg-amber-900/50 px-1 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                            {t("billing.import_edited")}
                          </span>
                        )}
                      </td>
                      {columns.map((col) => {
                        const text = formatCellForPreview(r.cells[col.index] ?? null, col);
                        return (
                          <td
                            key={col.index}
                            title={text}
                            className={cn(
                              "max-w-[220px] border-b border-r border-slate-100 dark:border-slate-800 px-2 py-1.5 align-top text-slate-700 dark:text-slate-200",
                              rowBg,
                            )}
                          >
                            <span className="line-clamp-2 whitespace-normal break-words">{text}</span>
                          </td>
                        );
                      })}
                      <td
                        className={cn(
                          "sticky right-0 z-10 border-b border-l border-slate-200 dark:border-slate-800 px-2 py-1",
                          rowBg,
                        )}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={t("billing.import_edit")}
                            aria-label={t("billing.import_edit")}
                            disabled={sending}
                            onClick={() => setEditingRow(r.excelRow)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700"
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={t("billing.import_delete")}
                            aria-label={t("billing.import_delete")}
                            disabled={sending}
                            onClick={() => handleDelete(r.excelRow)}
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleRows.length > limit && (
            <div className="flex justify-center p-3">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                {t("billing.import_show_more", { count: Math.min(PAGE_SIZE, visibleRows.length - limit) })}
              </Button>
            </div>
          )}
        </div>
      )}

      <ImportRowEditDialog
        open={editing !== null}
        excelRow={editing?.excelRow ?? null}
        row={editing?.row ?? null}
        errors={editing ? rowErrors[editing.excelRow] : null}
        onOpenChange={(open) => {
          if (!open) setEditingRow(null);
        }}
        onSave={(next) => {
          if (!editing) return;
          setRows((prev) => prev.map((r) => (r.excelRow === editing.excelRow ? { ...r, row: next, edited: true } : r)));
          toast.success(t("billing.import_row_saved"));
        }}
      />
    </BillingLayout>
  );
}

export default ImportExcelPage;
