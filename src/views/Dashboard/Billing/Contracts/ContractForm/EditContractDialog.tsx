// Shartnomani tahrirlash dialogi (billing ContractEditModal.vue porti) —
// ContractsPage / ContractDetailPage (ContractDialogs) ishlatadi.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ContractForm from "./ContractForm";

export interface EditContractDialogProps {
  open: boolean;
  contractId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function EditContractDialog({ open, contractId, onOpenChange, onSaved }: EditContractDialogProps) {
  const { t } = useTranslation();
  // Yopilish animatsiyasi paytida (contractId null bo'lib qolganda) forma yo'qolib ketmasin
  const [shownId, setShownId] = useState<string | null>(contractId);
  useEffect(() => {
    if (contractId) setShownId(contractId);
  }, [contractId]);

  const id = contractId ?? shownId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-[96vw] overflow-y-auto rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:max-w-5xl sm:p-6 xl:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("billing.form_edit_title")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("billing.form_edit_title")}</DialogDescription>
        </DialogHeader>
        {open && id && (
          <ContractForm
            key={id}
            mode="edit"
            contractId={id}
            layout="dialog"
            onClose={() => onOpenChange(false)}
            onUpdated={() => {
              onSaved?.();
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EditContractDialog;
