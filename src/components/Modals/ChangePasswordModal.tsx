import { useState } from "react";
import { useChangePasswordMutation } from "@/services/authApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function ChangePasswordModal({ open, setOpen }: Props) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { t } = useTranslation();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Barcha maydonlar to‘ldirilishi shart");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Yangi parollar bir-biriga mos emas");
      return;
    }

    try {
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }).unwrap();

      alert("Parol muvaffaqiyatli o‘zgartirildi");

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOpen(false);
    } catch (err: any) {
      const msg = err?.data?.message || "Xatolik yuz berdi";
      setError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent  className="p-8">
        <DialogHeader>
          <DialogTitle>{t("item_81")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder={t("currentPassword")}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder={t("newPassword")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder={t("confirmPassword")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button type="submit" disabled={isLoading} className="w-full bg-[#3B82F6] min-h-[40px] hover:bg-[#2563EB]">
            {isLoading ? "Yuborilmoqda..." : t("changePassword")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
