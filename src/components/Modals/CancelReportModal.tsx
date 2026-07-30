import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCancelReportMutation } from "@/services/reportsApi"; // ✅ mutation import qilindi

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  reportId: string;
};

export default function CancelReportModal({ open, setOpen, reportId }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [cancelReport, { isLoading }] = useCancelReportMutation(); // ✅ mutation ishlatilmoqda

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!reason.trim()) {
      setError("Sababni yozish majburiy");
      return;
    }

    try {
      await cancelReport({
        id: reportId,
        cancel_reason: reason,
      }).unwrap();

      alert("Hisobot qaytarildi");
      setReason("");
      setOpen(false);
    } catch (err: any) {
      const isForbidden =
        err?.status === 403 || err?.originalStatus === 403 || err?.status === 401;
      const msg = isForbidden
        ? "Buyruq bajarish uchun sizda ruxsat yo'q"
        : err?.data?.detail || err?.data?.message || "Xatolik yuz berdi";
      setError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-6 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left text-lg font-semibold">
            Hisobot qaytarilgani sababini yozing
          </DialogTitle>
          <DialogDescription>
            Hisobotni qaytarish sababini kiriting
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <textarea
            className="w-full border rounded-md p-3 text-sm resize-none min-h-[170px] focus:outline-none focus:ring focus:ring-blue-300 placeholder:text-gray-400"
            placeholder="Sababni shu yerga yozing"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white min-h-[40px]"
          >
            {isLoading ? "Yuborilmoqda..." : "Jonatish"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
