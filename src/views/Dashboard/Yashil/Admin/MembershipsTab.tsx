/** A'zoliklar (TZ §2, javoblar Б1–Б4): kim qaysi kabinetda, tayyorlash/imzolash huquqi, vakolat asosi, amal davri. */
import { useEffect, useMemo, useState } from "react";
import { useYashilT, type YashilKey } from "@/features/yashil/i18n";
import type { AdminMembership, AdminMembershipWrite, AdminUserHit, MemberType } from "@/features/yashil/types";
import {
  useGetYashilAdminMahallasQuery,
  useGetYashilAdminMembershipsQuery,
  useGetYashilAdminSuppliersQuery,
  useGetYashilAdminUnionUnitsQuery,
  useLazySearchYashilAdminUsersQuery,
  useSaveYashilAdminMembershipMutation,
} from "@/services/yashilApi";
import { todayIso } from "../Orders/orderUi";
import { ActiveBadge, FormDialog, Pager, inputCls, periodText, useSave } from "./adminUi";

const TYPES: MemberType[] = ["mahalla", "union", "supplier", "observer"];
const TYPE_KEY: Record<MemberType, YashilKey> = {
  mahalla: "member_type_mahalla", union: "member_type_union", supplier: "member_type_supplier", observer: "member_type_observer",
};
const PER_PAGE = 25;

const scopeText = (s: AdminMembership["observer_scope"]) => [...(s.regions ?? []), ...(s.districts ?? [])].join(", ");
const parseScope = (v: string) => {
  const codes = v.split(",").map((x) => x.trim()).filter(Boolean);
  return { regions: codes.filter((c) => c.length <= 4), districts: codes.filter((c) => c.length > 4) };
};

