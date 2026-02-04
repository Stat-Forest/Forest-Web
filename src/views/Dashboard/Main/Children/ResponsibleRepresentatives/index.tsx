import { useState } from "react";
import ResponsibleRepresentativesTable from "@/components/Table/TableReports/ResponsibleRepresentativesTable";
import { useGetUsersReportQuery } from "@/services/reportsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetOrganizationReportsQuery } from "@/services/generalApi";
import { t } from "i18next";
import i18n from "@/i18n";
import { USER_ROLE } from "@/services/constants";
export const user_role = import.meta.env.USER_ROLE;

function ResponsibleRepresentatives() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const perPage = 20;
  const lang = i18n.language;

  /* USERS */
  const {
    data: users,
    isLoading: isUsersLoading,
    isFetching: isUsersFetching,
    error: usersError,
  } = useGetUsersReportQuery({
    page,
    perPage,
    role: selectedRole,
    search: searchTerm,
    organization: selectedOrganization,
  });

  /* ORGANIZATIONS */
  const { data: organizations } = useGetOrganizationReportsQuery({
    lang,
  });

  const totalPages = Math.ceil((users?.count || 0) / perPage);
  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, users?.count || 0);

  const handleNextPage = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          size="sm"
          variant={page === i ? "default" : "outline"}
          onClick={() => setPage(i)}
          disabled={isUsersFetching}
        >
          {i}
        </Button>,
      );
    }
    return pages;
  };

  return (
    <div className="p-5 w-full bg-white">
      {/* FILTERS */}
      <div className="pb-5 flex gap-3">
        <Input
          placeholder={`${t("item_79")}...`}
          className="w-[260px] text-xl border-black"
          value={searchTerm}
          onChange={(e) => {
            setPage(1);
            setSearchTerm(e.target.value);
          }}
        />

        <Select
          value={selectedOrganization}
          onValueChange={(value) => {
            setPage(1);
            setSelectedOrganization(value);
          }}
        >
          <SelectTrigger className="w-[260px] text-xl border-black">
            <SelectValue placeholder={t("selectOrganization")} />
          </SelectTrigger>
          <SelectContent>
            {organizations?.map((org: any) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedRole}
          onValueChange={(value) => {
            setPage(1);
            setSelectedRole(value);
          }}
        >
          <SelectTrigger className="w-[260px] text-xl border-black">
            <SelectValue placeholder={t("role")} />
          </SelectTrigger>

          <SelectContent>
            {USER_ROLE.map((role) => (
              <SelectItem key={role} value={role}>
                {t(`roles.${role}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => {
          setPage(1);
          setSearchTerm("");
          setSelectedOrganization("");
          setSelectedRole("");
        }}>
          {t("reset")}
        </Button>
      </div>

      {/* CONTENT */}
      {isUsersLoading ? (
        <div className="h-40 flex items-center justify-center">
          Yuklanmoqda...
        </div>
      ) : usersError ? (
        <div className="h-40 flex items-center justify-center text-red-500">
          Xatolik yuz berdi!
        </div>
      ) : users?.results?.length ? (
        <div className="border rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-3">
            {startItem}-{endItem} / {users.count}
          </div>

          <ResponsibleRepresentativesTable
            data={users.results}
            currentPage={page}
            perPage={perPage}
          />

          {/* PAGINATION */}
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={handlePrevPage}
            >
              {t("before")}
            </Button>

            <div className="flex gap-1">{renderPageNumbers()}</div>

            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={handleNextPage}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center text-gray-500">
          Foydalanuvchilar topilmadi
        </div>
      )}

      {isUsersFetching && !isUsersLoading && (
        <div className="text-center mt-3">Yuklanmoqda...</div>
      )}
    </div>
  );
}

export default ResponsibleRepresentatives;
