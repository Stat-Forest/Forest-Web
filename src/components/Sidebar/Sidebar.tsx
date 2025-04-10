import { sidebar_menu } from "@/services/sidebarMenu";
import logo from "../../assets/logo.svg";
import { NavLink } from "react-router-dom";

// interface SidebarItem {
//   id: number;
//   title: string;
//   items?: { path: string; item_title: string }[];
//   default_icon: string;
//   active_icon: string;
// }

// interface MenuItem {
//   id: number;
//   path: string;
//   title: string;
//   default_icon: string;
//   active_icon: string;
// }

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
      className="w-[300px] overflow-y-auto p-4"
      style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
    >
      <div className="w-full h-[50px] rounded-full flex items-center justify-center  text-black mb-4 gap-3">
        <img width={40} height={40} src={logo} alt="logo image" />
        <h2 className="font-extrabold text-[20px]">STAT-URMON</h2>
      </div>
      <div className="bg-[#09B86F] w-full h-[200px] rounded-2xl p-3">
        <div>
          <span className="text-[#E8E8E8] text-[14px]">
            Foydanalanuvchi F.I.SH
          </span>
          <h3 className="font-bold text-white">Odilxon Yuldoshxonov</h3>
        </div>
        <div>
          <span className="text-[#E8E8E8] text-[14px]">
            Foydanalanuvchi logini:
          </span>
          <h3 className="font-bold text-white">bunyod1989</h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#E8E8E8] text-[14px]">Tashkilot ID:</span>
          <h3 className="font-bold text-white">1755</h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#E8E8E8] text-[14px]">STIR:</span>
          <h3 className="font-bold text-white">175017055</h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#E8E8E8] text-[14px]">Tashkilot:</span>
          <h3 className="font-bold text-white">Urmontexnoservis</h3>
        </div>
      </div>
      <nav className="p-2 flex flex-col">
        {sidebar_menu.map((menuItem) => (
          <NavLink
            key={menuItem.id}
            to={menuItem.path}
            className="text-[15px] flex items-center py-3"
            style={({ isActive }) => ({
              color: isActive ? "black" : "rgba(157, 164, 171, 1)",
            })}
          >
            {({ isActive }) => (
              <>
                <img
                  src={isActive ? menuItem.active_icon : menuItem.default_icon}
                  alt={`${menuItem.title} icon`}
                  className="w-5 h-5 mr-2"
                />
                {menuItem.title}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;
