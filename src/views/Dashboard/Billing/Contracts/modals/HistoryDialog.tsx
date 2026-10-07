import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ContractListItem } from "@/features/billing/types";
import ContractHistoryList from "../components/ContractHistoryList";
import { DIALOG_CONTENT, DIALOG_DESC, DIALOG_TITLE } from "./dialogStyles";

interface HistoryDialogProps {
  open: boolean;
  contract: ContractListItem | null;
  onOpenChange: (open: boolean) => void;
}

/** Shartnoma tarixi dialogi. */
function HistoryDialog({ open, contract, onOpenChange }: HistoryDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[720px] max-h-[90vh] overflow-y-auto ${DIALOG_CONTENT}`}>
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE}>{t("billing.contracts_history_title")}</DialogTitle>
          <DialogDescription className={DIALOG_DESC}>
            {t("billing.contract_detail")} № {contract?.contract_number || contract?.number || ""}
          </DialogDescription>
        </DialogHeader>
        {contract && <ContractHistoryList contractId={contract.id} />}
      </DialogContent>
    </Dialog>
  );
}

export default HistoryDialog;
