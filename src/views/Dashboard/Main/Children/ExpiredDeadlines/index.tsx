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
import { useState, useMemo, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getSimpleCookie } from "@/utils/cookie";

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
  organizations: Array<{
    id: string;
    name: string;
  }>;
}

function ExpiredDeadlines() {
  const [selectedStatement, setSelectedStatement] = useState<number | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState<number | undefined>(undefined);
  const [deadlineAt, setDeadlineAt] = useState("");
  const [submitAt, setSubmitAt] = useState("");
  const [page, setPage] = useState(1);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const perPage = 10;
  const lang = getSimpleCookie("lang") || "uz";
  const { t } = useTranslation();

  const toggleRow = (id: string) => {
    setOpenRow((prev) => (prev === id ? null : id));
  };

  // Build query parameters
  const queryParams = useMemo(() => {
    const params: {
      deadline_at?: string;
      organizations?: number;
      page?: number;
      per_page?: number;
      statement?: number;
      submit_at?: string;
    } = {};

    if (deadlineAt) params.deadline_at = deadlineAt;
    if (selectedOrganization) params.organizations = selectedOrganization;
    if (page) params.page = page;
    if (perPage) params.per_page = perPage;
    if (selectedStatement) params.statement = selectedStatement;
    if (submitAt) params.submit_at = submitAt;

    return params;
  }, [deadlineAt, selectedOrganization, page, perPage, selectedStatement, submitAt]);

  const {
    data: expiredDeadlinesData,
    isLoading: isDeadlinesLoading,
    error: deadlinesError,
  } = useGetExpiredDeadlinesReportQuery(queryParams);

  const {
    data: statement,
    isLoading: isStatementLoading,
    error: statementError,
  } = useGetStatementsReportQuery({
    lang,
  });

  // Handle pagination response
  const deadlinesList = Array.isArray(expiredDeadlinesData)
    ? expiredDeadlinesData
    : expiredDeadlinesData?.results || [];
  const totalCount = expiredDeadlinesData?.count || deadlinesList.length;
  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="px-5 w-full">
      {isDeadlinesLoading && <h1>Yuklanmoqda...</h1>}
      {deadlinesError && <h1 className="text-[red]">Xatolik yuz berdi!</h1>}
      <div className="w-full bg-ice border border-[silver] rounded-xl px-3 py-5">
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <div>
            <Input
              type="text"
              placeholder={`${t("item_79")}...`}
              className="w-[260px] text-xl min-h-[40px] border-black"
              value={submitAt}
              onChange={(e) => {
                setSubmitAt(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <Select
              value={selectedStatement?.toString() || "all"}
              onValueChange={(value) => {
                setSelectedStatement(value === "all" ? undefined : Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                <SelectValue placeholder="Yo'nalishni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {isStatementLoading && (
                  <div className="px-3 py-2 text-gray-500">Yuklanmoqda...</div>
                )}
                {statementError && (
                  <div className="px-3 py-2 text-red-500">
                    Xatolik yuz berdi! Ma'lumotlar olinmadi.
                  </div>
                )}
                <SelectItem value="all">{t("all") || "Barchasi"}</SelectItem>
                {!isStatementLoading &&
                  !statementError &&
                  statement?.results?.flatMap((parent: any) =>
                    parent.children?.map((child: any) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name}
                      </SelectItem>
                    ))
                  )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={selectedPeriod || "all"}
              onValueChange={(value) => {
                setSelectedPeriod(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                <SelectValue placeholder={`${t("reportType")}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all") || "Barchasi"}</SelectItem>
                <SelectItem value="daily">{t("daily")}</SelectItem>
                <SelectItem value="weekly">{t("weekly")}</SelectItem>
                <SelectItem value="monthly">{t("monthly")}</SelectItem>
                <SelectItem value="quarterly">{t("quarterly")}</SelectItem>
                <SelectItem value="yearly">{t("yearly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Input
              type="date"
              placeholder="Deadline at"
              className="w-[260px] text-xl min-h-[40px] border-black"
              value={deadlineAt}
              onChange={(e) => {
                setDeadlineAt(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <Input
              type="number"
              placeholder="Organizations ID"
              className="w-[260px] text-xl min-h-[40px] border-black"
              value={selectedOrganization || ""}
              onChange={(e) => {
                setSelectedOrganization(
                  e.target.value ? Number(e.target.value) : undefined
                );
                setPage(1);
              }}
            />
          </div>

          <div>
            <Button
              onClick={() => {
                setSelectedStatement(undefined);
                setSelectedPeriod("");
                setSelectedOrganization(undefined);
                setDeadlineAt("");
                setSubmitAt("");
                setPage(1);
              }}
              className="bg-[#3B82F6] text-[white] hover:bg-[#2563EB] cursor-pointer"
            >
              {t("reset")}
            </Button>
          </div>
        </div>

        {deadlinesList.length === 0 && !isDeadlinesLoading ? (
          <div className="text-center py-8 text-gray-500">
            {t("noData") || "Ma'lumot topilmadi"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-[#eaeaea] h-[50px]">
                  <TableHead className="w-[5%] pl-2 text-lg text-[#717171] rounded-tl-lg text-left border-none">
                    №
                  </TableHead>
                  <TableHead className="text-[#717171] text-left text-lg w-[20%] border-none">
                    {t("statement") || "Yo'nalish"}
                  </TableHead>
                  <TableHead className="text-[#717171] text-left text-lg w-[15%] border-none">
                    {t("period") || "Davr"}
                  </TableHead>
                  <TableHead className="text-[#717171] text-left text-lg w-[15%] border-none">
                    {t("deadline") || "Muddat"}
                  </TableHead>
                  <TableHead className="text-[#717171] text-left text-lg w-[20%] border-none">
                    {t("organizations") || "Tashkilotlar"}
                  </TableHead>
                  <TableHead className="text-right pr-2 text-[#717171] text-lg w-[15%] border-none">
                    {t("submitDate") || "Topshirilgan sana"}
                  </TableHead>
                  <TableHead className="text-center text-[#717171] text-lg rounded-tr-lg rounded-br-lg w-[5%] border-none">
                    {t("actions") || "Amallar"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadlinesList.map((deadline: ExpiredDeadline, index: number) => (
                  <Fragment key={deadline.id}>
                    <TableRow
                      className="h-[50px] cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleRow(deadline.id)}
                    >
                      <TableCell className="pl-2 text-left border-none">
                        {(page - 1) * perPage + index + 1}
                      </TableCell>
                      <TableCell className="text-left border-none">
                        <div className="break-words whitespace-normal">
                          <div className="font-semibold break-words">
                            {deadline.statement?.name || "-"}
                          </div>
                          <div className="text-sm text-gray-500 break-words">
                            {deadline.statement?.parent_name || ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-left border-none break-words whitespace-normal">
                        {deadline.statement?.period || "-"}
                      </TableCell>
                      <TableCell className="text-left border-none text-red-600 font-semibold break-words whitespace-normal">
                        {deadline.deadline_at || "-"}
                      </TableCell>
                      <TableCell className="text-left border-none break-words whitespace-normal">
                        {deadline.organizations?.length > 0
                          ? `${deadline.organizations.length} ${t("organizations") || "tashkilot"}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right pr-2 border-none break-words whitespace-normal">
                        {deadline.submit_at || "-"}
                      </TableCell>
                      <TableCell className="text-center border-none">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(deadline.id);
                          }}
                        >
                          {openRow === deadline.id ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {openRow === deadline.id && (
                      <TableRow className="bg-gray-50 transition-all duration-300">
                        <TableCell colSpan={7} className="p-4">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-lg mb-3">
                              {t("organizations") || "Tashkilotlar"} ({deadline.organizations?.length || 0})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {deadline.organizations?.map((org) => (
                                <div
                                  key={org.id}
                                  className="p-3 border rounded-md shadow-sm bg-white hover:bg-gray-50 transition-colors"
                                >
                                  <p className="text-sm font-medium text-gray-700 break-words whitespace-normal text-wrap">
                                    {org.name}
                                  </p>
                                </div>
                              ))}
                            </div>
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              {t("page") || "Sahifa"} {page} / {totalPages} ({t("total") || "Jami"}: {totalCount})
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
              >
                {t("before") || "Oldingi"}
              </Button>
              <Button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
              >
                {t("next") || "Keyingi"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpiredDeadlines;
