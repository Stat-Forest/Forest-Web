import { LogOut, Search, User2, VideoIcon } from "lucide-react";
import { Input } from "../ui/input";
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

import { useDispatch } from "react-redux";
import { logout } from "@/features/authSlice";
import { useNavigate, useLocation } from "react-router-dom";

import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { setLanguage } from "@/features/languageSlice";

function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const currentLang = useSelector((state: RootState) => state.language.lang);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
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
    <div className="h-[70px] shadow flex items-center justify-between px-3">
      <div className="w-[30%] border-1 border-silver flex items-center bg-white rounded-lg gap-1 px-2">
        <Search className="text-[#A4A4A4]" />
        <Input
          placeholder={t("item_79")}
          className="border-none h-[42px]"
          style={{ fontSize: "17px" }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button className="bg-[#09B86F] h-[42px] w-[170px] hover:bg-[#09B86F]">
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
        |
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-[40px] w-[40px] rounded-full bg-transparent border-1 text-[#09B86F] hover:text-[white] hover:bg-[#09B86F]">
              <User2 size={38} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 mt-2 mr-2">
            <DropdownMenuItem>
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
  );
}

export default Header;
