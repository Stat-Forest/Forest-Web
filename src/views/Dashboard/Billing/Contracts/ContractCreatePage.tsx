import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BILLING_ROUTES } from "@/features/billing/constants";
import BillingLayout from "../BillingLayout";
import ContractForm from "./ContractForm/ContractForm";

/** /billing/contracts/create — faqat canEdit (BillingEditRoute bilan o'ralgan). */
function ContractCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [confirmClose, setConfirmClose] = useState(false);

  return (
    <BillingLayout title={t("billing.create_contract")} section={t("billing.contracts_title")} backTo={BILLING_ROUTES.contracts}>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-3 sm:p-5 shadow-xs backdrop-blur-md">
        <ContractForm
          mode="create"
          layout="page"
          onClose={() => setConfirmClose(true)}
          onCreated={(_detail, again) => {
            if (!again) navigate(BILLING_ROUTES.contracts);
          }}
        />
      </div>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent className="rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">
              {t("billing.form_close_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("billing.form_close_confirm_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("billing.form_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={() => navigate(BILLING_ROUTES.contracts)}
            >
              {t("billing.form_confirm_close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BillingLayout>
  );
}

export default ContractCreatePage;
