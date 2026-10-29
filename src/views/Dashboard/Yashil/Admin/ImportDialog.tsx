/**
 * Excel import: fayl → «Текшириш» (dry-run, hech narsa yozilmaydi) → natija (yangi / yangilanadi / xatolar)
 * → xato bo'lmasa «Тасдиқлаш ва ёзиш». Server hammasi yoki hech narsa tamoyilida ishlaydi.
 */
import { useState } from "react";
import { toast } from "react-toastify";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import type { ImportKind, ImportResultOut } from "@/features/yashil/types";
import { useRunYashilImportMutation } from "@/services/yashilApi";
import { apiErrorText } from "../Orders/orderUi";

const COLS: Record<ImportKind, YashilKey> = {
  mahallas: "import_cols_mahallas",
  assignments: "import_cols_assignments",
  routes: "import_cols_routes",
  calendar: "import_cols_calendar",
  opening: "import_cols_opening",
};

export function ImportDialog({ kind, title, withSource, onClose }: { kind: ImportKind; title: string; withSource?: boolean; onClose: () => void }) {
  const { t } = useYashilT();
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [result, setResult] = useState<ImportResultOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, { isLoading }] = useRunYashilImportMutation();

  const go = async (dryRun: boolean) => {
    if (!file) return;
    setError(null);
    try {
      const res = await run({ kind, file, dryRun, source: source || undefined }).unwrap();
      setResult(res);
      if (!dryRun && res.applied) {
        toast.success(`${t("import_done")}: ${res.created} ${t("import_created")}, ${res.updated} ${t("import_updated")}`);
        onClose();
      }
    } catch (e) {
      const data = (e as { data?: Partial<ImportResultOut> })?.data;
      if (data && Array.isArray(data.errors)) setResult(data as ImportResultOut);
      setError(apiErrorText(e, t("error_generic")));
    }
  };

  const canApply = !!file && !!result && result.dry_run && result.error_count === 0 && result.created + result.updated > 0;
  return (
    <Dialog open onOpenChange={(v) => !v && !isLoading && onClose()}>
      <DialogContent className="yashil-root max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("import_hint")}</DialogDescription>
        </DialogHeader>
        <div className="text-xs ym-muted"><span className="font-semibold">{t("import_columns")}:</span> {t(COLS[kind])}</div>
        <label className="text-sm block">.xlsx (≤ 10 MB)
          <input type="file" accept=".xlsx" className="ym-select w-full mt-1" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(null); }} />
        </label>
        {withSource && (
          <label className="text-sm block">{t("import_source")}
            <input className="ym-select w-full mt-1" value={source} maxLength={300} onChange={(e) => { setSource(e.target.value); setResult(null); }} />
          </label>
        )}
        {result && (
          <div className="ym-card !p-3 space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className="ym-badge">{result.created} {t("import_created")}</span>
              <span className="ym-badge ym-badge--blue">{result.updated} {t("import_updated")}</span>
              <span className="ym-badge">{result.unchanged} {t("import_unchanged")}</span>
              <span className={`ym-badge ${result.error_count ? "ym-badge--red" : ""}`}>{result.error_count} {t("import_errors")}</span>
            </div>
            {result.errors.length > 0 && (
              <ul className="max-h-48 overflow-auto text-xs space-y-1">
                {result.errors.map((e, i) => <li key={i}><span className="font-semibold">{e.row}-{t("import_row")}:</span> {e.message}</li>)}
              </ul>
            )}
          </div>
        )}
        {error && !result && <p className="text-sm text-[var(--ym-red)] bg-[var(--ym-red-bg)] rounded-lg p-3">{error}</p>}
        <DialogFooter>
          <button type="button" className="ym-btn" onClick={onClose} disabled={isLoading}>{t("cancel")}</button>
          <button type="button" className="ym-btn" onClick={() => go(true)} disabled={!file || isLoading}>{t("import_check")}</button>
          <button type="button" className="ym-btn ym-btn--primary" onClick={() => go(false)} disabled={!canApply || isLoading}>{t("import_apply")}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
