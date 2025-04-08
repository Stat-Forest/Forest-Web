import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import key_icon_default from "../../assets/key_icon_default.svg";
import user_icon_active from "../../assets/user_icon_active.svg";

function Login() {
  return (
    <div className="bg-white w-[480px] rounded-2xl shadow-md px-7 py-13 flex items-center flex-col gap-3.5">
      <h2 className="text-center text-[#000000] text-[34px] font-bold">
        Tizimga kirish
      </h2>
      <span className="text-center w-full text-[#929292] text-[13px]">
        Urmon xo‘jaligi hisobini yuritish axborot tizimi
      </span>
      <form action="" className="flex items-center flex-col gap-6 pt-8">
        <Tabs defaultValue="login" className="w-[400px]">
          <TabsList className="w-full h-10 gap-3">
            <TabsTrigger className="h-[40px]" value="with_key">
              <div className="flex items-center justify-between w-full px-5">
                <span>Kalit orqali</span>
                <img src={key_icon_default} alt="img" />
              </div>
            </TabsTrigger>
            <TabsTrigger className="h-[40px]" value="login">
              <div className="flex items-center justify-between w-full px-5">
                <span> Login orqali</span>
                <img src={user_icon_active} alt="img" />
              </div>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="with_key" className="pt-6">
            <div className="w-full">
              <Label className="mb-2">Elektron pochta manzili</Label>
              <Input placeholder="mail@gmail.com" className="h-[43px]" />
            </div>
          </TabsContent>
          <TabsContent className="flex items-center flex-col gap-4 pt-4" value="login">
            <div className="w-full">
              <Label className="mb-2">Elektron pochta manzili</Label>
              <Input placeholder="mail@gmail.com" className="h-[43px]" />
            </div>
            <div className="w-full">
              <Label className="mb-2">Maxfiy kod</Label>
              <Input placeholder="********" className="h-[43px]" />
            </div>
            <div className="flex justify-between w-full">
              <div className="flex items-center gap-2">
                <Checkbox className="focus:bg-[#09B86F]" />
                <Label className="text-[#8F8F8F]">Meni eslab qol</Label>
              </div>
              <Button
                type="button"
                className="p-0 bg-transparent shadow-none text-[#09B86F] hover:bg-transparent"
              >
                Забыли пароль?
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <Button
          type="submit"
          className="w-full h-[45px] text-white bg-[#09B86F] font-bold hover:bg-[#09B86F] hover:text-white "
        >
          KIRISH
        </Button>
      </form>
    </div>
  );
}

export default Login;
