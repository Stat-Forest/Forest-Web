import i18n from "@/i18n";
import { useDispatch } from "react-redux";
import { setLanguage } from "@/features/languageSlice";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";
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

function AuthHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentLang = useSelector((state: RootState) => state.language.lang);
  const {t} = useTranslation();
  const handleChangeLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    dispatch(setLanguage(lang));

    const currentPath = location.pathname.split("/");
    currentPath[1] = lang;
    navigate(currentPath.join("/"));
  };
  return (
    <div className="fixed top-0 w-full flex justify-between items-center">
    
       <div className="h-[82px] max-w-[310px] w-full flex items-center justify-center text-black gap-3">
        <img width={40} height={40} src={logo} alt="logo" />
        <h2 className="font-extrabold text-[20px] text-white">STAT-URMON</h2>
      </div>
      <div className="mr-10 flex justify-end gap-2">
        <Button onClick={()=> navigate("")} className="text-white font-semibold text-[15px] bg-[#09B86F] rounded-[10px] py-[21px] hover:bg-[#09A95F] cursor-pointer">{t("auth_statistics")}</Button>
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
