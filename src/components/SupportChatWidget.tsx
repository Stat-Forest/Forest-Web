"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { MessageCircle, X } from "lucide-react";
import type { RootState } from "@/app/store";
import {
  ChatConversation,
  ChatMessage,
  ChatUser,
  useCreateConversationMutation,
  useGetConversationMessagesQuery,
  useGetConversationsListQuery,
  useMarkConversationReadMutation,
} from "@/services/uniqeApi";

interface IncomingSocketPayload {
  id?: string;
  sender?: string | ChatUser;
  text?: string;
  message?: string;
  is_read?: boolean;
  created_at?: string;
}

const formatTime = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveSenderId = (sender: string | ChatUser | undefined): string => {
  if (!sender) return "";
  return typeof sender === "string" ? sender : sender.id;
};

const normalizeSocketMessage = (
  payload: IncomingSocketPayload
): ChatMessage | null => {
  const text = payload.text ?? payload.message;
  if (!text) return null;

  return {
    id: payload.id ?? crypto.randomUUID(),
    sender: payload.sender ?? "support",
    text,
    is_read: payload.is_read ?? false,
    created_at: payload.created_at ?? new Date().toISOString(),
  };
};

function stateSelectorUserId(user: RootState["auth"]["user"]): string {
  if (!user?.user_id) return "";
  return String(user.user_id);
}

