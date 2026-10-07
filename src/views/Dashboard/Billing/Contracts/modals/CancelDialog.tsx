import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContractListItem } from "@/features/billing/types";
import { useChangeContractStatusMutation } from "@/services/billingApi";
import { getApiErrorMessage } from "@/utils/downloadFile";
import { DIALOG_CONTENT, DIALOG_DESC, DIALOG_TITLE, LABEL, OUTLINE_BTN } from "./dialogStyles";

const MAX_REASON = 500;

interface CancelDialogProps {
  open: boolean;
  contract: ContractListItem | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/** Shartnomani bekor qilish — sabab majburiy (≤500), `status: inactive`. */
function CancelDialog({ open, contract, onOpenChange, onDone }: CancelDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [changeStatus, { isLoading }] = useChangeContractStatusMutation();

  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open, contract?.id]);

  const trimmed = reason.trim();
  const invalid = trimmed.length === 0 || trimmed.length > MAX_REASON;

  const submit = async () => {
    setTouched(true);
    if (!contract || invalid) return;
    try {
      await changeStatus({ id: contract.id, body: { status: "inactive", cancel_reason: trimmed } }).unwrap();
      toast.success(t("billing.contracts_cancel_success"));
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("billing.contracts_status_error")));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isLoading && onOpenChange(o)}>
      <DialogContent className={`sm:max-w-[520px] ${DIALOG_CONTENT}`}>
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE}>{t("billing.contracts_cancel_title")}</DialogTitle>
          <DialogDescription className={DIALOG_DESC}>
            {t("billing.contracts_cancel_desc", { number: contract?.contract_number || contract?.number || "" })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className={LABEL}>
            {t("billing.contracts_cancel_reason")} <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={reason}
            maxLength={MAX_REASON}
            rows={4}
            autoFocus
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("billing.contracts_cancel_reason_ph")}
            aria-invalid={touched && invalid}
            className="rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm resize-none"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-red-600 dark:text-red-400">
              {touched && invalid ? t("billing.contracts_cancel_reason_required") : ""}
            </span>
            <span className="text-slate-400">
              {trimmed.length}/{MAX_REASON}
            </span>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="outline" className={OUTLINE_BTN} disabled={isLoading} onClick={() => onOpenChange(false)}>
            {t("billing.contracts_back")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white"
            disabled={isLoading}
            onClick={submit}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
            {t("billing.contracts_cancel_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CancelDialog;
