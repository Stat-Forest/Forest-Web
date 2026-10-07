import { useTranslation } from "react-i18next";
import { skipToken } from "@reduxjs/toolkit/query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ContractListItem } from "@/features/billing/types";
import { formatCoord, toNumberOrNull } from "@/features/billing/format";
import { useGetContractQuery } from "@/services/billingApi";
import ContractMap from "../components/ContractMap";
import { DIALOG_CONTENT, DIALOG_DESC, DIALOG_TITLE } from "./dialogStyles";

interface LocationDialogProps {
  open: boolean;
  contract: ContractListItem | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Joylashuv: qizil pinlar (ko'p poligonda — har biriga). Ro'yxatda `boundary_geojson`
 * yo'q, shu sababli ochilganda detail so'raladi; kelguncha lat/lng bilan chiziladi.
 */
function LocationDialog({ open, contract, onOpenChange }: LocationDialogProps) {
  const { t } = useTranslation();
  const { data: detail, isFetching } = useGetContractQuery(open && contract ? contract.id : skipToken);
  const source = detail ?? contract;
  const lat = toNumberOrNull(source?.latitude);
  const lng = toNumberOrNull(source?.longitude);
  const hasBoundary = !!detail?.boundary_geojson || !!contract?.has_boundary;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[900px] ${DIALOG_CONTENT}`}>
        <DialogHeader>
          <DialogTitle className={`${DIALOG_TITLE} flex items-center gap-2`}>
            {t("billing.contracts_location_title")}
            {isFetching && <Loader2 size={16} className="animate-spin text-slate-400" />}
          </DialogTitle>
          <DialogDescription className={DIALOG_DESC}>
            {t("billing.contract_detail")} № {contract?.contract_number || contract?.number || ""}
            {lat !== null && lng !== null ? ` · ${formatCoord(lat)}, ${formatCoord(lng)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {source && (lat !== null || hasBoundary) ? (
          <ContractMap contract={source} mode="location" height={550} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">{t("billing.contracts_no_location")}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default LocationDialog;
