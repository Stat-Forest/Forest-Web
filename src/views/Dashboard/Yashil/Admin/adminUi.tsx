/** Admin ekranlari uchun umumiy bo'laklar: sahifalash, holat belgisi, davr matni, saqlash yordamchisi, dialog qobig'i. */
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "react-toastify";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useYashilT } from "@/features/yashil/i18n";
import { apiErrorField, apiErrorText, fmtDate } from "../Orders/orderUi";

export function Pager({ page, count, perPage, onPage }: { page: number; count: number; perPage: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / perPage));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <button type="button" className="ym-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
      <span className="ym-muted">{page} / {pages}</span>
      <button type="button" className="ym-btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  );
}

export function ActiveBadge({ active, current = true }: { active: boolean; current?: boolean }) {
  const { t } = useYashilT();
  if (!active) return <span className="ym-badge ym-badge--red">{t("status_inactive")}</span>;
  if (!current) return <span className="ym-badge ym-badge--amber">{t("status_expired")}</span>;
  return <span className="ym-badge">{t("status_active")}</span>;
}

export const periodText = (from: string | null | undefined, to: string | null | undefined) => `${fmtDate(from)} — ${to ? fmtDate(to) : "…"}`;

/** Saqlash: muvaffaqiyatda toast + `onDone`, xatoda matn va maydon nomi qaytadi. */
export function useSave() {
  const { t } = useYashilT();
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>, onDone?: () => void) => {
    setError(null);
    setField(null);
    try {
      await fn();
      toast.success(t("saved"));
      onDone?.();
      return true;
    } catch (e) {
      setError(apiErrorText(e, t("error_generic")));
      setField(apiErrorField(e));
      return false;
    }
  };
  return { error, field, run, reset: () => { setError(null); setField(null); } };
}

export const inputCls = (bad: boolean) => `ym-select w-full mt-1 ${bad ? "border-[var(--ym-red)]" : ""}`;

export function FormDialog({ title, description, open, onClose, onSave, saving, disabled, error, children, wide }: {
  title: string; description?: string; open: boolean; onClose: () => void; onSave: () => void; saving?: boolean;
  disabled?: boolean; error?: string | null; children: ReactNode; wide?: boolean;
}) {
  const { t } = useYashilT();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className={`yashil-root max-h-[90vh] overflow-y-auto ${wide ? "sm:max-w-2xl" : ""}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">{children}</div>
        {error && <p className="text-sm text-[var(--ym-red)] bg-[var(--ym-red-bg)] rounded-lg p-3">{error}</p>}
        <DialogFooter>
          <button type="button" className="ym-btn" onClick={onClose} disabled={saving}>{t("cancel")}</button>
          <button type="button" className="ym-btn ym-btn--primary" onClick={onSave} disabled={saving || disabled}>{t("save")}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
