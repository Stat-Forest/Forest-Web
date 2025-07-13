import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  reportId: string; // agar hisobot ID kerak bo‘lsa
};

export default function CancelReportModal({ open, setOpen, reportId }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Bu yerga RTK Query mutation hookni qo‘shing (misol: useCancelReportMutation)
  // const [cancelReport] = useCancelReportMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!reason.trim()) {
      setError("Sababni yozish majburiy");
      return;
    }

    try {
      setIsLoading(true);

      // Backendga so‘rov yuborish (agar kerak bo‘lsa):
      // await cancelReport({ id: reportId, reason }).unwrap();

      alert("Hisobot muvaffaqiyatli qaytarildi");
      setReason("");
      setOpen(false);
    } catch (err: any) {
      const msg = err?.data?.message || "Xatolik yuz berdi";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-6 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left text-lg font-semibold">
            Hisobot qaytarilgani sababini yozing
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <textarea
            className="w-full border rounded-md p-3 text-sm resize-none min-h-[170px] focus:outline-none focus:ring focus:ring-green-300 placeholder:text-gray-400"
            placeholder="Sababni shu yerga yozing"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#09B86F] hover:bg-[#09B86F] text-white min-h-[40px]"
          >
            {isLoading ? "Yuborilmoqda..." : "Jonatish"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
