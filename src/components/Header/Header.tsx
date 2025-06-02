import { Bell, LogOut, Search, User2, VideoIcon } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import { logout } from "@/features/authSlice";

function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="h-[70px] shadow flex items-center justify-between px-3">
      <div className="w-[30%] border-1 border-silver flex items-center bg-white rounded-lg gap-1 px-2">
        <Search className="text-[#A4A4A4]" />
        <Input
          placeholder="Qidiruv..."
          className="border-none h-[42px]"
          style={{ fontSize: "17px" }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button className="bg-[#09B86F] h-[42px] w-[170px] hover:bg-[#09B86F]">
          <VideoIcon />
          Video ko’rsatma
        </Button>
        <Button className="h-[42px] w-[42px] bg-[transparent] border-1 text-[#09B86F] hover:text-[white] hover:bg-[#09B86F]">
          <Bell size={50} />
        </Button>
        <Select defaultValue="uzb">
          <SelectTrigger className="w-[100px] min-h-[42px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uzb">O'zbek</SelectItem>
            <SelectItem value="Rus">Russian</SelectItem>
            <SelectItem value="Yz">Kiril</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-[40px] w-[40px] rounded-full bg-transparent border-1 text-[#09B86F] hover:text-[white] hover:bg-[#09B86F]">
              <User2 size={38} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-38 mt-2">
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut color="#FF5445" />
              Chiqish
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
