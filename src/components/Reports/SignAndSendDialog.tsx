// Hisobotni E-imzo bilan imzolab yuborish oynasi (tashkilot rahbari uchun).
// Oqim: /send/challenge/ dan hujjat matni -> E-imzo imzosi -> /send/ (pkcs7 bilan)
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Loader2, PenLine, Usb } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSendReportMutation, useSignChallengeMutation } from "@/services/reportsApi";
import { SignMethod, useEimzoSigner } from "@/utils/useEimzoSigner";

interface Props {
  reportId: string;
  onSent?: () => void;
}

function apiErrorMessage(error: any, fallback: string): string {
  if (error?.status === 403 || error?.originalStatus === 403 || error?.status === 401) {
    return "Buyruq bajarish uchun sizda ruxsat yo'q";
  }
  const data = error?.data;
  if (typeof data === "string") return data;
  return data?.detail || data?.err_msg || data?.message || error?.message || fallback;
}

export default function SignAndSendDialog({ reportId, onSent }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<SignMethod>("pfx");
  const [busy, setBusy] = useState(false);

  const signer = useEimzoSigner(open, t);
  const [signChallenge] = useSignChallengeMutation();
  const [sendReport] = useSendReportMutation();

  const handleSign = async () => {
    setBusy(true);
    try {
      const challenge = await signChallenge({ id: reportId }).unwrap();
      const pkcs7 = await signer.sign(challenge.document, method);
      await sendReport({ id: reportId, pkcs7 }).unwrap();
      toast.success(t("report_signed_sent"));
      setOpen(false);
      onSent?.();
    } catch (error: any) {
      toast.error(apiErrorMessage(error, t("sign_failed")));
    } finally {
      setBusy(false);
    }
  };

  const canSign = !busy && !signer.error && (method === "usb" || (signer.ready && !!signer.selectedKey));

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-[40px] px-4 font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95"
      >
        <PenLine className="w-4 h-4 mr-1.5" />
        {t("sign_and_send")}
      </Button>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sign_dialog_title")}</DialogTitle>
            <DialogDescription>{t("sign_dialog_desc")}</DialogDescription>
          </DialogHeader>

          <Tabs value={method} onValueChange={(v) => setMethod(v as SignMethod)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pfx">{t("sign_method_pfx")}</TabsTrigger>
              <TabsTrigger value="usb">{t("sign_method_usb")}</TabsTrigger>
            </TabsList>

            <TabsContent value="pfx" className="space-y-3 pt-2">
              {signer.loading ? (
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}
                </p>
              ) : signer.keys.length > 0 ? (
                <div>
                  <Label htmlFor="sign-key" className="mb-2 block">
                    {t("select_certificate")}
                  </Label>
                  <select
                    id="sign-key"
                    value={signer.selectedKey}
                    onChange={(e) => signer.setSelectedKey(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    disabled={busy}
                  >
                    {signer.keys.map((key) => (
                      <option key={key.id} value={key.id} disabled={key.disabled}>
                        {key.label}
                        {key.disabled && ` (${t("expired")})`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                !signer.error && <p className="text-sm text-slate-500">{t("no_certificates")}</p>
              )}
            </TabsContent>

            <TabsContent value="usb" className="pt-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-lg p-4 text-sm text-emerald-700 dark:text-emerald-300">
                <Usb className="w-4 h-4 inline mr-1.5" />
                {t("usb_hint")}
              </div>
            </TabsContent>
          </Tabs>

          {signer.error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg p-3">
              {signer.error}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSign}
              disabled={!canSign}
              className="bg-[#00BC7D] hover:bg-[#00a36c] text-white"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("signing_in_progress")}
                </>
              ) : (
                t("sign_and_send")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
