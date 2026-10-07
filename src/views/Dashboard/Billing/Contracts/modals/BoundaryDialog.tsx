import { useState } from "react";
import { useTranslation } from "react-i18next";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "react-toastify";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContractListItem } from "@/features/billing/types";
import { downloadBoundaryKmz } from "@/features/billing/geo";
import { useGetContractQuery } from "@/services/billingApi";
import ContractMap from "../components/ContractMap";
import { DIALOG_CONTENT, DIALOG_DESC, DIALOG_TITLE, OUTLINE_BTN, PRIMARY_BTN } from "./dialogStyles";

interface BoundaryDialogProps {
  open: boolean;
  contract: ContractListItem | null;
  onOpenChange: (open: boolean) => void;
}

/** Yer chegarasi (boundary_geojson) xaritada + "KMZ yuklab olish". */
function BoundaryDialog({ open, contract, onOpenChange }: BoundaryDialogProps) {
  const { t } = useTranslation();
  const { data: detail, isLoading, isError } = useGetContractQuery(open && contract ? contract.id : skipToken);
  const [downloading, setDownloading] = useState(false);
  const number = contract?.contract_number || contract?.number || "";

  const downloadKmz = async () => {
    if (!detail?.boundary_geojson) return;
    setDownloading(true);
    try {
      await downloadBoundaryKmz(detail.boundary_geojson, number);
    } catch {
      toast.error(t("billing.contracts_kmz_error"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[900px] ${DIALOG_CONTENT}`}>
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE}>{t("billing.contracts_boundary_title")}</DialogTitle>
          <DialogDescription className={DIALOG_DESC}>
            {t("billing.contract_detail")} № {number}
            {contract?.xojalik_name ? ` · ${contract.xojalik_name}` : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-[500px] w-full rounded-xl" />
        ) : isError ? (
          <p className="text-sm text-red-600 dark:text-red-400 py-8 text-center">{t("billing.load_error")}</p>
        ) : detail?.boundary_geojson ? (
          <ContractMap contract={detail} mode="boundary" height={500} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">{t("billing.contracts_no_boundary")}</p>
        )}

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="outline" className={OUTLINE_BTN} onClick={() => onOpenChange(false)}>
            {t("billing.close")}
          </Button>
          <Button type="button" className={PRIMARY_BTN} disabled={!detail?.boundary_geojson || downloading} onClick={downloadKmz}>
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {t("billing.contracts_kmz_download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BoundaryDialog;
