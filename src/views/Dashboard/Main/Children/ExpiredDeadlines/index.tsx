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
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getSimpleCookie } from "@/utils/cookie";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";

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
  const { t } = useTranslation();
  const lang = getSimpleCookie("lang") || "uz";

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
  });

  const list = Array.isArray(data) ? data : (data?.results ?? []);
  const totalCount = data?.count ?? list.length;
  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="px-5 w-full">
      {isLoading && <p>Yuklanmoqda...</p>}
      {error && <p className="text-red-500">Xatolik yuz berdi</p>}

      <div className="bg-ice border rounded-xl px-3 py-5">
        {/* FILTERS */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Input
            className="w-[260px] text-xl border-black"
            placeholder={`${t("item_79")}...`}
            value={submitAt}
            onChange={(e) => {
              setSubmitAt(e.target.value);
              setPage(1);
            }}
          />

          {/* STATEMENT */}
          <Select
            value={selectedStatement ? String(selectedStatement) : undefined}
            onValueChange={(v) => {
              setSelectedStatement(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[260px] text-xl border-black">
              <SelectValue placeholder="Yo'nalishni tanlang" />
            </SelectTrigger>
            <SelectContent>
              {statementLoading && <p className="px-3">Yuklanmoqda...</p>}
              {!statementLoading &&
                !statementError &&
                statements?.results?.flatMap((p: any) =>
                  p.children?.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  )),
                )}
            </SelectContent>
          </Select>

          {/* PERIOD */}
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[260px] text-xl border-black">
              <SelectValue placeholder={t("reportType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">{t("daily")}</SelectItem>
              <SelectItem value="weekly">{t("weekly")}</SelectItem>
              <SelectItem value="monthly">{t("monthly")}</SelectItem>
              <SelectItem value="quarterly">{t("quarterly")}</SelectItem>
              <SelectItem value="yearly">{t("yearly")}</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            className="w-[260px] text-xl border-black"
            value={deadlineAt}
            onChange={(e) => {
              setDeadlineAt(e.target.value);
              setPage(1);
            }}
          />

          {/* ORGANIZATION */}
          <Select
            value={
              selectedOrganization ? String(selectedOrganization) : undefined
            }
            onValueChange={(v) => {
              setSelectedOrganization(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[260px] text-xl border-black">
              <SelectValue placeholder={t("organizations")} />
            </SelectTrigger>
            <SelectContent>
              {orgLoading && <p className="px-3">Yuklanmoqda...</p>}
              {!orgLoading &&
                organizations?.map((o: any) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* RESET */}
          <Button
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
          <p className="text-center text-gray-500 py-8">
            {t("noData") || "Ma'lumot topilmadi"}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-200">
                <TableHead>№</TableHead>
                <TableHead>{t("statement")}</TableHead>
                <TableHead>{t("period")}</TableHead>
                <TableHead>{t("deadline")}</TableHead>
                <TableHead>{t("organizations")}</TableHead>
                <TableHead className="text-right">{t("submitDate")}</TableHead>
                <TableHead className="text-center">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {list.map((d: ExpiredDeadline, i: number) => (
                <Fragment key={d.id}>
                  <TableRow
                    onClick={() => toggleRow(d.id)}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    <TableCell>{(page - 1) * perPage + i + 1}</TableCell>
                    <TableCell>
                      <b>{d.statement?.name}</b>
                      <p className="text-sm text-gray-500">
                        {d.statement?.parent_name}
                      </p>
                    </TableCell>
                    <TableCell>{d.statement?.period}</TableCell>
                    <TableCell className="text-red-600">
                      {d.deadline_at}
                    </TableCell>
                    <TableCell>
                      {d.organizations.length} {t("organizations")}
                    </TableCell>
                    <TableCell className="text-right">{d.submit_at}</TableCell>
                    <TableCell className="text-center">
                      {openRow === d.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </TableCell>
                  </TableRow>

                  {openRow === d.id && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {d.organizations.map((o) => (
                            <div key={o.id} className="border p-2 rounded">
                              {o.name}
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
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-between mt-4">
            <p>
              {t("page")} {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t("before")}
              </Button>
              <Button
                disabled={page === totalPages}
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