function MembershipDialog({ edit, onClose }: { edit: AdminMembership | null; onClose: () => void }) {
  const { t } = useYashilT();
  const [save, { isLoading }] = useSaveYashilAdminMembershipMutation();
  const { error, field, run } = useSave();
  const [user, setUser] = useState<AdminUserHit | null>(null);
  const [q, setQ] = useState("");
  const [search, { data: hits }] = useLazySearchYashilAdminUsersQuery();
  const [type, setType] = useState<MemberType>(edit?.member_type ?? "mahalla");
  const [target, setTarget] = useState("");
  const [targetQ, setTargetQ] = useState("");
  const [form, setForm] = useState({
    can_prepare: edit?.can_prepare ?? true,
    can_sign: edit?.can_sign ?? false,
    position_title: edit?.position_title ?? "",
    phone: edit?.phone ?? "",
    authority_doc_number: edit?.authority_doc_number ?? "",
    authority_doc_date: edit?.authority_doc_date ?? "",
    valid_from: edit?.valid_from ?? todayIso(),
    valid_to: edit?.valid_to ?? "",
    is_active: edit?.is_active ?? true,
    scope: edit ? scopeText(edit.observer_scope) : "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const { data: mahallas } = useGetYashilAdminMahallasQuery({ q: targetQ || undefined, per_page: 20 }, { skip: !!edit || type !== "mahalla" });
  const { data: units } = useGetYashilAdminUnionUnitsQuery(undefined, { skip: !!edit || type !== "union" });
  const { data: suppliers } = useGetYashilAdminSuppliersQuery(undefined, { skip: !!edit || type !== "supplier" });

  useEffect(() => {
    if (q.trim().length >= 2) {
      const h = setTimeout(() => search(q.trim()), 300);
      return () => clearTimeout(h);
    }
  }, [q, search]);
  useEffect(() => { setTarget(""); }, [type]);
  useEffect(() => { if (type === "observer") setForm((f) => ({ ...f, can_prepare: false, can_sign: false })); }, [type]);

  const submit = () => {
    const body: AdminMembershipWrite = {
      can_prepare: form.can_prepare, can_sign: form.can_sign, position_title: form.position_title, phone: form.phone,
      authority_doc_number: form.authority_doc_number, authority_doc_date: form.authority_doc_date || null,
      valid_to: form.valid_to || null, is_active: form.is_active,
    };
    if (type === "observer") body.observer_scope = parseScope(form.scope);
    if (!edit) {
      Object.assign(body, { user: user?.id, member_type: type, valid_from: form.valid_from });
      if (type === "mahalla") body.mahalla = target;
      if (type === "union") body.union_unit = target;
      if (type === "supplier") body.organization = target;
    }
    run(() => save({ id: edit?.id, body }).unwrap(), onClose);
  };

  const needTarget = !edit && type !== "observer";
  return (
    <FormDialog title={t(edit ? "membership_edit" : "membership_new")} description={edit ? t("membership_type_fixed") : undefined} open onClose={onClose}
      onSave={submit} saving={isLoading} disabled={!edit && (!user || (needTarget && !target))} error={error} wide>
      {edit ? (
        <div className="text-sm"><b>{edit.user_info.full_name}</b> · {edit.user_info.email}<div className="ym-muted">{t(TYPE_KEY[edit.member_type])}: {edit.cabinet_name}</div></div>
      ) : (
        <>
          <label className="text-sm block">{t("find_user")} *
            <input className={inputCls(field === "user")} value={user ? `${user.full_name} · ${user.email}` : q} onChange={(e) => { setUser(null); setQ(e.target.value); }} placeholder={t("min_two_chars")} />
          </label>
          {!user && q.trim().length >= 2 && (hits?.results ?? []).length > 0 && (
            <ul className="ym-card !p-2 max-h-40 overflow-auto text-sm">
              {hits!.results.map((u) => (
                <li key={u.id}><button type="button" className="w-full text-left px-2 py-1 rounded hover:bg-[var(--ym-green-soft)]" onClick={() => setUser(u)}>
                  {u.full_name} · {u.email} <span className="ym-muted">({u.role}{u.organization ? `, ${u.organization}` : ""}{u.memberships ? `, ${u.memberships} ${t("col_cabinet").toLowerCase()}` : ""})</span>
                </button></li>
              ))}
            </ul>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm block">{t("col_type")} *
              <select className={inputCls(field === "member_type")} value={type} onChange={(e) => setType(e.target.value as MemberType)}>
                {TYPES.map((x) => <option key={x} value={x}>{t(TYPE_KEY[x])}</option>)}
              </select>
            </label>
            {type === "mahalla" && (
              <label className="text-sm block">{t("col_mahalla")} *
                <input className="ym-select w-full mt-1" placeholder={t("search")} value={targetQ} onChange={(e) => setTargetQ(e.target.value)} />
                <select className={inputCls(field === "mahalla")} value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">—</option>
                  {(mahallas?.results ?? []).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.district.name})</option>)}
                </select>
              </label>
            )}
            {type === "union" && (
              <label className="text-sm block">{t("member_type_union")} *
                <select className={inputCls(field === "union_unit")} value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">—</option>
                  {(units?.results ?? []).filter((u) => u.is_active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </label>
            )}
            {type === "supplier" && (
              <label className="text-sm block">{t("member_type_supplier")} *
                <select className={inputCls(field === "organization")} value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">—</option>
                  {(suppliers?.results ?? []).filter((s) => s.is_active_supplier).map((s) => <option key={s.id} value={s.organization}>{s.organization_name} ({t(s.supplier_type === "dm" ? "tab_route_dm" : "tab_route_forest")})</option>)}
                </select>
              </label>
            )}
          </div>
        </>
      )}
      {type !== "observer" ? (
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.can_prepare} onChange={(e) => set({ can_prepare: e.target.checked })} />{t("right_prepare")}</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.can_sign} onChange={(e) => set({ can_sign: e.target.checked })} />{t("right_sign")}</label>
        </div>
      ) : (
        <label className="text-sm block">{t("observer_scope_hint")}
          <input className={inputCls(field === "observer_scope")} value={form.scope} onChange={(e) => set({ scope: e.target.value })} placeholder="1703, 1727224" />
        </label>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm block">{t("col_position")}<input className={inputCls(field === "position_title")} value={form.position_title} maxLength={200} onChange={(e) => set({ position_title: e.target.value })} /></label>
        <label className="text-sm block">{t("col_phone")}<input className={inputCls(field === "phone")} value={form.phone} maxLength={20} onChange={(e) => set({ phone: e.target.value })} /></label>
        <label className="text-sm block">{t("col_authority")} №<input className={inputCls(field === "authority_doc_number")} value={form.authority_doc_number} maxLength={100} onChange={(e) => set({ authority_doc_number: e.target.value })} /></label>
        <label className="text-sm block">{t("col_authority")} — {t("col_date").toLowerCase()}<input type="date" className={inputCls(field === "authority_doc_date")} value={form.authority_doc_date ?? ""} onChange={(e) => set({ authority_doc_date: e.target.value })} /></label>
        {!edit && <label className="text-sm block">{t("valid_from")} *<input type="date" className={inputCls(field === "valid_from")} value={form.valid_from} onChange={(e) => set({ valid_from: e.target.value })} /></label>}
        <label className="text-sm block">{t("valid_to")}<input type="date" className={inputCls(field === "valid_to")} value={form.valid_to ?? ""} onChange={(e) => set({ valid_to: e.target.value })} /></label>
      </div>
      {edit && <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} />{t("status_active")}</label>}
    </FormDialog>
  );
}

export function MembershipsTab() {
  const { t } = useYashilT();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ edit: AdminMembership | null } | null>(null);
  const params = useMemo(() => ({ q: q || undefined, member_type: type || undefined, page, per_page: PER_PAGE }), [q, type, page]);
  const { data, isFetching } = useGetYashilAdminMembershipsQuery(params);

  return (
    <div className="ym-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <input className="ym-select" placeholder={t("search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label={t("search")} />
          <select className="ym-select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label={t("col_type")}>
            <option value="">{t("filter_all")}</option>
            {TYPES.map((x) => <option key={x} value={x}>{t(TYPE_KEY[x])}</option>)}
          </select>
        </div>
        <button type="button" className="ym-btn ym-btn--primary" onClick={() => setDialog({ edit: null })}>{t("membership_new")}</button>
      </div>
      {data && data.results.length === 0 && !isFetching ? <p className="ym-muted text-sm py-6 text-center">{t("empty")}</p> : (
        <div className="overflow-auto">
          <table className="ym-table text-[13px]">
            <thead><tr><th>{t("col_user")}</th><th>{t("col_cabinet")}</th><th>{t("col_rights")}</th><th>{t("col_position")}</th><th>{t("col_period")}</th><th>{t("col_status")}</th><th></th></tr></thead>
            <tbody>
              {(data?.results ?? []).map((m) => (
                <tr key={m.id}>
                  <td>{m.user_info.full_name || "—"}<div className="ym-muted text-[11px]">{m.user_info.email}</div></td>
                  <td>{t(TYPE_KEY[m.member_type])}<div className="ym-muted text-[11px]">{m.member_type === "observer" ? (scopeText(m.observer_scope) || t("republic_short")) : m.cabinet_name}</div></td>
                  <td className="whitespace-nowrap">{m.can_prepare && <span className="ym-badge mr-1">{t("right_prepare")}</span>}{m.can_sign && <span className="ym-badge ym-badge--blue">{t("right_sign")}</span>}</td>
                  <td>{m.position_title || "—"}{m.authority_doc_number && <div className="ym-muted text-[11px]">№ {m.authority_doc_number}</div>}</td>
                  <td className="whitespace-nowrap">{periodText(m.valid_from, m.valid_to)}</td>
                  <td><ActiveBadge active={m.is_active} current={m.is_current} /></td>
                  <td><button type="button" className="ym-btn" onClick={() => setDialog({ edit: m })}>{t("edit")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} count={data?.count ?? 0} perPage={PER_PAGE} onPage={setPage} />
      {dialog && <MembershipDialog edit={dialog.edit} onClose={() => setDialog(null)} />}
    </div>
  );
}
