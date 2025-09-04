import { Marquee } from "@/components/magicui/marquee";

const messages = [
  "Tizim hozirda test rejimida",
  "Система сейчас в тестовом режиме",
];

export function TestModeCarousel() {
  return (
    <div className="fixed top-0 left-0 z-[100] flex w-full items-center justify-center overflow-hidden">
      <Marquee className="[--duration:15s] text-xs font-medium text-red-500 py-0">
        {messages.map((msg, i) => (
          <span key={i} className="mx-8">
            {msg}
          </span>
        ))}
      </Marquee>
    </div>
  );
}