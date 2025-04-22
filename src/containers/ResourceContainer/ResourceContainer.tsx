import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ResourceContainer() {
  return (
    <div className="py-3">
      <div className="w-full">
        <Tabs defaultValue="1-Ilova" className="w-full">
          <TabsList className="w-full border border-[#A3A3A3] min-h-[50px] justify-start">
            <TabsTrigger
              className="max-w-[150px] bg-transparent text-[#A3A3A3] data-[state=active]:border-b-3 data-[state=active]:border-[#09B86F] data-[state=active]:rounded-bl-[9px] data-[state=active]:text-[#000]"
              value="1-Ilova"
            >
              1-Ilova
            </TabsTrigger>
            <TabsTrigger
              className="max-w-[150px] bg-transparent text-[#A3A3A3] data-[state=active]:border-b-3 data-[state=active]:border-[#09B86F] data-[state=active]:text-[#000]"
              value="2-Ilova"
            >
              2-Ilova
            </TabsTrigger>
            <TabsTrigger
              className="max-w-[150px] bg-transparent text-[#A3A3A3] data-[state=active]:border-b-3 data-[state=active]:border-[#09B86F] data-[state=active]:text-[#000]"
              value="3-Ilova"
            >
              3-Ilova
            </TabsTrigger>
          </TabsList>

          <TabsContent value="1-Ilova">
            Make changes to your account here.
          </TabsContent>
          <TabsContent value="2-Ilova">Change your password here.</TabsContent>
          <TabsContent value="3-Ilova">Change your password here.</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default ResourceContainer;
