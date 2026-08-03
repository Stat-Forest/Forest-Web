import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetExpiredDeadlinesReportQuery,
  useGetStatementsReportQuery,
} from "@/services/reportsApi";
import {
  translateDepartmentName,
  translateStatementName,
} from "@/utils/i18nHelpers";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getSimpleCookie } from "@/utils/cookie";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";

interface ExpiredDeadline {
  id: string;
  submit_at: string;
  deadline_at: string;
  statement: {
    id: string;
    name: string;
    period: string;
    parent_name: string;
  };
  organizations: {
    id: string;
    name: string;
  }[];
}

function ExpiredDeadlines() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "uz";
  const user_role = useSelector((state: RootState) => state.auth.user?.role);

  console.log("USER ROLE:", user_role);

  const [selectedStatement, setSelectedStatement] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [submitAt, setSubmitAt] = useState("");
  const [page, setPage] = useState(1);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const perPage = 10;

  const toggleRow = (id: string) => {
    setOpenRow((prev) => (prev === id ? null : id));
  };

  const formatPeriod = (period?: string) => {
    if (!period) return "-";
    if (i18n.language === "ru") {
      const lower = period.toLowerCase();
      if (lower.includes("choraklik") || lower.includes("chorak")) return "Квартальный (3 мес)";
      if (lower.includes("oylik")) return "Ежемесячный";
      if (lower.includes("yillik")) return "Ежегодный";
    }
    return period;
  };

  const formatSubmitAt = (submitAtVal?: string) => {
    if (!submitAtVal) return "-";
    if (i18n.language === "ru") {
      return submitAtVal.replace(/CHORAK/g, "КВАРТАЛ");
    }
    return submitAtVal;
  };

  const { data: organizations, isLoading: orgLoading } =
    useGetOrganizationReportsQuery({ lang });

  const {
    data: statements,
    isLoading: statementLoading,
    error: statementError,
  } = useGetStatementsReportQuery({ lang });

  const { data, isLoading, error } = useGetExpiredDeadlinesReportQuery({
    page,
    per_page: perPage,
    statement: selectedStatement,
    organizations: selectedOrganization,
    deadline_at: deadlineAt,
    submit_at: submitAt,
    period: selectedPeriod,
    lang,
  });

  const list = Array.isArray(data) ? data : (data?.results ?? []);
  const totalCount = data?.count ?? list.length;
  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="p-5 w-full pb-10">
      {isLoading && <p className="text-left text-slate-600 dark:text-slate-400">Yuklanmoqda...</p>}
      {error && <p className="text-red-500 text-left">Xatolik yuz berdi</p>}

      <div className="w-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 rounded-2xl p-4 shadow-xs backdrop-blur-md transition-colors space-y-4">
        {/* FILTERS */}
        <div className="flex gap-3 mb-4 flex-wrap items-center">
          {/* STATEMENT */}
          <Select
            value={selectedStatement ? String(selectedStatement) : undefined}
            onValueChange={(v) => {
              setSelectedStatement(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[260px] min-h-[40px] text-sm font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-xs">
              <SelectValue placeholder={`${t("chooseDirection")}`}/>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
              {statementLoading && <p className="px-3 text-slate-500">Yuklanmoqda...</p>}
              {!statementLoading &&
                !statementError &&
                statements?.flatMap((p: any) =>
                  p.children?.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)} className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                      {c.name}
                    </SelectItem>
                  )),
                )}
            </SelectContent>
          </Select>

          {/* PERIOD */}
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[260px] min-h-[40px] text-sm font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-xs">
              <SelectValue placeholder={t("reportType")} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
              <SelectItem value="daily" className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">{t("daily")}</SelectItem>
              <SelectItem value="weekly" className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">{t("weekly")}</SelectItem>
              <SelectItem value="monthly" className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">{t("monthly")}</SelectItem>
              <SelectItem value="quarterly" className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">{t("quarterly")}</SelectItem>
              <SelectItem value="yearly" className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">{t("yearly")}</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            className="w-[260px] min-h-[40px] text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-xs"
            value={deadlineAt}
            onChange={(e) => {
              setDeadlineAt(e.target.value);
              setPage(1);
            }}
          />

          {/* ORGANIZATION */}
          {(user_role == "super_admin" || user_role == "tashkilot_rahbari") && (
            <Select
              value={
                selectedOrganization ? String(selectedOrganization) : undefined
              }
              onValueChange={(v) => {
                setSelectedOrganization(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[260px] min-h-[40px] text-sm font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-xs">
                <SelectValue placeholder={t("organizations")} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
                {orgLoading && <p className="px-3 text-slate-500">Yuklanmoqda...</p>}
                {!orgLoading &&
                  organizations?.map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)} className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                      {o.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          {/* RESET */}
          <Button
            variant="outline"
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            onClick={() => {
              setSelectedStatement("");
              setSelectedOrganization("");
              setSelectedPeriod("");
              setDeadlineAt("");
              setSubmitAt("");
              setPage(1);
            }}
          >
            {t("reset")}
          </Button>
        </div>

        {/* TABLE */}
        {list.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <h1 className="text-slate-500 dark:text-slate-400">
              {t("noData") || "Ma'lumot topilmadi"}
            </h1>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors shadow-xs">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-slate-100/90 dark:bg-slate-800/90 h-[50px] border-b border-slate-200 dark:border-slate-700">
                  <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left pl-3 text-sm font-semibold">{t("item_18")}</TableHead> {/* T/r: */}
                  <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left text-sm font-semibold">{t("statments_name")}</TableHead> {/* Bo'lim */}
                  <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left text-sm font-semibold">{t("item_14")}</TableHead> {/* Hisobot davri */}
                  <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left text-sm font-semibold">{t("deadline")}</TableHead> {/* Muddati */}
                  <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left text-sm font-semibold">{t("organization")}</TableHead> {/* Tashkilot */}
                  <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left text-sm font-semibold">
                    {t("item_17")}
                  </TableHead>{" "}
                  {/* Hisobot topshirish vaqti */}
                  <TableHead className="text-slate-700 dark:text-slate-200 border-none text-left text-sm font-semibold">
                    {t("actions")}
                  </TableHead>{" "}
                  {/* Amallar */}
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {list.map((d: ExpiredDeadline, i: number) => (
                  <Fragment key={d.id}>
                    <TableRow
                      onClick={() => toggleRow(d.id)}
                      className="h-[50px] cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/60"
                    >
                      <TableCell className="text-left text-sm font-medium text-slate-700 dark:text-slate-300 border-none pl-3">
                        {(page - 1) * perPage + i + 1}
                      </TableCell>
                      <TableCell className="text-left border-none">
                        <b className="text-slate-800 dark:text-slate-100 font-semibold">
                          {translateStatementName(d.statement?.name, i18n.language)}
                        </b>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                          {translateDepartmentName(d.statement?.parent_name, i18n.language)}
                        </p>
                      </TableCell>
                      <TableCell className="text-left text-sm font-medium text-slate-600 dark:text-slate-300 border-none">
                        {formatPeriod(d.statement?.period)}
                      </TableCell>
                      <TableCell className="text-left text-sm font-semibold text-red-600 dark:text-red-400 border-none">
                        {d.deadline_at}
                      </TableCell>
                      <TableCell className="text-left text-sm font-medium text-slate-700 dark:text-slate-300 border-none">
                        {d.organizations.length} {t("organization")}
                      </TableCell>
                      <TableCell className="text-left text-sm font-medium text-slate-600 dark:text-slate-300 border-none">
                        {formatSubmitAt(d.submit_at)}
                      </TableCell>
                      <TableCell className="text-left text-slate-600 dark:text-slate-400 border-none">
                        {openRow === d.id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </TableCell>
                    </TableRow>

                    {openRow === d.id && (
                      <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                        <TableCell colSpan={7} className="p-4 border-none">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {d.organizations.map((o) => (
                              <div
                                key={o.id}
                                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 p-2.5 rounded-lg text-xs font-medium break-words whitespace-normal shadow-xs"
                              >
                                {i18n.language === "ru" &&
                                (o.name === "O'rmon xo'jaligini raqamlashtirish markazi davlat muassasasi" ||
                                  !o.name)
                                  ? t("compny_name")
                                  : o.name}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("page")} {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={page === 1}
                variant="outline"
                size="sm"
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                onClick={() => setPage((p) => p - 1)}
              >
                {t("before")}
              </Button>
              <Button
                disabled={page === totalPages}
                variant="outline"
                size="sm"
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpiredDeadlines;
