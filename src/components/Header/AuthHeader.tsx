import i18n from "@/i18n";
import { useDispatch } from "react-redux";
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
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { VideoIcon } from "lucide-react";

function AuthHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLang = useSelector((state: RootState) => state.language.lang);
  const { t } = useTranslation();
  const handleChangeLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    dispatch(setLanguage(lang));

    const currentPath = location.pathname.split("/");
    currentPath[1] = lang;
    navigate(currentPath.join("/"));
  };
  return (
    <div className="w-full flex justify-between items-center z-99">
      <div className="h-[82px] max-w-[320px] w-full flex items-center justify-center text-black gap-3">
        <img width={80} height={80} src={logo} alt="logo" />
        <h2
          className={`font-extrabold text-[24px] ${
            location.pathname == "/auth" ? "text-white" : "text-black"
          }`}
        >
          STAT-URMON
        </h2>
      </div>
      <div className="mr-10 flex justify-end gap-2">
        {location.pathname != "/auth" && (
          <Button
            onClick={() => navigate("/auth")}
            className="text-white font-semibold text-[15px] bg-[#3B82F6] rounded-[10px] py-[21px] px-[20px] hover:bg-[#2563EB] cursor-pointer"
          >
            Kirish
          </Button>
        )}
        {location.pathname == "/auth" && (
          <Button
            className="bg-[#3B82F6] h-[44px] font-bold w-[180px] hover:bg-[#2563EB]"
            onClick={() => navigate("/auth/auth_video")}
          >
            <VideoIcon size={40} />
            {t("item_65")}
          </Button>
        )}
        {location.pathname == "/auth" && (
          <Button
            onClick={() => navigate("/")}
            className="text-white font-semibold text-[15px] bg-[#3B82F6] rounded-[10px] py-[21px] hover:bg-[#2563EB] cursor-pointer"
          >
            {t("auth_statistics")}
          </Button>
        )}
        <Select value={currentLang} onValueChange={handleChangeLang}>
          <SelectTrigger className="w-[120px] min-h-[42px] shadow-none bg-accent">
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
