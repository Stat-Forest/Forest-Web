import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AnnouncementModalProps {
  data: {
    title: string;
    desc: string;
    image: string;
    lnk: string;
    created_at: string;
  };
  onClose: () => void;
}

export default function AnnouncementModal({
  data,
  onClose,
}: AnnouncementModalProps) {
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {data.title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <img
            src={data.image}
            alt={data.title}
            className="rounded-md object-cover w-full h-48"
          />
          <p className="text-gray-600">{data.desc}</p>
          <div className="flex justify-between items-center">
            <a
              href={data.lnk}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Saytga o‘tish →
            </a>
            <span className="text-gray-500 text-xs">{data.created_at}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keyingi e’lon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
