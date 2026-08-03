import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onConfirm: () => void;
};

export default function LogoutConfirmModal({ open, setOpen, onConfirm }: Props) {
  const { i18n } = useTranslation();
  const isRu = i18n.language === "ru";

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

  const handleConfirm = () => {
    handleOpenChange(false);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-6 max-w-md rounded-2xl dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
            <LogOut size={26} />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isRu ? "Вы действительно хотите выйти?" : "Tizimdan chiqmoqchimisiz?"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            {isRu
              ? "Если вы выйдете из системы, вам потребуется снова ввести данные для входа."
              : "Akkauntdan chiqsangiz qayta kirish uchun loginingizni kiritishingiz kerak bo'ladi."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="flex-1 h-11 rounded-xl font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isRu ? "Отмена" : "Bekor qilish"}
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-11 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
          >
            {isRu ? "Выйти" : "Chiqish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
