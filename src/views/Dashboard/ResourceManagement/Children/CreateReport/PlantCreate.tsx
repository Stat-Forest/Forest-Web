import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/app/store";
import {
  useGetStatementColumnsReportQuery,
  reportApi,
  useGetDeadlinesReportQuery,
  useGetPlantsReportQuery,
  usePlantCreateMutation,
} from "@/services/reportsApi";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { removeCookie } from "@/utils/cookie";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";

function findEmptyChildrenColumnIds(
  children: any[]
): { id: string; title: string; fullParentChain: string }[] {
  const result: { id: string; title: string; fullParentChain: string }[] = [];
  const traverse = (cols: any[], parentChain: string[] = []) => {
    cols.forEach((col) => {
      const currentChain = [...parentChain, col.title];
      if (
        col.children &&
        Array.isArray(col.children) &&
        col.children.length > 0
      ) {
        traverse(col.children, currentChain);
      } else {
        result.push({
          id: col.id,
          title: col.title,
          fullParentChain: currentChain.join(" / "),
        });
      }
    });
  };
  traverse(children);
  return result;
}

function PlantCreate() {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [selectedPlantId, setSelectedPlantId] = useState<string>(""); // 🔹 Yangi: Har bir step uchun plant
  const [allEmptyColumnsByStep, setAllEmptyColumnsByStep] = useState<
    { id: string; title: string; fullParentChain: string }[][]
  >([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [planItems, setPlanItems] = useState<
    { columnId: string; plan_value: string; fullParentChain: string }[]
  >([]);
  const [selectedPlantsByStep, setSelectedPlantsByStep] = useState<
    Record<number, string>
  >({}); // 🔹 Har bir step uchun tanlangan plant

  const reportIds = useSelector((state: RootState) => state.report.reportId);
  const lang = useSelector((state: RootState) => state.language.lang);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  const {
    data: organizationsData,
    isLoading: isOrgLoading,
    error: orgError,
  } = useGetOrganizationReportsQuery({ lang });

  const {
    data: tableHeadersData = [],
    isLoading: isHeaderLoading,
    error: headersError,
  } = useGetStatementColumnsReportQuery(
    { statementId: reportIds || "", lang, isUser: "true" },
    { skip: !reportIds }
  );

  // 🔹 Plants state with pagination
  const [plantsPage, setPlantsPage] = useState(1);
  const plantsPerPage = 5;

  const {
    data: plantsData,
    isLoading: plantsLoading,
    error: plantsError,
  } = useGetPlantsReportQuery(
    {
      statement: reportIds || "",
      lang,
      parent: "",
      page: plantsPage,
      perPage: plantsPerPage,
    },
    { skip: !reportIds }
  );

  // 🔹 Deadline state
  const [deadlinePage, setDeadlinePage] = useState(1);
  const deadlinePerPage = 5;

  const {
    data: deadlineData,
    isLoading: deadlineLoading,
    error: deadlineError,
  } = useGetDeadlinesReportQuery(
    {
      statement: reportIds || "",
      page: deadlinePage,
      perPage: deadlinePerPage,
      statement__period: "",
    },
    { skip: !reportIds }
  );

  const tableHeadersDataMemo = useMemo(
    () => tableHeadersData,
    [tableHeadersData]
  );

  const allEmptyColumnsByStepMemo = useMemo(() => {
    return tableHeadersDataMemo.map((obj: any) =>
      Array.isArray(obj.children)
        ? findEmptyChildrenColumnIds(obj.children)
        : []
    );
  }, [tableHeadersDataMemo]);

  useEffect(() => {
    setAllEmptyColumnsByStep(allEmptyColumnsByStepMemo);
    setCurrentStep(0);
  }, [allEmptyColumnsByStepMemo]);

  // 🔹 STEP O'ZGARGANDA YANGI PLANT TANLASH
  useEffect(() => {
    // Har bir step uchun alohida plant tanlash
    if (!selectedPlantsByStep[currentStep]) {
      // Agar bu step uchun plant tanlanmagan bo'lsa, bo'sh qilamiz
      setSelectedPlantId("");
    } else {
      // Agar oldin tanlangan bo'lsa, o'shasini ko'rsatamiz
      setSelectedPlantId(selectedPlantsByStep[currentStep]);
    }
  }, [currentStep, selectedPlantsByStep]);

  // Boshlang'ich qiymatlar
  useEffect(() => {
    if (allEmptyColumnsByStep[currentStep]?.length > 0) {
      const initialValues: Record<string, string> = {};
      allEmptyColumnsByStep[currentStep].forEach((col) => {
        if (
          !col.title.toLowerCase().includes("tashkilot nomi") &&
          !col.title.toLowerCase().includes("reja")
        ) {
          if (!formValues[col.id]) {
            initialValues[col.id] = "";
          }
        }
      });
      if (Object.keys(initialValues).length > 0) {
        setFormValues((prev) => ({ ...prev, ...initialValues }));
      }
    }
  }, [currentStep, allEmptyColumnsByStep]);

  // 🔹 PLAN MA'LUMOTLARI
  useEffect(() => {
    let isMounted = true;

    const fetchPlanDataForColumns = async () => {
      const rejaColumns = allEmptyColumnsByStep
        .flat()
        .filter((col) => col.title.toLowerCase().includes("reja"));

      if (rejaColumns.length === 0 || !reportIds || !selectedOrganizationId)
        return;

      try {
        const results = await Promise.all(
          rejaColumns.map((col) =>
            dispatch(
              reportApi.endpoints.getPlanItemsReport.initiate({
                organization_id: selectedOrganizationId,
                statement_id: reportIds,
                year: "2025",
                column: col.id,
              })
            ).unwrap()
          )
        );

        if (isMounted) {
          const mergedResults = rejaColumns.map((col, idx) => {
            const res = results[idx]?.[0];
            return {
              columnId: col.id,
              fullParentChain: col.fullParentChain,
              plan_value: res?.plan_value?.toString() || "",
            };
          });
          setPlanItems(mergedResults);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Plan olishda xatolik:", error);
          setFormErrors((prev) => [
            ...prev,
            "Plan ma'lumotlarini olishda xatolik yuz berdi",
          ]);
        }
      }
    };

    fetchPlanDataForColumns();
    return () => {
      isMounted = false;
    };
  }, [allEmptyColumnsByStep, selectedOrganizationId, reportIds, dispatch]);

  const [createReportItem, { isLoading: isSubmitting }] =
    usePlantCreateMutation();

  const handleInputChange = (id: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  };

  // 🔹 YANGI: Plant tanlash funksiyasi
  const handlePlantChange = (plantId: string) => {
    setSelectedPlantId(plantId);
    // Har bir step uchun tanlangan plant ni saqlaymiz
    setSelectedPlantsByStep((prev) => ({
      ...prev,
      [currentStep]: plantId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors([]);

    const errors: string[] = [];
    if (!selectedDeadlineId) {
      errors.push("Iltimos, deadline tanlang");
    }
    if (
      allEmptyColumnsByStep[currentStep]?.some((col) =>
        col.title.toLowerCase().includes("tashkilot nomi")
      ) &&
      !selectedOrganizationId
    ) {
      errors.push("Iltimos, tashkilot nomini tanlang");
    }

    // 🔹 Har bir step uchun plant tanlanganligini tekshiramiz
    Object.entries(selectedPlantsByStep).forEach(([step, plantId]) => {
      if (!plantId) {
        errors.push(`Iltimos, ${parseInt(step) + 1}-qadam uchun plant tanlang`);
      }
    });

    allEmptyColumnsByStep[currentStep]?.forEach((col) => {
      if (
        !col.title.toLowerCase().includes("reja") &&
        !col.title.toLowerCase().includes("tashkilot nomi") &&
        (!formValues[col.id] || formValues[col.id].toString().trim() === "")
      ) {
        errors.push(`"${col.fullParentChain}" uchun qiymat kiritish shart`);
      }
    });

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    // 🔹 YANGI: Backend strukturasiga mos report_items yaratish
    const report_items = allEmptyColumnsByStep.flatMap(
      (stepColumns, stepIndex) => {
        const stepPlantId = selectedPlantsByStep[stepIndex];

        return stepColumns.map((col) => {
          const isOrganizationColumn = col.title
            .toLowerCase()
            .includes("tashkilot nomi");
          const isRejaColumn = col.title.toLowerCase().includes("reja");

          let rawValue: string = "";

          if (isOrganizationColumn) {
            rawValue = selectedOrganizationId || "";
            return {
              statement_column: col.id,
              inners: [{ value: rawValue }],
            };
          } else if (isRejaColumn) {
            const planItem = planItems.find((item) => item.columnId === col.id);
            rawValue = planItem ? planItem.plan_value : "";
            return {
              statement_column: col.id,
              inners: [{ value: rawValue }],
            };
          } else {
            rawValue = formValues[col.id] || "";
            // 🔹 Plant bilan bog'liq columnlar uchun plant ID qo'shamiz
            return {
              statement_column: col.id,
              inners: [
                {
                  ...(stepPlantId && { plant: stepPlantId }),
                  value: rawValue,
                },
              ],
            };
          }
        });
      }
    );

    const payload = { deadline: selectedDeadlineId, report_items };

    try {
      await createReportItem(payload).unwrap();
      removeCookie("reportId");
      navigate(-1);
      setFormValues({});
      setCurrentStep(0);
      setFormErrors([]);
      setSelectedPlantsByStep({});
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        "Ma'lumotlarni yuborishda xatolik yuz berdi";
      setFormErrors((prev) => [...prev, errorMessage]);
      console.error("Yuborishda xatolik:", err);
    }
  };

  if (isHeaderLoading || isOrgLoading || deadlineLoading || plantsLoading)
    return <p className="p-4 text-lg">Yuklanmoqda...</p>;
  if (headersError || orgError || deadlineError || plantsError)
    return (
      <div className="text-red-500 p-4">
        <p>Xatolik yuz berdi</p>
        <p className="text-sm">
          {String(deadlineError || headersError || orgError || plantsError)}
        </p>
      </div>
    );

  const currentEmptyColumns = allEmptyColumnsByStep[currentStep] || [];
  const totalSteps = allEmptyColumnsByStep.length;
  const currentStepTitle =
    tableHeadersData?.[currentStep]?.title ?? `Qadam ${currentStep + 1}`;

  // 🔹 Deadline matnini formatlash funksiyasi
  const formatDeadlineText = (submitAt: string) => {
    if (!submitAt) return "Noma'lum";

    if (submitAt.includes("CHORAK")) {
      return submitAt.replace("CHORAK_", " yil ").replace("_", "-chorak");
    }

    return submitAt;
  };

  return (
    <>
      <div className="p-6">
        <Button
          className="min-w-[50px] min-h-[25px] bg-white text-black text-lg border-1 border-black"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft /> {t("back")}
        </Button>
      </div>
      <form
        onSubmit={handleSubmit}
        className={`max-w-full m-6 p-6 border rounded-lg shadow space-y-6 ${
          isSubmitting ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {formErrors.length > 0 && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
            <ul>
              {formErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-6">
          {/* ✅ DEADLINE SELECT */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div>
              <label className="block mb-1 text-lg font-medium">
                {t("deadline")}:
              </label>
              <Select
                value={selectedDeadlineId}
                onValueChange={(val) => setSelectedDeadlineId(val)}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue
                    placeholder={
                      deadlineLoading
                        ? "Yuklanmoqda..."
                        : deadlineError
                        ? "Xatolik yuz berdi"
                        : t("selectDeadline")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {deadlineLoading ? (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      Yuklanmoqda...
                    </div>
                  ) : deadlineError ? (
                    <div className="p-2 text-center text-red-500 text-sm">
                      Ma'lumotlarni yuklashda xatolik
                    </div>
                  ) : deadlineData?.results?.length > 0 ? (
                    <>
                      {deadlineData.results.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {formatDeadlineText(item.submit_at)}
                        </SelectItem>
                      ))}

                      {/* ✅ Deadline Pagination Controls */}
                      {deadlineData.count > deadlinePerPage && (
                        <div className="flex items-center justify-between px-2 py-1 border-t">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={deadlinePage === 1}
                            onClick={() =>
                              setDeadlinePage((p) => Math.max(p - 1, 1))
                            }
                          >
                            {t("before")}
                          </Button>
                          <span className="text-xs text-gray-500">
                            {deadlinePage} /{" "}
                            {Math.ceil(deadlineData.count / deadlinePerPage)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              deadlinePage >=
                              Math.ceil(deadlineData.count / deadlinePerPage)
                            }
                            onClick={() =>
                              setDeadlinePage((p) =>
                                Math.min(
                                  p + 1,
                                  Math.ceil(
                                    deadlineData.count / deadlinePerPage
                                  )
                                )
                              )
                            }
                          >
                            {t("next")}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      Deadline mavjud emas
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ✅ CURRENT STEP PLANT SELECT */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div>
              <label className="block mb-1 text-lg font-medium">
                {currentStepTitle} uchun Plant:
              </label>
              <Select value={selectedPlantId} onValueChange={handlePlantChange}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue
                    placeholder={
                      plantsLoading
                        ? "Yuklanmoqda..."
                        : plantsError
                        ? "Xatolik yuz berdi"
                        : "Tanlang"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {plantsLoading ? (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      Yuklanmoqda...
                    </div>
                  ) : plantsError ? (
                    <div className="p-2 text-center text-red-500 text-sm">
                      Ma'lumotlarni yuklashda xatolik
                    </div>
                  ) : plantsData?.results?.length > 0 ? (
                    <>
                      {plantsData.results.flatMap((category: any) => [
                        // Kategoriya (parent) ni chiqaramiz - disabled qilib qo'yamiz
                        <SelectItem
                          key={category.id}
                          value={category.id}
                          disabled
                          className="font-semibold bg-gray-100 text-gray-500 cursor-not-allowed"
                        >
                          {category.name}
                        </SelectItem>,
                        // Children larni chiqaramiz
                        ...category.children.map((child: any) => (
                          <SelectItem
                            key={child.id}
                            value={child.id}
                            className="pl-6"
                          >
                            {child.name}
                          </SelectItem>
                        )),
                      ])}

                      {/* ✅ Plants Pagination Controls */}
                      {plantsData.count > plantsPerPage && (
                        <div className="flex items-center justify-between px-2 py-1 border-t">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={plantsPage === 1}
                            onClick={() =>
                              setPlantsPage((p) => Math.max(p - 1, 1))
                            }
                          >
                            {t("before")}
                          </Button>
                          <span className="text-xs text-gray-500">
                            {plantsPage} /{" "}
                            {Math.ceil(plantsData.count / plantsPerPage)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              plantsPage >=
                              Math.ceil(plantsData.count / plantsPerPage)
                            }
                            onClick={() =>
                              setPlantsPage((p) =>
                                Math.min(
                                  p + 1,
                                  Math.ceil(plantsData.count / plantsPerPage)
                                )
                              )
                            }
                          >
                            {t("next")}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      Plant mavjud emas
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ✅ STEP TABLE */}
        {currentEmptyColumns.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="mb-4 flex justify-between">
              <h2 className="text-lg font-semibold">{currentStepTitle}</h2>
              <span className="text-sm text-gray-500">
                {currentStep + 1} / {totalSteps}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnName")}</TableHead>
                  <TableHead className="min-w-[300px]">{t("value")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentEmptyColumns.map((col) => {
                  const lowerTitle = col.title.toLowerCase();

                  if (lowerTitle.includes("reja")) {
                    const planItem = planItems.find(
                      (item) => item.columnId === col.id
                    );
                    const planValue = planItem ? planItem.plan_value : "";
                    return (
                      <TableRow key={col.id}>
                        <TableCell className="whitespace-normal break-words">
                          {col.fullParentChain}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={planValue}
                            disabled
                            className="bg-gray-100 cursor-not-allowed"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  }

                  if (lowerTitle.includes("tashkilot nomi")) {
                    return (
                      <TableRow key={col.id}>
                        <TableCell className="whitespace-normal break-words">
                          {col.fullParentChain}
                        </TableCell>
                        <TableCell>
                          <select
                            value={selectedOrganizationId}
                            onChange={(e) => {
                              setSelectedOrganizationId(e.target.value);
                              handleInputChange(col.id, e.target.value);
                            }}
                            className="w-full border rounded px-2 py-1"
                            required
                          >
                            <option value="">Tanlang</option>
                            {organizationsData?.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={col.id}>
                      <TableCell className="whitespace-normal break-words">
                        {col.fullParentChain}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={formValues[col.id] || ""}
                          onChange={(e) =>
                            handleInputChange(col.id, e.target.value)
                          }
                          required
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p>Ushbu qadamda to'ldirish uchun ustunlar yo'q.</p>
        )}

        {/* ✅ STEP BOSHQARISH */}
        <div className="flex justify-between items-center pt-4">
          <div className="space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
              disabled={currentStep === 0 || isSubmitting}
            >
              {t("before")}
            </Button>
            {currentStep < totalSteps - 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
                }
                disabled={isSubmitting}
              >
                {t("next")}
              </Button>
            )}
          </div>
          {currentStep === totalSteps - 1 && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "⏳ Yuborilmoqda..." : "Yuborish"}
            </Button>
          )}
        </div>

        {/* ✅ TANLANGAN PLANT LARNI KO'RSATISH */}
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Tanlangan Plantlar:</h3>
          {Object.entries(selectedPlantsByStep).map(([step, plantId]) => {
            const plant = plantsData?.results
              ?.flatMap((category: any) => category.children || [])
              .find((child: any) => child.id === plantId);

            return (
              <div key={step} className="text-sm">
                {parseInt(step) + 1}-qadam: {plant?.name || "Tanlanmagan"}
              </div>
            );
          })}
        </div>
      </form>
    </>
  );
}

export default PlantCreate;
