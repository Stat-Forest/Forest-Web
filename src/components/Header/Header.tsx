import { LogOut, User2, VideoIcon } from "lucide-react";
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
import { generalApi } from "@/services/generalApi";
import { statistikApi } from "@/services/statistikApi";
import { sumApi } from "@/services/sumApi";

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

  const currentLang = useSelector((state: RootState) => state.language.lang);

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

    // ⏩ Login sahifasiga yo‘naltiramiz
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
