import { useState, useEffect } from "react";
import { useChangePasswordMutation } from "@/services/authApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const { t, i18n } = useTranslation();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  useEffect(() => {
    if (!open) {
      document.body.style.pointerEvents = "auto";
      document.body.removeAttribute("data-scroll-locked");
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = "auto";
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      document.body.style.pointerEvents = "auto";
      document.body.removeAttribute("data-scroll-locked");
      setTimeout(() => {
        document.body.style.pointerEvents = "auto";
      }, 50);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(
        i18n.language === "ru"
          ? "Все поля обязательны для заполнения"
          : "Barcha maydonlar to‘ldirilishi shart"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        i18n.language === "ru"
          ? "Новые пароли не совпадают"
          : "Yangi parollar bir-biriga mos emas"
      );
      return;
    }

    try {
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }).unwrap();

      alert(
        i18n.language === "ru"
          ? "Пароль успешно изменён"
          : "Parol muvaffaqiyatli o‘zgartirildi"
      );

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      handleOpenChange(false);
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        (i18n.language === "ru" ? "Произошла ошибка" : "Xatolik yuz berdi");
      setError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent  className="p-8">
        <DialogHeader>
          <DialogTitle>{t("item_81")}</DialogTitle>
          <DialogDescription>
            {i18n.language === "ru"
              ? "Введите данные для изменения пароля"
              : "Parolingizni o'zgartirish uchun ma'lumotlarni kiriting"}
          </DialogDescription>
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
            {isLoading
              ? i18n.language === "ru"
                ? "Отправка..."
                : "Yuborilmoqda..."
              : t("changePassword")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
