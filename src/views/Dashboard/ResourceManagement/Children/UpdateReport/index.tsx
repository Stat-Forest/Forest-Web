import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetDeadlinesReportQuery,
  useGetReportByIdQuery,
} from "@/services/reportsApi";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function UpdateReportItem() {
  const { id } = useParams();
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string>();

  const {
    data: deadlines_list,
    isLoading: isDeadlinesLoading,
    error: deadlinesError,
  } = useGetDeadlinesReportQuery();

  const {
    data: get_by_id,
    isLoading: get_by_id_loading,
    error: get_by_id_error,
  } = useGetReportByIdQuery(id!);

  // deadline id ni selected holatda ko‘rsatish uchun
  useEffect(() => {
    if (get_by_id?.deadline) {
      setSelectedDeadlineId(get_by_id.deadline); // bu yerda deadline bu id
    }
  }, [get_by_id]);

  if (isDeadlinesLoading || get_by_id_loading)
    return <p className="p-4 text-lg">Yuklanmoqda...</p>;

  if (deadlinesError || get_by_id_error)
    return (
      <div className="text-red-500 p-4">
        <p>Xatolik yuz berdi:</p>
        <ul className="list-disc list-inside">
          {deadlinesError && <li>Deadline ma'lumotlarini yuklashda xatolik</li>}
          {get_by_id_error && <li>Report ma'lumotlarini yuklashda xatolik</li>}
        </ul>
      </div>
    );

  // 💡 Tanlangan deadline submit_at ni topamiz (value uchun emas, faqat SelectValue ko‘rinishi uchun)
  const selectedDeadline = deadlines_list?.results.find(
    (d: any) => d.id === selectedDeadlineId
  );

  return (
    <form>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div>
          <label className="block mb-1 text-sm font-medium">Deadline:</label>
          <Select
            value={selectedDeadlineId}
            onValueChange={setSelectedDeadlineId}
            required
          >
            <SelectTrigger className="w-[300px] text-base">
              <SelectValue placeholder="Tanlang">
                {selectedDeadline?.submit_at}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {deadlines_list?.results.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.submit_at}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </form>
  );
}

export default UpdateReportItem;
