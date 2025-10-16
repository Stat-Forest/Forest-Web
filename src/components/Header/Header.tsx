import { LogOut, User2, VideoIcon, Bell } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/features/authSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { RootState } from "@/app/store";
import { setLanguage } from "@/features/languageSlice";
import { useState } from "react";
import ChangePasswordModal from "../Modals/ChangePasswordModal";

// RTK Query APIs
import { authApi } from "@/services/authApi";
import { reportApi } from "@/services/reportsApi";
import {
  generalApi,
  useGetNotificationReportsQuery,
} from "@/services/generalApi";
import { statistikApi } from "@/services/statistikApi";
import { sumApi } from "@/services/sumApi";

// UI Components for notifications
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

// persistor
import { persistor } from "@/app/store";

interface HeaderProps {
  onLogout?: () => void; // ✅ tashqaridan logout paytida ishlaydigan callback
}

function Header({ onLogout }: HeaderProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const currentLang = useSelector((state: RootState) => state.language.lang);

  // Notification data
  const { data, error, isLoading } = useGetNotificationReportsQuery({
    lang: currentLang,
  });

  const handleLogout = () => {
    // 🔐 Redux auth ni tozalaymiz
    dispatch(logout());

    // 🔁 RTK Query cache larni tozalaymiz
    dispatch(authApi.util.resetApiState());
    dispatch(reportApi.util.resetApiState());
    dispatch(generalApi.util.resetApiState());
    dispatch(statistikApi.util.resetApiState());
    dispatch(sumApi.util.resetApiState());

    // 🧹 Redux persist ni tozalaymiz
    persistor.purge();

    // ⏩ Login sahifasiga yo'naltiramiz
    navigate("/login");

    // 🔔 Agar onLogout prop kelsa, uni ishga tushiramiz
    if (onLogout) onLogout();
  };

  const handleChangeLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    dispatch(setLanguage(lang));

    const currentPath = location.pathname.split("/");
    currentPath[1] = lang;
    navigate(currentPath.join("/"));
  };

  return (
    <>
      <div className="h-[70px] shadow flex items-center justify-between px-3">
        <div></div>

        <div className="flex items-center gap-3">
          {/* Notification Button with Sheet */}
          <Sheet open={notificationOpen} onOpenChange={setNotificationOpen}>
            <SheetTrigger asChild>
              <Button
                className="h-[42px] w-[42px] bg-transparent border-1 text-gray-600 hover:text-[#09B86F] hover:bg-gray-100 relative"
                variant="outline"
              >
                <Bell size={20} />
                {data?.results?.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {data.results.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle></SheetTitle>
              </SheetHeader>

              <div className="m-2">
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-gray-500">{t("loading")}</p>
                  </div>
                ) : error ? (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-red-500">{t("error")}</p>
                  </div>
                ) : data?.results?.length ? (
                  <div className="space-y-4 overflow-y-auto flex flex-col">
                    {data.results.map((notification: any, index: number) => (
                      <Card
                        key={notification.id}
                        className="hover:shadow-lg transition-shadow duration-300"
                      >
                        <CardContent className="pt-3">
                          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                            {notification.text}
                          </p>
                          <Separator className="my-2" />
                          <div className="flex justify-between items-center">
                            <Badge variant="secondary" className="text-sm">
                              {notification.date}
                            </Badge>
                            <span className="text-gray-400 text-sm">
                              #{index + 1}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-gray-500">
                      Bildirishnomalar mavjud emas.
                    </p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button
            className="bg-[#09B86F] h-[42px] w-[170px] hover:bg-[#09B86F]"
            onClick={() => navigate("/video")}
          >
            <VideoIcon />
            {t("item_65")}
          </Button>

          <Select value={currentLang} onValueChange={handleChangeLang}>
            <SelectTrigger className="w-[120px] min-h-[42px] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uz">O'zbek</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
            </SelectContent>
          </Select>

          <span>|</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-[40px] w-[40px] rounded-full bg-transparent border-1 text-[#09B86F] hover:text-[white] hover:bg-[#09B86F]">
                <User2 size={38} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 mt-2 mr-2">
              <DropdownMenuItem onClick={() => setOpen(true)}>
                <User2 color="#09B86F" />
                {t("item_81")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut color="#FF5445" />
                {t("item_80")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="h-[40px] w-[40px] bg-transparent border-1 hover:bg-[#FF5445] text-[#FF5445] hover:text-[white]"
            onClick={handleLogout}
          >
            <LogOut />
          </Button>
        </div>
      </div>

      <ChangePasswordModal open={open} setOpen={setOpen} />
    </>
  );
}

export default Header;
