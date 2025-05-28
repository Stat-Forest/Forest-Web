import { receipt_information } from "@/services/receiptInformation";
import { FileText, SettingsIcon, User } from "lucide-react";

function ReceiptInformation() {
  return (
    <div>
      <div className="pt-2 pl-2">
        <h2 className="text-xl font-[500] w-[220px] text-center pb-2">
          Malumotnoma olish
        </h2>
        <div className="w-full bg-[#E8E8E8] h-[4px] rounded-full">
          <div className="w-[250px] h-[3px] rounded-full bg-green-500"></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5 py-4 px-2">
        {receipt_information.map((item: any) => (
          <div className="h-[130px] shadow rounded-lg flex items-center justify-between px-5 cursor-pointer">
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-medium text-[16px] text-[#353535]">
                  {item?.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <User size={18} />
                <SettingsIcon size={18} />
              </div>
            </div>
            <div className="w-[17%]">
              <div
                className={`bg-[${item?.color}] w-[55px] h-[55px] rounded-full flex items-center justify-center shadow-md`}
              >
                <FileText color="white" size={25} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReceiptInformation;
