import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ContractListItem } from "@/features/billing/types";
import ContractFilesList from "../components/ContractFilesList";
import { DIALOG_CONTENT, DIALOG_DESC, DIALOG_TITLE } from "./dialogStyles";

interface FilesDialogProps {
  open: boolean;
  contract: ContractListItem | null;
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Shartnoma fayllari: ro'yxat, ko'rish/yuklab olish, o'chirish, yangi fayl yuklash. */
function FilesDialog({ open, contract, canEdit, onOpenChange }: FilesDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[760px] max-h-[90vh] overflow-y-auto ${DIALOG_CONTENT}`}>
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE}>{t("billing.contracts_files_title")}</DialogTitle>
          <DialogDescription className={DIALOG_DESC}>
            {t("billing.contract_detail")} № {contract?.contract_number || contract?.number || ""}
            {contract?.renter?.full_name ? ` · ${contract.renter.full_name}` : ""}
          </DialogDescription>
        </DialogHeader>
        {contract && <ContractFilesList contractId={contract.id} canEdit={canEdit} />}
      </DialogContent>
    </Dialog>
  );
}

export default FilesDialog;
