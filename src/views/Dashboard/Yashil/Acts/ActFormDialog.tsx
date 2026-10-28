/** Yetkazishni qayd etish va akt qoralamasi / tuzatish (TZ §10.1, §10.3): sana, mas'ul, izoh, qatorlar (qolgan hajm doirasida). */
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pickName, useYashilT } from "@/features/yashil/i18n";
import type { ActDetail, ActWrite, OrderDetail } from "@/features/yashil/types";
import { newIdempotencyKey, useCreateYashilActMutation, useUpdateYashilActMutation } from "@/services/yashilApi";
import { apiErrorField, apiErrorText, todayIso } from "../Orders/orderUi";

interface Props {
  order: OrderDetail;
  /** Berilsa — mavjud aktni tahrirlash (qoralama joyida, qaytarilgan — yangi versiya). */
  act?: ActDetail | null;
  onClose: () => void;
  onDone: (act: ActDetail) => void;
}

interface LineDraft {
  order_line: string;
  name: string;
  unit: string;
  ordered: string;
  remaining: string;
  qty: string;
}

function ActFormDialog({ order, act, onClose, onDone }: Props) {
  const { t, script } = useYashilT();
  const cv = act?.current_version ?? null;
  const [deliveryDate, setDeliveryDate] = useState(cv?.delivery_date ?? todayIso());
  const [responsible, setResponsible] = useState(cv?.responsible ?? order.executor_name ?? "");
  const [address, setAddress] = useState(cv?.delivery_address ?? "");
  const [note, setNote] = useState(cv?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [idemKey] = useState(() => newIdempotencyKey());
  const [create, { isLoading: creating }] = useCreateYashilActMutation();
  const [update, { isLoading: updating }] = useUpdateYashilActMutation();

  const initial = useMemo<LineDraft[]>(() => {
    const prev = new Map((cv?.lines ?? []).map((l) => [l.order_line, l.qty]));
    return order.lines.map((l) => {
      // Qaytarilgan aktning o'z hajmi qolgan hajmga kirmaydi (u hali qabul qilinmagan), shuning uchun remaining o'zgarmaydi.
      const remaining = l.remaining_qty ?? l.qty;
      return { order_line: l.id, name: pickName(l.catalog_item, script), unit: l.unit_cyr, ordered: l.qty, remaining, qty: prev.get(l.id) ?? (Number(remaining) > 0 && !act ? remaining : "0") };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, act?.id]);
  const [lines, setLines] = useState<LineDraft[]>(initial);

  const body = (): ActWrite => ({
    delivery_date: deliveryDate,
    responsible,
    delivery_address: address,
    note,
    lines: lines.filter((l) => Number(l.qty) > 0).map((l) => ({ order_line: l.order_line, qty: l.qty })),
  });

  const submit = async () => {
    setError(null);
    setErrorField(null);
    try {
      const res = act ? await update({ id: act.id, body: body() }).unwrap() : await create({ orderId: order.id, body: body(), key: idemKey }).unwrap();
      toast.success(t("saved"));
      onDone(res);
    } catch (e) {
      setError(apiErrorText(e, t("error_generic")));
      setErrorField(apiErrorField(e));
    }
  };

  const busy = creating || updating;
  const anyQty = lines.some((l) => Number(l.qty) > 0);

  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="yashil-root sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{act ? t("act_edit_title") : t("act_form_title")}</DialogTitle>
          <DialogDescription>{order.display_number} · {t("act_form_hint")}</DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm block">{t("delivery_date")} *
            <input type="date" className={`ym-select w-full mt-1 ${errorField === "delivery_date" ? "border-[var(--ym-red)]" : ""}`} value={deliveryDate} max={todayIso()} min={order.accepted_at ? order.accepted_at.slice(0, 10) : undefined} onChange={(e) => setDeliveryDate(e.target.value)} />
          </label>
          <label className="text-sm block">{t("responsible")}
            <input className="ym-select w-full mt-1" value={responsible} onChange={(e) => setResponsible(e.target.value)} maxLength={300} />
          </label>
          <label className="text-sm block sm:col-span-2">{t("delivery_address")}
            <input className="ym-select w-full mt-1" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={order.address} maxLength={500} />
          </label>
          <label className="text-sm block sm:col-span-2">{t("act_note")}
            <textarea className="ym-select w-full mt-1 min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between"><b className="text-sm">{t("lines_title")}</b><span className="ym-muted text-xs">{t("act_lines_hint")}</span></div>
          <table className="ym-table mt-1">
            <thead><tr><th>{t("col_name")}</th><th>{t("col_ordered")}</th><th>{t("remaining_qty")}</th><th>{t("col_delivered")}</th><th>{t("col_unit")}</th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.order_line} className={errorField === "lines" ? "bg-[var(--ym-red-bg)]" : ""}>
                  <td>{l.name}</td>
                  <td>{l.ordered}</td>
                  <td>{l.remaining}</td>
                  <td>
                    <input type="number" inputMode="decimal" min={0} max={Number(l.remaining)} step="any" className="ym-select w-28" value={l.qty}
                      onChange={(e) => setLines((xs) => xs.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
                  </td>
                  <td>{l.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="text-sm text-[var(--ym-red)] bg-[var(--ym-red-bg)] rounded-lg p-3">{error}</p>}

        <DialogFooter>
          <button type="button" className="ym-btn" onClick={onClose} disabled={busy}>{t("cancel")}</button>
          <button type="button" className="ym-btn ym-btn--primary" onClick={submit} disabled={busy || !anyQty || !deliveryDate}>{act ? t("save") : t("create_act_btn")}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ActFormDialog;
