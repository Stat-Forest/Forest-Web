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
import { useState, useEffect } from "react"; // ✅ useEffect qo'shildi
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

// persistor
import { persistor } from "@/app/store";
import { NavLink } from "react-router-dom";

interface HeaderProps {
  onLogout?: () => void;
}

function Header({ onLogout }: HeaderProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // ✅ Local storage'dan o'qilgan notification count
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const currentLang = useSelector((state: RootState) => state.language.lang);

  // Notification data
  const { data, error, isLoading } = useGetNotificationReportsQuery({
    lang: currentLang,
  });

  // ✅ Component yuklanganda local storage'dan notification count ni o'qiymiz
  useEffect(() => {
    const savedCount = localStorage.getItem("unreadNotificationCount");
    if (savedCount) {
      setUnreadCount(parseInt(savedCount, 10));
    }
  }, []);

  // ✅ Yangi notificationlar kelganda local storage'ga saqlaymiz
  useEffect(() => {
    if (data?.results?.length !== undefined) {
      const count = data.results.length;
      setUnreadCount(count);
      localStorage.setItem("unreadNotificationCount", count.toString());
    }
  }, [data?.results?.length]);

  // ✅ Notification ochilganda count ni 0 qilamiz
  const handleNotificationOpen = (open: boolean) => {
    setNotificationOpen(open);
    if (!open) {
      // Notification yopilganda count ni 0 qilamiz va local storage'dan o'chiramiz
      setUnreadCount(0);
      localStorage.removeItem("unreadNotificationCount");
    }
  };

  const handleLogout = () => {
    // 🔐 Logout paytida notification count ni ham tozalaymiz
    localStorage.removeItem("unreadNotificationCount");

    dispatch(logout());
    dispatch(authApi.util.resetApiState());
    dispatch(reportApi.util.resetApiState());
    dispatch(generalApi.util.resetApiState());
    dispatch(statistikApi.util.resetApiState());
    dispatch(sumApi.util.resetApiState());

    persistor.purge();
    navigate("/login");

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
        <div>
          <span className="text-[18px]">
            {t("technical_inquiries")}:
            <NavLink
              className={"text-[#09B86F] px-2"}
              to={"tel:+998 71 207 88 77 (1010)"}
            >
              +998 71 207 88 77 ({t("phone_extension")}: 1010)
            </NavLink>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Button with Sheet */}
          <Sheet open={notificationOpen} onOpenChange={handleNotificationOpen}>
            <SheetTrigger asChild>
              <Button
                className="h-[42px] w-[42px] bg-transparent border-1 text-gray-600 hover:text-[#09B86F] hover:bg-gray-100 relative"
                variant="outline"
              >
                <Bell size={20} />
                {/* ✅ Local storage'dan o'qilgan count ni ko'rsatamiz */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t("notifications")}</SheetTitle>
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
                    {data.results.map((notification: any) => (
                      <Card
                        key={notification.id}
                        className="hover:shadow-lg transition-shadow duration-300"
                      >
                        <CardContent className="pt-3">
                          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                            {notification.text}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-gray-500">{t("no_notifications")}</p>
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
