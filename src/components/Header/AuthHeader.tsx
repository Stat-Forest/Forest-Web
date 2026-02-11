import i18n from "@/i18n";
import { useDispatch, useSelector } from "react-redux";
import { setLanguage } from "@/features/languageSlice";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RootState } from "@/app/store";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { VideoIcon } from "lucide-react";

function AuthHeader({position=false}: {position?: boolean}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLang = useSelector((state: RootState) => state.language.lang);
  const { t } = useTranslation();

  const isAuthPage = location.pathname.includes("/auth");
  const isLanding = location.pathname === "/";

  const handleChangeLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    dispatch(setLanguage(lang));
  };

  return (
    <div
      className={`${position ? "" : "fixed"} top-0 w-full flex justify-between items-center z-50 px-6
      ${isLanding ? "bg-[#C0FFD4]" : "bg-transparent"}`}
    >
      {/* LOGO */}
      <div className="h-[82px] max-w-[320px] w-full flex items-center gap-3">
        <img width={60} height={60} src={logo} alt="logo" />
        <h2
          className={`font-extrabold text-[22px] ${
            isAuthPage ? "text-white" : "text-black"
          }`}
        >
          STAT-URMON
        </h2>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-3">
        {/* Landing da kirish button */}
        {!isAuthPage && (
          <Button
            onClick={() => navigate("/auth")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg px-5"
          >
            {t("login") || "Kirish"}
          </Button>
        )}

        {/* Auth page ichida */}
        {isAuthPage && (
          <>
            <Button
              onClick={() => navigate("/auth/auth_video")}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg px-5 flex items-center gap-2"
            >
              <VideoIcon size={18} />
              {t("item_65")}
            </Button>

            <Button
              onClick={() => navigate("/")}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg px-5"
            >
              {t("auth_statistics")}
            </Button>
          </>
        )}

        {/* LANGUAGE */}
        <Select value={currentLang} onValueChange={handleChangeLang}>
          <SelectTrigger className="w-[120px] min-h-[42px] shadow-none bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uz">O'zbek</SelectItem>
            <SelectItem value="ru">Русский</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default AuthHeader;
