import { sidebar_menu } from "@/services/sidebarMenu";
import logo from "../../assets/logo.svg";
import { NavLink } from "react-router-dom";
import { User2 } from "lucide-react";

function Sidebar() {
  //   const toggleAccordion = (index: number) => {
  //     setOpenAccordion(openAccordion === index ? null : index);
  //   };

  //   const renderNavLink = (path: string, title: string) => (
  //     <NavLink
  //       to={path}
  //       className="text-[15px] flex items-center"
  //       style={({ isActive }) => ({
  //         color: isActive ? "black" : "rgba(157, 164, 171, 1)",
  //       })}
  //     >
  //       {({ isActive }) => (
  //         <>
  //           <div
  //             className="w-[14px] h-[2px] mr-2"
  //             style={{
  //               backgroundColor: isActive ? "black" : "rgba(157, 164, 171, 1)",
  //             }}
  //           ></div>
  //           {title}
  //         </>
  //       )}
  //     </NavLink>
  //   );

  return (
    <div
      className="w-[310px] overflow-y-auto p-4"
      style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
    >
      <div className="w-full h-[50px] rounded-full flex items-center justify-center  text-black mb-3 gap-3">
        <img width={40} height={40} src={logo} alt="logo image" />
        <h2 className="font-extrabold text-[20px]">STAT-URMON</h2>
      </div>
      <div className="bg-[#09B86F] w-full h-[200px] rounded-2xl p-3 flex justify-center items-center flex-col gap-0.5">
        <div className="mb-2">
          {/* <img src="" alt="" /> */}
          <div className="bg-white h-[50px] w-[50px] flex items-center justify-center rounded-3xl">
            <User2 />
          </div>
        </div>
        <div>
          <h3 className="font-bold text-white">Odilxon Yuldoshxonov</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#E8E8E8] text-[14px] font-light">
            User number:
          </span>
          <h3 className="font-bold text-white text-[15px]">123654</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#E8E8E8] text-[14px] font-light">
            Tashkilot:{" "}
          </span>
          <h3 className="font-bold text-white text-[15px]">Urmontexnoservis</h3>
        </div>
      </div>
      <nav className="p-2 flex flex-col">
        {sidebar_menu.map((menuItem) => (
          <NavLink
            key={menuItem.id}
            to={menuItem.path}
            className={`text-[15px] flex items-center`}
            style={({ isActive }) => ({
              color: isActive ? "black" : "rgba(157, 164, 171, 1)",
            })}
          >
            {({ isActive }) => (
              <div
                className={`${
                  isActive ? "bg-[#09B86F] text-white font-medium" : "bg-white"
                } flex items-center w-full py-3 px-3 rounded-xl`}
              >
                <img
                  src={isActive ? menuItem.active_icon : menuItem.default_icon}
                  alt={`${menuItem.title} icon`}
                  className="w-6 h-6 mr-2"
                />
                <span className={`text-[15px]`}>{menuItem.title}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;
