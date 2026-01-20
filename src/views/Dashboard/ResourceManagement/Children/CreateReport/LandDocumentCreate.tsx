import { ArrowLeft, Upload, FileText, X, CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useGetOrganizationReportsQuery,
  useLandDocumentCreateMutation,
} from "@/services/generalApi";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { DocumentType } from "@/services/constants";

function LandDocumentCreate() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState<Date>();
  const { t } = useTranslation();
  const lang = useSelector((state: RootState) => state.language.lang);
  const [landDocumentCreate] = useLandDocumentCreateMutation();

  const {
    data: organization,
    isLoading: organization_loading,
    error: organization_error,
  } = useGetOrganizationReportsQuery({ lang });

  const filteredOrganizations = organization?.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !date || !selectedOrg) {
      alert("Majburiy maydonlarni to‘ldiring!");
      return;
    }

    const form = e.target as HTMLFormElement;
    const nameInput = form.elements.namedItem("name") as HTMLInputElement;
    const typeInput = form.elements.namedItem(
      "document_type"
    ) as HTMLSelectElement;
    const commentInput = form.elements.namedItem(
      "comment"
    ) as HTMLTextAreaElement;

    const formData = new FormData();
    formData.append("name", nameInput.value);
    formData.append("date", format(date, "dd.MM.yyyy"));
    formData.append("document_type", typeInput.value);
    formData.append("organization", selectedOrg);
    formData.append("comment", commentInput.value || "");
    formData.append("file", selectedFile);

    console.log(formData)
    console.log(selectedFile)

    try {
      await landDocumentCreate(formData).unwrap();
      alert("Hujjat yaratildi!");
      navigate(-1);
      console.log(formData)
    } catch (error) {
      console.error(error);
      alert("Xatolik yuz berdi!");
      console.log(formData)
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="container mx-auto p-6 rounded-xl max-w-4xl bg-ice">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Yer Hujjati Yaratish
          </h1>
          <p className="text-muted-foreground">
            Tizimga yangi yer hujjatini qo'shing
          </p>
        </div>
      </div>

      {/* Formula bo'limi */}
      <Card>
        <CardHeader>
          <CardTitle>Hujjat Ma'lumotlari</CardTitle>
          <CardDescription>
            Yer hujjati tafsilotlarini kiriting. Belgilanmagan maydonlar
            ixtiyoriy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Hujjat Nomi *
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Hujjat nomini kiriting"
                className="h-11"
                required
              />
            </div>

            {/* Date and Document Type Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium">
                  Sana *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-11 justify-start text-left font-normal bg-ice hover:bg-gray-50/50 border-gray-300",
                        !date && "text-gray-500"
                      )}
                    >
                      <CalendarIcon className="mr-3 h-4 w-4 text-gray-500" />
                      {date ? (
                        <span className="text-gray-900">
                          {format(date, "dd MMMM, yyyy", { locale: uz })}
                        </span>
                      ) : (
                        <span className="text-gray-500">Sana tanlang</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 shadow-lg border border-gray-200 rounded-lg">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      locale={uz}
                      className="rounded-md"
                      classNames={{
                        months:
                          "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4",
                        caption:
                          "flex justify-center pt-1 relative items-center",
                        caption_label: "text-sm font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: cn(
                          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                        ),
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell:
                          "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                        row: "flex w-full mt-2",
                        cell: cn(
                          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-gray-100",
                          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
                        ),
                        day: cn(
                          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md",
                          "flex items-center justify-center transition-colors"
                        ),
                        day_selected:
                          "bg-blue-600 text-white hover:bg-blue-700 hover:text-white",
                        day_today: "bg-gray-100 text-gray-900",
                        day_outside: "text-gray-400 opacity-50",
                        day_disabled: "text-gray-400 opacity-50",
                        day_range_middle:
                          "aria-selected:bg-gray-100 aria-selected:text-gray-900",
                        day_hidden: "invisible",
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <input
                  type="hidden"
                  name="date"
                  value={date ? format(date, "yyyy-MM-dd") : ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_type" className="text-sm font-medium">
                  Hujjat Turi *
                </Label>
                <Select name="document_type" required>
                  <SelectTrigger className="h-11 bg-ice border-gray-300">
                    <SelectValue placeholder="Hujjat turini tanlang" />
                  </SelectTrigger>
                  <SelectContent className="bg-ice border-gray-200 shadow-lg">
                    {DocumentType.map((doc_type: any, index: number) => (
                      <SelectItem key={index} value={doc_type.value}>
                        {doc_type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Organization */}
            <div className="w-full">
              <Label className="pb-1.5 text-md block">{t("item_12")}</Label>
              <Select
                name="organization"
                value={selectedOrg ?? ""}
                onValueChange={setSelectedOrg}
              >
                <SelectTrigger className="w-full min-h-[45px]">
                  <SelectValue placeholder={t("selectOrganization")} />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Izlash..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full mb-2"
                    />
                  </div>

                  {organization_loading && (
                    <div className="text-center text-sm py-2">
                      {t("loading")}
                    </div>
                  )}
                  {organization_error && (
                    <div className="text-center text-sm text-red-500 py-2">
                      {t("error_occurred")}
                    </div>
                  )}
                  {filteredOrganizations?.length > 0 ? (
                    filteredOrganizations.map((item: any) => (
                      <SelectItem key={item?.id} value={String(item?.id)}>
                        {item.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="text-center text-sm text-gray-500 py-2">
                      {t("noThingsFound")}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm font-medium">
                Izoh (Ixtiyoriy)
              </Label>
              <Textarea
                id="comment"
                name="comment"
                placeholder="Qo'shimcha izoh yoki eslatmalar qoldiring"
                className="min-h-[100px] resize-none border-gray-300"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <Label htmlFor="file" className="text-sm font-medium">
                Fayl Yuklash *
              </Label>

              {selectedFile ? (
                // Selected File Preview
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-gray-900">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                // File Upload Area
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 transition-colors hover:border-blue-400 hover:bg-blue-50/50">
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    required
                  />
                  <Label
                    htmlFor="file"
                    className="cursor-pointer flex flex-col items-center gap-4"
                  >
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center transition-colors group-hover:bg-blue-200">
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="text-center space-y-2">
                      <div className="text-lg font-semibold text-gray-900">
                        Faylni yuklash uchun bosing
                      </div>
                      <p className="text-sm text-gray-600">
                        yoki faylni shu yerga sudrab keling
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, DOCX, JPG, PNG (Maks. 10MB)
                      </p>
                    </div>
                  </Label>
                </div>
              )}

              {/* File Info */}
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>
                    Fayl muvaffaqiyatli yuklandi. Boshqa fayl yuklash uchun
                    yuqoridagi faylni o'chiring.
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="min-w-24 h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                className="min-w-24 h-11 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!selectedFile || !date}
              >
                Hujjat Yaratish
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LandDocumentCreate;
