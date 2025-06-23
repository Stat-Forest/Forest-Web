// components/StepTable.tsx
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StepTableProps = {
  columns: { id: string; title: string; fullParentChain: string }[];
  planListMap: Record<string, number>;
  formValues: Record<string, any>;
  handleInputChange: (id: string, value: any) => void;
  selectedOrganizationId: string;
  setSelectedOrganizationId: (id: string) => void;
  organizationsData: any;
};

export default function StepTable({
  columns,
  planListMap,
  formValues,
  handleInputChange,
  selectedOrganizationId,
  setSelectedOrganizationId,
  organizationsData,
}: StepTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ustun nomi</TableHead>
          <TableHead className="min-w-[300px]">Qiymat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {columns.map((col) => {
          if (col.title.toLowerCase().includes("reja")) {
            return (
              <TableRow key={col.id}>
                <TableCell>{col.fullParentChain}</TableCell>
                <TableCell>
                  <Input
                    value={planListMap[col.id] ?? ""}
                    disabled
                    className="bg-gray-100"
                  />
                </TableCell>
              </TableRow>
            );
          }
          if (col.title.toLowerCase().includes("tashkilot")) {
            return (
              <TableRow key={col.id}>
                <TableCell>{col.fullParentChain}</TableCell>
                <TableCell>
                  <select
                    value={selectedOrganizationId}
                    onChange={(e) => {
                      handleInputChange(col.id, e.target.value);
                      setSelectedOrganizationId(e.target.value);
                    }}
                    className="w-full border rounded px-2 py-1"
                    required
                  >
                    <option value="">Tanlang</option>
                    {organizationsData?.results.map((item: any) => (
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
              <TableCell>{col.fullParentChain}</TableCell>
              <TableCell>
                <Input
                  type="text"
                  value={formValues[col.id] || "15"}
                  onChange={(e) => handleInputChange(col.id, e.target.value)}
                  required
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
