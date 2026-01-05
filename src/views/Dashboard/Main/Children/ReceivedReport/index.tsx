import TableReports from "@/components/Table/TableReports/TableReports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { regions2 } from "@/services/constants";
import { useGetAllReportsQuery, useGetStatementsReportQuery } from "@/services/reportsApi";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { resetReportsFilter, setReportsFilter } from "@/features/uiSlice";

function ReceivedReport() {
  const dispatch = useDispatch();
  const { selectedOrganization, selectedPeriod, searchTerm, selectedStatement } =
    useSelector((state: RootState) => state.ui.reportsFilters.accepted);
  const lang = localStorage.getItem("i18nextLng") || "uz";
  const { t, i18n } = useTranslation();

  const {
    data: reportsData,
    isLoading: isReportsLoading,
    error: reportsError,
  } = useGetAllReportsQuery({
    statement: selectedStatement,
    status: `status=accepted`,
    organization__region: selectedOrganization,
    statement__period: selectedPeriod,
    search: searchTerm,
  });
  const {
    data: statement,
    isLoading: isStatementLoading,
    error: statementError,
  } = useGetStatementsReportQuery({
    lang,
  });

  return (
    <div className="px-5 w-full">
      {isReportsLoading && <h1>Yuklanmoqda...</h1>}
      {reportsError && <h1 className="text-[red]">Xatolik yuz berdi!</h1>}
      <div className="w-full border bg-ice border-[silver] rounded-xl px-3 py-5">
        <div className="flex items-center gap-5 mb-6">
          <div>
            <Input
              type="text"
              placeholder={`${t("item_79")}...`}
              className="w-[260px] text-xl min-h-[40px] border-black"
              value={searchTerm}
              onChange={(e) =>
                dispatch(
                  setReportsFilter({
                    key: "accepted",
                    changes: { searchTerm: e.target.value },
                  })
                )
              }
            />
          </div>

          <div>
            <Select
              value={selectedOrganization}
              onValueChange={(value) =>
                dispatch(
                  setReportsFilter({
                    key: "accepted",
                    changes: { selectedOrganization: value },
                  })
                )
              }
            >
              <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                <SelectValue placeholder={`${t("region")}`} />
              </SelectTrigger>
              <SelectContent>
                {regions2.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {i18n.language === "uz" ? region.label : region.label2}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={selectedStatement}
              onValueChange={(value) =>
                dispatch(
                  setReportsFilter({
                    key: "accepted",
                    changes: { selectedStatement: value },
                  })
                )
              }
            >
              <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                <SelectValue placeholder="Yo‘nalishni tanlang" />
              </SelectTrigger>

              <SelectContent>
                {/* LOADING */}
                {isStatementLoading && (
                  <div className="px-3 py-2 text-gray-500">Yuklanmoqda...</div>
                )}

                {/* ERROR */}
                {statementError && (
                  <div className="px-3 py-2 text-red-500">
                    Xatolik yuz berdi! Ma'lumotlar olinmadi.
                  </div>
                )}

                {/* CHILDREN LIST */}
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
              value={selectedPeriod}
              onValueChange={(value) =>
                dispatch(
                  setReportsFilter({
                    key: "accepted",
                    changes: { selectedPeriod: value },
                  })
                )
              }
            >
              <SelectTrigger className="w-[260px] text-xl min-h-[40px] border-black">
                <SelectValue placeholder={`${t("reportType")}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("daily")}</SelectItem>
                <SelectItem value="weekly">{t("weekly")}</SelectItem>
                <SelectItem value="monthly">{t("monthly")}</SelectItem>
                <SelectItem value="quarterly">{t("quarterly")}</SelectItem>
                <SelectItem value="yearly">{t("yearly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button
              onClick={() => {
                dispatch(resetReportsFilter("accepted"));
              }}
              className="bg-[#3B82F6] text-[white] hover:bg-[#2563EB] cursor-pointer"
            >
              {t("reset")}
            </Button>
          </div>
        </div>
        <TableReports data={reportsData} />
      </div>
    </div>
  );
}

export default ReceivedReport;
