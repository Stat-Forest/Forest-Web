import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ContractListItem } from "@/features/billing/types";
import ContractFileUploadFields from "../components/ContractFileUploadFields";
import { DIALOG_CONTENT, DIALOG_DESC, DIALOG_TITLE, OUTLINE_BTN } from "./dialogStyles";

interface UploadFileDialogProps {
  open: boolean;
  contract: ContractListItem | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/** ⋮ → "Fayl yuklash": shartnoma raqami ko'rsatiladi, fayl + izoh. */
function UploadFileDialog({ open, contract, onOpenChange, onDone }: UploadFileDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[520px] ${DIALOG_CONTENT}`}>
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE}>{t("billing.contracts_upload_title")}</DialogTitle>
          <DialogDescription className={DIALOG_DESC}>
            {t("billing.contracts_upload_desc", { number: contract?.contract_number || contract?.number || "" })}
          </DialogDescription>
        </DialogHeader>
        {contract && (
          <ContractFileUploadFields
            contractId={contract.id}
            autoFocus
            onUploaded={() => {
              onOpenChange(false);
              onDone?.();
            }}
            extraActions={
              <Button type="button" variant="outline" className={OUTLINE_BTN} onClick={() => onOpenChange(false)}>
                {t("billing.contracts_back")}
              </Button>
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default UploadFileDialog;
