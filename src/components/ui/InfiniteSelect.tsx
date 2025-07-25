// components/InfiniteSelect.tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";

type InfiniteSelectProps = {
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  name: string;
  fetchData: (
    page: number,
    perPage: number
  ) => Promise<{
    results: { id: string | number; name: string }[];
    next: string | null;
  }>;
};

const InfiniteSelect = ({
  placeholder = "Select an item",
  value,
  onValueChange,
  className,
  name,
  fetchData,
}: InfiniteSelectProps) => {
  const [items, setItems] = useState<
    { id: string | number; name: string; submit_at: string }[]
  >([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = async (pageToLoad: number) => {
    setIsLoading(true);
    try {
      const res = await fetchData(pageToLoad, 10);
      if (pageToLoad === 1) {
        setItems(
          res.results.map((item) => ({
            ...item,
            submit_at: (item as any).submit_at ?? "",
          }))
        );
      } else {
        setItems((prev) => [
          ...prev,
          ...res.results.map((item) => ({
            ...item,
            submit_at: (item as any).submit_at ?? "",
          })),
        ]);
      }
      setHasNext(Boolean(res.next));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, []);

  useEffect(() => {
    if (page > 1) loadData(page);
  }, [page]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (
      el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
      hasNext &&
      !isLoading
    ) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange} name={name}>
      <SelectTrigger className={`w-full bg-white cursor-pointer ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] z-[99999]">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ maxHeight: "300px", overflowY: "auto" }}
          className="no-scrollbar"
        >
          {items?.map((item) => (
            <SelectItem key={item.id} value={item.id.toString()}>
              {item.submit_at}
            </SelectItem>
          ))}
          {isLoading && (
            <div className="p-2 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          )}
          {!isLoading && items.length === 0 && (
            <div className="p-2 text-center text-muted-foreground text-sm">
              No items available.
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

export default InfiniteSelect;
