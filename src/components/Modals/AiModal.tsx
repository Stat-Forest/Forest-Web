import { useCreateAiChatMutation } from "@/services/uniqeApi";
import { useEffect, useRef, useState } from "react";
import { Sparkles, SendHorizonal, UserRound, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Message = {
  role: "user" | "ai";
  text: string;
};

type AnyResponse = {
  answer?: unknown;
  message?: unknown;
  message_response?: unknown;
};

function extractAiText(res: AnyResponse): string {
  if (typeof res?.answer === "string") {
    try {
      const parsed = JSON.parse(res.answer);

      return (
        (typeof parsed?.answer === "string" && parsed.answer) ||
        (typeof parsed?.message_response === "string" &&
          parsed.message_response) ||
        (typeof parsed?.message === "string" && parsed.message) ||
        res.answer
      );
    } catch {
      return res.answer;
    }
  }

  if (typeof res?.answer === "object" && res?.answer !== null) {
    const answerObj = res.answer as Record<string, unknown>;

    return (
      (typeof answerObj?.message_response === "string" &&
        answerObj.message_response) ||
      (typeof answerObj?.answer === "string" && answerObj.answer) ||
      (typeof answerObj?.message === "string" && answerObj.message) ||
      "Javob kelmadi"
    );
  }

  return (
    (typeof res?.message_response === "string" && res.message_response) ||
    (typeof res?.message === "string" && res.message) ||
    "Javob kelmadi"
  );
}

function AiModal({ open, onOpenChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Assalomu alaykum! Men STAT-URMON tizimining aqlli yordamchisiman. Sizga o'rmon xo'jaligi bo'yicha qanday yordam bera olaman?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sendMessage, { isLoading }] = useCreateAiChatMutation();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const question = input.trim();

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: question,
      },
    ]);

    setInput("");

    try {
      const res = await sendMessage({ question }).unwrap();

      const aiText = extractAiText(res);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: aiText,
        },
      ]);
    } catch (err) {
      console.error("AI chat error:", err);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Xatolik yuz berdi ❌",
        },
      ]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div className="flex h-[92vh] max-h-[960px] w-full max-w-[1010px] flex-col overflow-hidden rounded-[36px] bg-[#F3F4F6] shadow-2xl">
        <div className="flex min-h-[102px] items-center justify-between bg-gradient-to-r from-[#2563EB] via-[#3347D6] to-[#4F2FD3] px-9 py-6 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-[62px] w-[62px] items-center justify-center rounded-[18px] bg-white/12 backdrop-blur">
              <Sparkles className="h-8 w-8 text-[#F8D74A]" />
            </div>

            <div>
              <h2 className="text-[22px] font-bold leading-none">
                STAT-URMON Aqlli Yordamchisi
              </h2>
              <p className="mt-2 text-[15px] text-white/75">
                Gemini AI texnologiyasi asosida ishlaydi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-8 w-8" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-9 py-9">
          <div className="space-y-8">
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={i}
                  className={`flex items-start gap-4 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0F9D73]">
                      <Sparkles className="h-5 w-5 text-[#FFD84D]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] whitespace-pre-line break-words rounded-[26px] border px-6 py-7 text-[18px] leading-[1.7] shadow-sm ${
                      isUser
                        ? "rounded-tr-[10px] border-[#4F46E5] bg-[#4F46E5] text-white"
                        : "rounded-tl-[10px] border-[#D8DEE8] bg-white text-[#1F2937]"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {isUser && (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4F46E5]">
                      <UserRound className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0F9D73]">
                  <Sparkles className="h-5 w-5 text-[#FFD84D]" />
                </div>

                <div className="rounded-[26px] rounded-tl-[10px] border border-[#D8DEE8] bg-white px-6 py-5 text-[17px] text-[#6B7280] shadow-sm">
                  AI yozmoqda...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] bg-[#F7F7F8] px-6 pb-6 pt-5">
          <div className="mx-auto flex w-full items-center gap-4 rounded-[26px] border border-[#D6DBE3] bg-[#EEF1F5] px-7 py-3 shadow-sm">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Savolingizni bu yerga yozing..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="h-[56px] flex-1 bg-transparent text-[18px] text-[#1F2937] outline-none placeholder:text-[#98A2B3]"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex h-[62px] w-[62px] items-center justify-center rounded-[18px] bg-[#89A8F4] text-white transition hover:bg-[#7397F1] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <SendHorizonal className="h-7 w-7" />
            </button>
          </div>

          <p className="mt-5 text-center text-[14px] font-medium text-[#94A3B8]">
            AI xato qilishi mumkin. Muhim ma&apos;lumotlarni tekshirib
            ko&apos;ring.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AiModal;
