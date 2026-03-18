import {
  LogOut,
  User2,
  VideoIcon,
  Bell,
  PanelLeftClose,
  PanelRightClose,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
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
import { useEffect, useMemo, useState } from "react";
import ChangePasswordModal from "../Modals/ChangePasswordModal";
import { getSimpleCookie, setSimpleCookie, removeCookie } from "@/utils/cookie";

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
import { toggleSidebar } from "@/features/sidebarSlice";
import { setHeaderState } from "@/features/uiSlice";

interface HeaderProps {
  onLogout?: () => void;
}

function Header({ onLogout }: HeaderProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const isOpen = useSelector((state: RootState) => state.sidebar.isOpen);
  const { changePasswordOpen, notificationOpen, unreadCount } = useSelector(
    (state: RootState) => state.ui.header,
  );
  const currentLang = useSelector((state: RootState) => state.language.lang);

  type BackgroundPreset = {
    key: string;
    label: string;
    kind: "default" | "gradient" | "image";
    preview: string; // backgroundImage value
    apply?: {
      backgroundImage?: string;
      backgroundColor?: string;
    };
  };

  const backgroundPresets: BackgroundPreset[] = useMemo(
    () =>
      [
        {
          key: "default",
          label: "Asl fon",
          kind: "default",
          preview:
            "linear-gradient(135deg, #1D4ED8 0%, #EFF6FF 50%, #1D4ED8 100%)",
          apply: {
            backgroundImage:
              "linear-gradient(135deg, #1D4ED8 0%, #EFF6FF 50%, #1D4ED8 100%)",
            backgroundColor: "transparent",
          },
        },
        {
          key: "mesh",
          label: "Mesh Gradient",
          kind: "gradient",
          preview:
            "radial-gradient(at 20% 30%, rgba(59,130,246,0.35) 0px, transparent 55%), radial-gradient(at 80% 20%, rgba(16,185,129,0.28) 0px, transparent 55%), radial-gradient(at 30% 85%, rgba(168,85,247,0.22) 0px, transparent 55%), linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 60%, #ECFEFF 100%)",
          apply: {
            backgroundImage:
              "radial-gradient(at 20% 30%, rgba(59,130,246,0.35) 0px, transparent 55%), radial-gradient(at 80% 20%, rgba(16,185,129,0.28) 0px, transparent 55%), radial-gradient(at 30% 85%, rgba(168,85,247,0.22) 0px, transparent 55%), linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 60%, #ECFEFF 100%)",
            backgroundColor: "transparent",
          },
        },
        {
          key: "green_forest",
          label: "Yashil o‘rmon",
          kind: "image",
          preview:
            "url(https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=60)",
          apply: {
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.10), rgba(0,0,0,0.22)), url(https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=70)",
            backgroundColor: "#0b1220",
          },
        },
        {
          key: "foggy_mountains",
          label: "Tumanli tog‘lar",
          kind: "image",
          preview:
            "url(https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=1200&q=60)",
          apply: {
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.10), rgba(0,0,0,0.26)), url(https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=2400&q=70)",
            backgroundColor: "#0b1220",
          },
        },
      ],
    [],
  );

  const [selectedBg, setSelectedBg] = useState<string>(() => {
    if (typeof window === "undefined") return "default";
    return localStorage.getItem("app_background_preset") || "default";
  });

  const applyBackground = (presetKey: string) => {
    const preset = backgroundPresets.find((p) => p.key === presetKey);
    if (!preset) return;

    setSelectedBg(presetKey);
    localStorage.setItem("app_background_preset", presetKey);

    document.body.style.backgroundImage =
      preset.apply?.backgroundImage ?? preset.preview;
    document.body.style.backgroundColor =
      preset.apply?.backgroundColor ?? "transparent";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundSize = "cover";
  };

  // Notification data
  const { data, error, isLoading } = useGetNotificationReportsQuery({
    lang: currentLang,
  });

  useEffect(() => {
    applyBackground(selectedBg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Component yuklanganda cookie'dan notification count ni o'qiymiz
  useEffect(() => {
    const savedCount = getSimpleCookie("unreadNotificationCount");
    if (savedCount) {
      dispatch(setHeaderState({ unreadCount: parseInt(savedCount, 10) || 0 }));
    }
  }, [dispatch]);

  // ✅ Yangi notificationlar kelganda cookie'ga saqlaymiz
  useEffect(() => {
    if (data?.results?.length !== undefined) {
      const count = data.results.length;
      dispatch(setHeaderState({ unreadCount: count }));
      setSimpleCookie("unreadNotificationCount", count.toString(), 7); // 7 kun muddat
    }
  }, [data?.results?.length, dispatch]);

  // ✅ Notification ochilganda count ni 0 qilamiz
  const handleNotificationOpen = (open: boolean) => {
    dispatch(setHeaderState({ notificationOpen: open }));
    if (!open) {
      // Notification yopilganda count ni 0 qilamiz va cookie'dan o'chiramiz
      dispatch(setHeaderState({ unreadCount: 0 }));
      removeCookie("unreadNotificationCount");
    }
  };

  const handleLogout = () => {
    // 🔐 Logout paytida notification count ni ham tozalaymiz
    removeCookie("unreadNotificationCount");

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
      <div className="h-[70px] shadow flex items-center justify-between px-3 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => dispatch(toggleSidebar())}>
            {isOpen ? (
              <PanelLeftClose color="black" className="cursor-pointer" />
            ) : (
              <PanelRightClose color="black" className="cursor-pointer" />
            )}
          </button>

          <span className="text-[18px] text-black">
            {t("technical_inquiries")}:
            <NavLink
              className={"text-blue-600 px-2"}
              to={"tel:+998 71 207 88 77 (1010)"}
            >
              +998 71 207 88 77 ({t("phone_extension")}: 1010)
            </NavLink>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-[45px] w-[45px] bg-transparent text-[#3B82F6] hover:text-[white] hover:bg-[#3B82F6]">
                  <SlidersHorizontal size={30} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[420px] mt-3 mr-2 p-6 rounded-[28px] border border-slate-200 bg-white shadow-xl">
                <div className="text-center font-extrabold tracking-wide text-[18px] text-slate-900">
                  FONNI TANLASH
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  {backgroundPresets.map((p) => {
                    const isSelected = selectedBg === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => applyBackground(p.key)}
                        className={[
                          "relative h-[92px] rounded-2xl overflow-hidden border transition-all",
                          isSelected
                            ? "border-blue-500 ring-2 ring-blue-500/30"
                            : "border-slate-200 hover:border-slate-300",
                        ].join(" ")}
                        style={{
                          backgroundImage: p.preview,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <div className="absolute inset-0 bg-black/0" />
                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <div className="text-left text-[14px] font-semibold text-white drop-shadow">
                            {p.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => navigate("/ai-background")}
                    className="w-full h-[48px] rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white font-extrabold tracking-wide flex items-center justify-center gap-2 hover:opacity-95"
                  >
                    <Sparkles size={18} color="#fff" />
                    AI FON YARATISH
                  </button>
                </div>

                <div className="my-4 h-px bg-slate-200" />
               
              </DropdownMenuContent>
            </DropdownMenu>
          </button>
          <button className="bg-[#4f46e5] px-5 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-[#8379ee]">
            <Sparkles size={18} color="#fff" />{" "}
            <span className="text-white font-bold ">AI tahlil</span>
          </button>
          {/* Notification Button with Sheet */}
          <Sheet open={notificationOpen} onOpenChange={handleNotificationOpen}>
            <SheetTrigger asChild>
              <Button
                className="h-[42px] w-[42px] bg-white/80 border-1 text-gray-600 hover:text-[#3B82F6] hover:bg-gray-100 relative"
                variant="outline"
              >
                <Bell size={20} color="blue" />
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
            className="bg-[#3B82F6] h-[42px] w-[170px] hover:bg-[#2563EB]"
            onClick={() => navigate("/video")}
          >
            <VideoIcon />
            {t("item_65")}
          </Button>

          <Select value={currentLang} onValueChange={handleChangeLang}>
            <SelectTrigger className="w-[120px] bg-white/80 text-blue-800 min-h-[42px] shadow-none">
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
              <Button className="h-[40px] w-[40px] rounded-full bg-white/80 border-1 text-[#3B82F6] hover:text-[white] hover:bg-[#3B82F6]">
                <User2 size={38} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 mt-2 mr-2">
              <DropdownMenuItem
                onClick={() =>
                  dispatch(setHeaderState({ changePasswordOpen: true }))
                }
              >
                <User2 color="#3B82F6" />
                {t("item_81")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut color="#FF5445" />
                {t("item_80")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="h-[40px] w-[40px] bg-white/80 border-1 hover:bg-[#FF5445] text-[#FF5445] hover:text-[white]"
            onClick={handleLogout}
          >
            <LogOut />
          </Button>
        </div>
      </div>

      <ChangePasswordModal
        open={changePasswordOpen}
        setOpen={(value) =>
          dispatch(setHeaderState({ changePasswordOpen: value }))
        }
      />
    </>
  );
}

export default Header;
