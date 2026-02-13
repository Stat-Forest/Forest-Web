import { RootState } from "@/app/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import {
  useGetReportPlantByIdQuery,
  usePatchPlantReportMutation,
} from "@/services/reportsApi";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

function PlantUpdate() {
  const { id } = useParams<{ id: any }>();
  const lang = useSelector((state: RootState) => state.language.lang);

  const [plantUpdateReport] = usePatchPlantReportMutation();

  const {
    data: plantData,
    isLoading: isPlantLoading,
    isError: isPlantError,
  } = useGetReportPlantByIdQuery({ id, is_user_input: "true" });

  const { isLoading: isOrgLoading, isError: isOrgError } =
    useGetOrganizationReportsQuery({ lang });

  const [values, setValues] = useState<Record<number, string>>({});

  // 🔹 Initial value larni joylash
  useEffect(() => {
    const initialValues: Record<number, string> = {};

    plantData?.report_items?.forEach((item: any) => {
      item.statement_columns.forEach((col: any) => {
        col.inners?.forEach((inner: any) => {
          initialValues[inner.id] = inner.value ?? "";
        });
      });
    });

    setValues(initialValues);
  }, [plantData]);

  const handleChange = (id: number, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleBlur = async (id: number) => {
    await plantUpdateReport({
      inner_id: id,
      value: values[id],
    });
  };

  if (isPlantLoading || isOrgLoading) return <div>Yuklanmoqda...</div>;
  if (isPlantError || isOrgError) return <div>Xatolik yuz berdi</div>;

  return (
    <div className="p-5 bg-white rounded-lg shadow-md">
      <Table className="border border-black">
        <TableHeader>
          <TableRow>
            <TableHead className="border border-black">
              Statement column
            </TableHead>
            <TableHead className="border border-black">Value</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {plantData?.report_items?.map((reportItem: any) =>
            reportItem.statement_columns.map((column: any) => (
              <TableRow key={`${reportItem.id}-${column.statement_column_id}`}>
                <TableCell className="border border-black whitespace-normal break-words">
                  {column.statement_column_name}
                </TableCell>

                <TableCell className="border border-black">
                  <div className="flex flex-col gap-2">
                    {column.inners?.map((inner: any) => (
                      <div
                        key={inner.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-sm text-gray-700">
                          {inner.plant_name ?? "—"}
                        </span>

                        <input
                          className="border border-black px-2 py-1 rounded-sm w-32"
                          type="text"
                          value={values[inner.id] ?? ""}
                          onChange={(e) =>
                            handleChange(inner.id, e.target.value)
                          }
                          onBlur={() => handleBlur(inner.id)}
                        />
                      </div>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default PlantUpdate;