function SupportChatWidget() {
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = String(
    stateSelectorUserId(useSelector((state: RootState) => state.auth.user))
  );

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<
    Array<{ id: string; text: string; created_at: string }>
  >([]);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const wsAttemptRef = useRef(0);
  const wsOpenedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const markedConversationRef = useRef<string | null>(null);

  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = useGetConversationsListQuery(undefined, {
    pollingInterval: 15000,
  });

  const { data: historyMessages = [], isFetching: messagesLoading } =
    useGetConversationMessagesQuery(activeConversationId ?? "", {
      skip: !activeConversationId,
      refetchOnMountOrArgChange: true,
    });

  const [createConversation, { isLoading: creatingConversation }] =
    useCreateConversationMutation();
  const [markConversationRead] = useMarkConversationReadMutation();

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );

  const mergedMessages = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    [...historyMessages, ...liveMessages].forEach((msg) => {
      const key =
        msg.id || `${resolveSenderId(msg.sender)}-${msg.created_at}-${msg.text}`;
      map.set(key, msg);
    });
    return Array.from(map.values());
  }, [historyMessages, liveMessages]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  useEffect(() => {
    setLiveMessages([]);
    setPendingMessages([]);
    markedConversationRef.current = null;
  }, [activeConversationId]);

  useEffect(() => {
    if (!isOpen || !activeConversationId) return;
    if (markedConversationRef.current === activeConversationId) return;

    markedConversationRef.current = activeConversationId;
    markConversationRead(activeConversationId);
  }, [activeConversationId, isOpen, markConversationRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mergedMessages]);

  useEffect(() => {
    if (!activeConversationId || !token) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setWsConnected(false);
      wsAttemptRef.current = 0;
      wsOpenedRef.current = false;
      return;
    }

    const wsBase = String(import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");
    const wsCandidates = [
      `${wsBase}/ws/chat/${activeConversationId}/?token=${encodeURIComponent(token)}`,
    ];

    let closedByCleanup = false;

    const connect = (candidateIndex: number) => {
      if (closedByCleanup) return;
      const candidate = wsCandidates[candidateIndex];
      if (!candidate) {
        setWsConnected(false);
        return;
      }

      wsAttemptRef.current = candidateIndex;
      wsOpenedRef.current = false;
      const ws = new WebSocket(candidate);
      wsRef.current = ws;

      ws.onopen = () => {
        wsOpenedRef.current = true;
        setWsConnected(true);
        setPendingMessages((messages) => {
          messages.forEach((message) => {
            try {
              ws.send(JSON.stringify({ text: message.text }));
            } catch {
              // Pending xabarlar keyingi reconnect'da yana urinib ko'riladi.
            }
          });
          return [];
        });
      };
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as
            | IncomingSocketPayload
            | IncomingSocketPayload[];
          const incomingList = Array.isArray(payload) ? payload : [payload];
          const nextMessages = incomingList
            .map((item) => normalizeSocketMessage(item))
            .filter((item): item is ChatMessage => item !== null);

          if (nextMessages.length > 0) {
            setLiveMessages((prev) => [...prev, ...nextMessages]);
            refetchConversations();
          }
        } catch {
          // Socket payload noto'g'ri formatda bo'lsa UI ishlashda davom etadi.
        }
      };
      ws.onerror = () => {
        if (!closedByCleanup && wsAttemptRef.current === candidateIndex && !wsOpenedRef.current) {
          connect(candidateIndex + 1);
        }
      };
      ws.onclose = () => {
        if (!closedByCleanup && wsAttemptRef.current === candidateIndex) {
          setWsConnected(false);
          if (!wsOpenedRef.current) {
            connect(candidateIndex + 1);
          }
        }
      };
    };

    connect(0);

    return () => {
      closedByCleanup = true;
      wsAttemptRef.current = 0;
      wsOpenedRef.current = false;
      wsRef.current?.close();
    };
  }, [activeConversationId, token, refetchConversations]);

  const handleCreateConversation = async () => {
    try {
      const created = await createConversation().unwrap();
      setActiveConversationId(created.id);
      setIsOpen(true);
      refetchConversations();
    } catch {
      alert("Chat yaratib bo'lmadi. Qaytadan urinib ko'ring.");
    }
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = draft.trim();
    if (
      !text ||
      !activeConversationId ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      const optimisticMessage = {
        id: crypto.randomUUID(),
        text,
        created_at: new Date().toISOString(),
      };
      setPendingMessages((prev) => [...prev, optimisticMessage]);
      setLiveMessages((prev) => [
        ...prev,
        {
          id: optimisticMessage.id,
          sender: userId,
          text,
          is_read: false,
          created_at: optimisticMessage.created_at,
        },
      ]);
      setDraft("");
      return;
    }

    wsRef.current.send(JSON.stringify({ text }));
    setLiveMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: userId,
        text,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
    setDraft("");
  };

  return (
    <div className="fixed right-10 bottom-10 z-[120]">
      {isOpen && (
        <div className="w-[min(92vw,980px)] h-[min(78vh,640px)] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row mb-4">
          <aside className="w-full md:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Support Chat</h2>
              <button
                onClick={handleCreateConversation}
                disabled={creatingConversation}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {creatingConversation ? "Yaratilmoqda..." : "Yangi chat"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <p className="p-4 text-sm text-slate-500">Chatlar yuklanmoqda...</p>
              ) : conversations.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">
                  Sizda hali chat yo'q. "Yangi chat" ni bosing.
                </p>
              ) : (
                conversations.map((conversation: ChatConversation) => {
                  const isActive = conversation.id === activeConversationId;
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setActiveConversationId(conversation.id)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-200 transition ${
                        isActive ? "bg-emerald-50" : "hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-800 truncate">
                          Murojaat #{conversation.id.slice(0, 8)}
                        </p>
                        {!!conversation.unread_count && (
                          <span className="min-w-5 h-5 rounded-full bg-rose-500 px-1 text-center text-xs leading-5 text-white">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {conversation.created_at}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex-1 flex flex-col min-h-0">
            <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <p className="text-sm text-slate-500">Operator bilan muloqot</p>
                <p className="text-base font-semibold text-slate-900">
                  {activeConversation
                    ? `Murojaat #${activeConversation.id.slice(0, 8)}`
                    : "Chat tanlanmagan"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                    wsConnected || pendingMessages.length > 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {wsConnected
                    ? "Onlayn"
                    : pendingMessages.length > 0
                      ? `Navbatda ${pendingMessages.length}`
                      : "Ulanmoqda"}
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 grid place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100"
                  aria-label="Chatni yopish"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
              {!activeConversation ? (
                <div className="h-full grid place-items-center text-slate-500">
                  Chap tomondan chat tanlang yoki yangi chat yarating.
                </div>
              ) : messagesLoading && mergedMessages.length === 0 ? (
                <div className="h-full grid place-items-center text-slate-500">
                  Xabarlar yuklanmoqda...
                </div>
              ) : mergedMessages.length === 0 ? (
                <div className="h-full grid place-items-center text-slate-500">
                  Hozircha xabarlar mavjud emas.
                </div>
              ) : (
                mergedMessages.map((msg) => {
                  const mine = resolveSenderId(msg.sender) === userId;

                  return (
                    <div
                      key={msg.id}
                      className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                          mine
                            ? "bg-emerald-600 text-white rounded-br-md"
                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-6 whitespace-pre-wrap">
                          {msg.text}
                        </p>
                        <p
                          className={`mt-1 text-[11px] ${
                            mine ? "text-emerald-100" : "text-slate-400"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-slate-200 bg-white"
            >
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Xabaringizni yozing..."
                  disabled={!activeConversationId}
                  className="flex-1 h-12 rounded-xl border border-slate-300 px-4 outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={!activeConversationId || !draft.trim()}
                  className="h-12 rounded-xl bg-emerald-600 px-6 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Yuborish
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-16 w-16 rounded-full bg-emerald-600 text-white shadow-xl grid place-items-center hover:bg-emerald-700 transition"
        aria-label="Support chat"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}

export default SupportChatWidget;
