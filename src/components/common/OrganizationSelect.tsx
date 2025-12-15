import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useTranslation } from "react-i18next";
import { OrganizationSelectProps } from "@/types/commonTypes";

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
  const lang = useSelector((state: RootState) => state.language.lang);
  const { t } = useTranslation();

  const {
    data: organizations,
    isLoading: isOrgLoading,
    error: orgError,
  } = useGetOrganizationReportsQuery({ lang });

  const filteredOrganizations = useMemo(() => {
    if (!organizations) return [];
    return organizations.filter((item: any) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [organizations, searchTerm]);

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
        disabled={disabled || isOrgLoading}
      >
        <SelectTrigger className="w-full min-h-[45px]">
          <SelectValue placeholder={placeholder || t("selectOrganization")} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              placeholder="Izlash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full mb-2"
              onClick={(e) => e.stopPropagation()}
            />
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

