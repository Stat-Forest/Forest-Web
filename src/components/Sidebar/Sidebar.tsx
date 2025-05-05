import { NavLink } from "react-router-dom";
import logo from "../../assets/logo.svg";
import { FileText, User2 } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { sidebar_3, sidebar_menu } from "@/services/sidebarMenu";
import { useGetStatementsReportQuery } from "@/services/reportsApi";

function Sidebar() {
  const {
    data: sidebar_2 = [],
    isLoading,
    error,
  } = useGetStatementsReportQuery();

  if (isLoading) console.log("loading...");
  if (error) console.log("error");

  const renderNavItem = (item: any) => {
    if (item.children?.length > 0) {
      return (
        <Sheet key={item.id}>
          <SheetTrigger asChild>
            <div className="cursor-pointer p-2 hover:bg-gray-200 rounded-md flex items-center gap-2">
              {item.icon && <img src={item.icon} alt="" className="w-5 h-5" />}
              <span>{item.name}</span>
            </div>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="ml-[310px] w-[300px] sm:w-[400px]"
          >
            <SheetHeader>
              <SheetTitle>{item.name}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col ml-6 w-full mt-1 gap-4">
              {item.children.map((child: any, index: number) => (
                <NavLink
                  key={index}
                  to={`/resource-management/${child.id}`}
                  className="text-[#9F9F9F] hover:underline flex items-center gap-1"
                >
                  <FileText />
                  <h2 className="text-[17px]">{child.name}</h2>
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <NavLink
        to={item.path}
        key={item.id}
        className="p-2 hover:bg-gray-200 rounded-md flex items-center gap-2"
      >
        {item.default_icon && (
          <img src={item.default_icon} alt="" className="w-5 h-5" />
        )}
        <span>{item.name}</span>
      </NavLink>
    );
  };

  return (
    <div className="w-[310px]  h-screen overflow-y-auto p-4 bg-white/40">
      <div className="w-full h-[50px] rounded-full flex items-center justify-center text-black mb-3 gap-3">
        <img width={40} height={40} src={logo} alt="logo" />
        <h2 className="font-extrabold text-[20px]">STAT-URMON</h2>
      </div>

      <div className="bg-[#09B86F] w-full h-[200px] rounded-2xl p-3 flex justify-center items-center flex-col gap-0.5">
        <div className="mb-2">
          <div className="bg-white h-[50px] w-[50px] flex items-center justify-center rounded-3xl">
            <User2 />
          </div>
        </div>
        <h3 className="font-bold text-white">Odilxon Yuldoshxonov</h3>
        <div className="flex items-center gap-2">
          <span className="text-[#E8E8E8] text-[14px] font-light">
            User number:
          </span>
          <h3 className="font-bold text-white text-[15px]">123654</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#E8E8E8] text-[14px] font-light">
            Tashkilot:
          </span>
          <h3 className="font-bold text-white text-[15px]">Urmontexnoservis</h3>
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-2">
        {[...sidebar_menu, ...(sidebar_2?.results || []), ...sidebar_3]
          .flat()
          .map(renderNavItem)}
      </nav>
    </div>
  );
}

export default Sidebar;
