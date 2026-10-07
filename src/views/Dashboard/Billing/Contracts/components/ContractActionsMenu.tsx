import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  Eye,
  FileUp,
  History,
  MoreVertical,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BILLING_ROUTES } from "@/features/billing/constants";
import type { ContractListItem } from "@/features/billing/types";
import type { OpenContractDialog } from "./contractDialogTypes";

interface ContractActionsMenuProps {
  contract: ContractListItem;
  canEdit: boolean;
  onOpen: OpenContractDialog;
  /** Detail sahifada "Ko'rish" bandi ko'rsatilmaydi. */
  hideView?: boolean;
}

/** ⋮ amallar menyusi (o'ngga tekislangan). */
function ContractActionsMenu({ contract, canEdit, onOpen, hideView }: ContractActionsMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isActive = contract.status === "active";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-no-row-click
          aria-label={t("billing.contracts_col_actions")}
          onClick={(e) => e.stopPropagation()}
          className="size-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <MoreVertical size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[220px] rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {!hideView && (
          <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate(BILLING_ROUTES.detail(contract.id))}>
            <Eye />
            {t("billing.contracts_action_view")}
          </DropdownMenuItem>
        )}
        {canEdit && (
          <>
            <DropdownMenuItem className="cursor-pointer" onSelect={() => onOpen("edit", contract)}>
              <Pencil />
              {t("billing.contracts_action_edit")}
            </DropdownMenuItem>
            {isActive ? (
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onSelect={() => onOpen("cancel", contract)}
              >
                <Ban />
                {t("billing.contracts_action_cancel")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="cursor-pointer" onSelect={() => onOpen("reactivate", contract)}>
                <CheckCircle2 className="text-emerald-600" />
                {t("billing.contracts_action_reactivate")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer" onSelect={() => onOpen("transfer", contract)}>
              <ArrowLeftRight />
              {t("billing.contracts_action_transfer")}
            </DropdownMenuItem>
            {isActive && (
              <DropdownMenuItem className="cursor-pointer" onSelect={() => onOpen("upload", contract)}>
                <FileUp />
                {t("billing.contracts_action_upload")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem className="cursor-pointer" onSelect={() => onOpen("history", contract)}>
          <History />
          {t("billing.contracts_action_history")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ContractActionsMenu;
