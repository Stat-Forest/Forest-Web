// components/DeadlineSelect.tsx
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  
  export default function DeadlineSelect({
    selectedDeadlineId,
    setSelectedDeadlineId,
    deadlines,
  }: {
    selectedDeadlineId: string;
    setSelectedDeadlineId: (id: string) => void;
    deadlines: any[];
  }) {
    return (
      <div>
        <label className="block mb-1 text-sm font-medium">Deadline:</label>
        <Select value={selectedDeadlineId} onValueChange={setSelectedDeadlineId} required>
          <SelectTrigger className="w-[300px] text-base">
            <SelectValue placeholder="Tanlang" />
          </SelectTrigger>
          <SelectContent>
            {deadlines.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.submit_at}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  