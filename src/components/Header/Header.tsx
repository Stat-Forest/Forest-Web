import {
  LogOut,
  User2,
  VideoIcon,
  Bell,
  BellOff,
  PanelLeftClose,
  PanelRightClose,
  Sparkles,
  SlidersHorizontal,
  Sun,
  Moon,
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
import { useLogoutMutation } from "@/services/authApi";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { RootState } from "@/app/store";
import { setLanguage } from "@/features/languageSlice";
import { useEffect, useMemo, useState } from "react";
import ChangePasswordModal from "../Modals/ChangePasswordModal";
import LogoutConfirmModal from "../Modals/LogoutConfirmModal";
import { getSimpleCookie, setSimpleCookie, removeCookie } from "@/utils/cookie";
import backimg1 from "@/assets/img/backimg1.webp";
import backimg2 from "@/assets/img/backimg2.webp";

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
import { Card } from "../ui/card";

// persistor
import { persistor } from "@/app/store";
import { NavLink } from "react-router-dom";
import { toggleSidebar } from "@/features/sidebarSlice";
import { setHeaderState } from "@/features/uiSlice";
import AiModal from "../Modals/AiModal";

interface HeaderProps {
  onLogout?: () => void;
}

function Header({ onLogout }: HeaderProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const isOpen = useSelector((state: RootState) => state.sidebar.isOpen);
  const [aiOpen, setAiOpen] = useState(false);
  const [logoutRequest] = useLogoutMutation();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const { changePasswordOpen, notificationOpen, unreadCount } = useSelector(
    (state: RootState) => state.ui.header,
  );
  const currentLang = useSelector((state: RootState) => state.language.lang);

  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

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
    () => [
      {
        key: "default",
        label: "Asl fon",
        kind: "image",
        preview: `url(${backimg1})`,
        apply: {
          backgroundImage: `url(${backimg1})`,
          backgroundColor: "#0b1220",
        },
      },
      {
        key: "mesh",
        label: "Mesh Gradient",
        kind: "image",
        preview: `url(${backimg2})`,
        apply: {
          backgroundImage: `url(${backimg2})`,
          backgroundColor: "#0b1220",
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

  const handleLogout = async () => {
    // Serverda tokenlarni bekor qilamiz (access darhol, refresh blacklist;
    // refresh token HttpOnly cookie'da — backend uni o'zi o'qib tozalaydi).
    // So'rov tugashini (ko'pi bilan 3 s) kutamiz: darhol resetApiState()
    // qilinsa so'rov yuborilmay qolardi; tarmoq bo'lmasa ham lokal chiqish davom etadi.
    await Promise.race([
      logoutRequest().unwrap().catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, 3000)),
    ]);

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
      <div className="h-[64px] shadow-sm flex items-center justify-between px-4 bg-[#ffffff] dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="h-[40px] w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title={isOpen ? "Sidebar-ni yopish" : "Sidebar-ni ochish"}
          >
            {isOpen ? (
              <PanelLeftClose size={20} className="cursor-pointer text-slate-700 dark:text-white" />
            ) : (
              <PanelRightClose size={20} className="cursor-pointer text-slate-700 dark:text-white" />
            )}
          </button>

          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t("technical_inquiries")}:
            <NavLink
              className="text-blue-600 dark:text-blue-400 font-bold px-1.5 hover:underline"
              to={"tel:+998 71 207 88 77 (1010)"}
            >
              +998 71 207 88 77 ({t("phone_extension")}: 1010)
            </NavLink>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Background Chooser */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-[40px] w-[40px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-blue-600 dark:text-white hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                title="Fonni tanlash"
              >
                <SlidersHorizontal size={18} className="text-blue-600 dark:text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[420px] mt-3 mr-2 p-6 rounded-[28px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
              <div className="text-center font-extrabold tracking-wide text-[18px] text-slate-900 dark:text-slate-100">
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
                        "relative h-[92px] rounded-2xl overflow-hidden border transition-all cursor-pointer",
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                      ].join(" ")}
                      style={{
                        backgroundImage: p.preview,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" />
                      <div className="absolute inset-x-0 bottom-0 p-3 z-10">
                        <div
                          style={{ color: "#ffffff" }}
                          className="text-left text-[14px] font-bold text-white drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                        >
                          {p.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* AI Assistant Button */}
          <button
            className="h-[40px] px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
            onClick={() => setAiOpen(true)}
          >
            <Sparkles size={16} className="text-white shrink-0" />
            <span className="text-white font-semibold whitespace-nowrap leading-none">{t("ai_assistant")}</span>
          </button>

          {/* Notification Button */}
          <Sheet open={notificationOpen} onOpenChange={handleNotificationOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-[40px] w-[40px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative flex items-center justify-center cursor-pointer"
              >
                <Bell size={18} className="text-blue-600 dark:text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-md w-full bg-slate-50/98 dark:bg-slate-950/98 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6 font-sans flex flex-col">
              <SheetHeader className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 rounded-2xl p-5 border border-white/20 dark:border-slate-800 shadow-lg text-white pr-14 relative shrink-0 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md border border-white/30 shrink-0">
                    <Bell size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-white font-bold text-lg leading-snug tracking-tight font-sans text-left">
                      {t("notifications") || (i18n.language === "ru" ? "Уведомления" : "Bildirishnomalar")}
                    </SheetTitle>
                    <p className="text-xs font-medium text-blue-100 dark:text-slate-300 font-sans text-left truncate">
                      {i18n.language === "ru" ? "Системные оповещения и новости" : "Tizim xabarlari va yangiliklar"}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full">
                {isLoading ? (
                  <div className="flex flex-col justify-center items-center h-64 gap-3 text-slate-400">
                    <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    <p className="text-sm font-medium">{t("loading") || "Yuklanmoqda..."}</p>
                  </div>
                ) : error ? (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-red-500 text-sm font-medium">{t("error") || "Xatolik yuz berdi"}</p>
                  </div>
                ) : data?.results?.length ? (
                  <div className="space-y-3">
                    {data.results.map((notification: any) => (
                      <Card
                        key={notification.id}
                        className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-200 rounded-2xl p-4 shadow-xs"
                      >
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Bell size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                              {notification.text}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col justify-center items-center h-[calc(100vh-220px)] text-center p-6">
                    <div className="h-20 w-20 rounded-3xl bg-blue-50 dark:bg-slate-900 text-blue-500 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner border border-blue-100 dark:border-slate-800 animate-pulse">
                      <BellOff size={36} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans mb-1">
                      {t("no_notifications") || (i18n.language === "ru" ? "Уведомлений пока нет" : "Hozircha bildirishnomalar yo'q")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs font-sans leading-relaxed">
                      {i18n.language === "ru"
                        ? "Здесь будут появляться важные системные сообщения и обновления."
                        : "Bu yerda muhim tizim xabarlari va yangilanishlar ko'rinadi."}
                    </p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Video Guide Button */}
          <Button
            className="h-[40px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
            onClick={() => navigate("/video")}
          >
            <VideoIcon size={16} className="text-white shrink-0" />
            <span className="text-white font-semibold whitespace-nowrap leading-none">{t("item_65")}</span>
          </Button>

          {/* Language Selector */}
          <Select value={currentLang} onValueChange={handleChangeLang}>
            <SelectTrigger className="h-[40px] w-[115px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-blue-800 dark:text-slate-100 font-semibold text-xs sm:text-sm shadow-none focus:ring-1 focus:ring-blue-500 flex items-center justify-between px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="uz" className="dark:text-gray-100 dark:hover:bg-slate-700">O'zbek</SelectItem>
              <SelectItem value="ru" className="dark:text-gray-100 dark:hover:bg-slate-700">Русский</SelectItem>
            </SelectContent>
          </Select>

          {/* Dark / Light Theme Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="h-[40px] w-[40px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center cursor-pointer"
            title={isDark ? "Yorug' rejimga o'tish" : "Tungi rejimga o'tish"}
          >
            {isDark ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} className="text-slate-600 dark:text-white" />
            )}
          </Button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* User Profile Menu */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-[40px] w-[40px] p-0 rounded-xl border border-blue-200 dark:border-slate-800 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                title={t("item_81") || "Profil"}
              >
                <User2 size={20} className="text-blue-600 dark:text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 mt-2 mr-2 dark:bg-slate-800 dark:border-slate-700">
              <DropdownMenuItem
                className="dark:text-gray-100 dark:hover:bg-slate-700"
                onSelect={() =>
                  dispatch(setHeaderState({ changePasswordOpen: true }))
                }
              >
                <User2 size={16} className="text-blue-500 mr-2" />
                {t("item_81")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="dark:text-gray-100 dark:hover:bg-slate-700 cursor-pointer"
                onSelect={() => setLogoutModalOpen(true)}
              >
                <LogOut size={16} className="text-red-500 mr-2" />
                {t("item_80")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Logout Button */}
          <Button
            variant="outline"
            className="h-[40px] w-[40px] p-0 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            onClick={() => setLogoutModalOpen(true)}
            title={t("item_80") || "Chiqish"}
          >
            <LogOut size={18} className="text-red-600 dark:text-red-400" />
          </Button>
        </div>
      </div>

      <ChangePasswordModal
        open={changePasswordOpen}
        setOpen={(value) => {
          dispatch(setHeaderState({ changePasswordOpen: value }));
          if (!value) {
            document.body.style.pointerEvents = "auto";
            document.body.removeAttribute("data-scroll-locked");
            setTimeout(() => {
              document.body.style.pointerEvents = "auto";
            }, 50);
          }
        }}
      />
      <AiModal open={aiOpen} onOpenChange={setAiOpen} />
      <LogoutConfirmModal
        open={logoutModalOpen}
        setOpen={setLogoutModalOpen}
        onConfirm={handleLogout}
      />
    </>
  );
}

export default Header;
