import { useState, useMemo, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useTranslation } from "react-i18next";
import { OrganizationSelectProps } from "@/types/commonTypes";
import { filterBySearchPriority } from "@/utils/search";
import { useDebounce } from "@/utils/useDebounce";

export function OrganizationSelect({
  value,
  onValueChange,
  label,
  placeholder,
  className = "w-full",
  disabled = false,
  required = false,
}: OrganizationSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const lang = useSelector((state: RootState) => state.language.lang);
  const { t } = useTranslation();

  const {
    data: organizations,
    isLoading: isOrgLoading,
    error: orgError,
  } = useGetOrganizationReportsQuery({ lang });

  const filteredOrganizations = useMemo(() => {
    return filterBySearchPriority(
      organizations,
      debouncedSearchTerm,
      (item: any) => item?.name
    );
  }, [organizations, debouncedSearchTerm]);

  useEffect(() => {
    if (!open && searchTerm) {
      setSearchTerm("");
    }
  }, [open, searchTerm]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const firstMatch = filteredOrganizations[0];
      if (firstMatch?.id) {
        onValueChange(String(firstMatch.id));
        setOpen(false);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSearchTerm("");
    }
  };

  return (
    <div className={className}>
      {label && (
        <Label className="pb-1.5 text-md block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select
        value={value ?? ""}
        onValueChange={onValueChange}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled || isOrgLoading}
      >
        <SelectTrigger className="w-full min-h-[45px]">
          <SelectValue placeholder={placeholder || t("selectOrganization")} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <div className="relative">
              <Input
                placeholder="Izlash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full mb-2 pr-10"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm("");
                  }}
                  aria-label={t("clear") || "Clear"}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="pb-1 text-xs text-gray-500">
                {filteredOrganizations.length} ta natija
              </div>
            )}
          </div>

          {isOrgLoading && (
            <div className="text-center text-sm py-2">{t("loading")}</div>
          )}
          {orgError && (
            <div className="text-center text-sm text-red-500 py-2">
              {t("error_occurred")}
            </div>
          )}
          {filteredOrganizations.length > 0 ? (
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
  );
}

