import { Search, VideoIcon } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

function Header() {
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
      <div>
        <div>
          <Button className="bg-[#09B86F] h-[42px] w-[170px]">
            <VideoIcon />
            Video ko’rsatma
          </Button>
        </div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
}

export default Header;
