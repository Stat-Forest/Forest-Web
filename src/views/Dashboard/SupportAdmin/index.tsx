import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import {
  ChatConversation,
  ChatMessage,
  ChatUser,
  useAssignConversationMutation,
  useCloseConversationMutation,
  useGetConversationMessagesQuery,
  useGetSupportMyConversationsQuery,
  useGetSupportNewConversationsQuery,
  useMarkConversationReadMutation,
} from "@/services/uniqeApi";
import {
  appendIncomingMessages,
  buildChatSocketUrl,
  createPendingMessage,
  formatChatTime,
  mergeChatMessages,
  parseSocketMessages,
  resolveSenderId,
} from "@/utils/chatUtils";

const formatUserName = (user?: ChatUser | null) => {
  if (!user) return "Foydalanuvchi";
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return fullName || user.email || "Foydalanuvchi";
};

function SupportAdmin() {
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = String(useSelector((state: RootState) => state.auth.user?.user_id ?? ""));

  const [tab, setTab] = useState<"new" | "my">("new");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const queuedMessagesRef = useRef<string[]>([]);
  const markedConversationRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: myConversations = [], refetch: refetchMy } =
    useGetSupportMyConversationsQuery(undefined, { pollingInterval: 10000 });
  const { data: newConversations = [], refetch: refetchNew } =
    useGetSupportNewConversationsQuery(undefined, { pollingInterval: 10000 });

  const currentList = tab === "new" ? newConversations : myConversations;
  const canReply = tab === "my";

  const activeConversation = useMemo(
    () => currentList.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, currentList]
  );

  const { data: messages = [], isFetching: messagesLoading, refetch: refetchMessages } =
    useGetConversationMessagesQuery(activeConversationId ?? "", {
      skip: !activeConversationId,
      refetchOnMountOrArgChange: true,
    });

  const [assignConversation, { isLoading: assignLoading }] = useAssignConversationMutation();
  const [closeConversation, { isLoading: closeLoading }] = useCloseConversationMutation();
  const [markConversationRead] = useMarkConversationReadMutation();

  const mergedMessages = useMemo(
    () => mergeChatMessages(messages, liveMessages),
    [messages, liveMessages]
  );

  useEffect(() => {
    setActiveConversationId(null);
  }, [tab]);

  useEffect(() => {
    if (!activeConversationId && currentList.length > 0) {
      setActiveConversationId(currentList[0].id);
    }
  }, [activeConversationId, currentList]);

  useEffect(() => {
    setLiveMessages([]);
    queuedMessagesRef.current = [];
    setQueuedCount(0);
    markedConversationRef.current = null;
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (markedConversationRef.current === activeConversationId) return;
    markedConversationRef.current = activeConversationId;
    markConversationRead(activeConversationId);
  }, [activeConversationId, markConversationRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mergedMessages]);

  useEffect(() => {
    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    if (!activeConversationId || !token) {
      wsRef.current?.close();
      setWsConnected(false);
      clearReconnectTimer();
      return;
    }

    const socketUrl = buildChatSocketUrl(activeConversationId, token);
    let closedByCleanup = false;

    const openSocket = () => {
      if (closedByCleanup) return;
      const ws = new WebSocket(socketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        clearReconnectTimer();
        reconnectAttemptRef.current = 0;
        setWsConnected(true);
        if (queuedMessagesRef.current.length > 0) {
          queuedMessagesRef.current.forEach((text) => {
            ws.send(JSON.stringify({ text }));
          });
          queuedMessagesRef.current = [];
          setQueuedCount(0);
        }
      };
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const next = parseSocketMessages(payload);

          if (next.length > 0) {
            setLiveMessages((prev) => appendIncomingMessages(prev, next));
            refetchMy();
            refetchNew();
          }
        } catch {
          // Invalid socket payload is ignored.
        }
      };
      ws.onerror = () => {
        setWsConnected(false);
      };
      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByCleanup) {
          reconnectAttemptRef.current += 1;
          const delay = Math.min(15000, 1000 * reconnectAttemptRef.current);
          reconnectTimerRef.current = window.setTimeout(() => openSocket(), delay);
        }
      };
    };

    reconnectAttemptRef.current = 0;
    openSocket();

    return () => {
      closedByCleanup = true;
      clearReconnectTimer();
      wsRef.current?.close();
    };
  }, [activeConversationId, token, refetchMessages, refetchMy, refetchNew]);

  const handleAssign = async () => {
    if (!activeConversationId) return;
    try {
      await assignConversation(activeConversationId).unwrap();
      setTab("my");
      refetchMy();
      refetchNew();
    } catch {
      alert("Suhbatni biriktirish mumkin bo'lmadi. Support admin huquqi kerak.");
    }
  };

  const handleClose = async () => {
    if (!activeConversationId) return;
    try {
      await closeConversation(activeConversationId).unwrap();
      setActiveConversationId(null);
      refetchMy();
      refetchNew();
    } catch {
      alert("Suhbatni yopish mumkin bo'lmadi.");
    }
  };

  const appendOptimisticMessage = (text: string) => {
    setLiveMessages((prev) => [...prev, createPendingMessage(userId, text)]);
  };

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeConversationId || !canReply) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      queuedMessagesRef.current.push(text);
      setQueuedCount(queuedMessagesRef.current.length);
      appendOptimisticMessage(text);
      setDraft("");
      return;
    }

    wsRef.current.send(JSON.stringify({ text }));
    appendOptimisticMessage(text);
    setDraft("");
  };

  return (
    <div className="p-4 h-[calc(100vh-88px)]">
      <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col md:flex-row">
        <aside className="w-full md:w-[340px] border-r border-slate-200 bg-slate-50 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Support</h2>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setTab("new")}
                className={`px-3 py-2 rounded-md text-sm ${tab === "new" ? "bg-emerald-600 text-white" : "bg-white border border-slate-300"}`}
              >
                Yangi ({newConversations.length})
              </button>
              <button
                onClick={() => setTab("my")}
                className={`px-3 py-2 rounded-md text-sm ${tab === "my" ? "bg-emerald-600 text-white" : "bg-white border border-slate-300"}`}
              >
                Mening ({myConversations.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {currentList.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Suhbatlar topilmadi.</p>
            ) : (
              currentList.map((conversation: ChatConversation) => {
                const isActive = conversation.id === activeConversationId;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setActiveConversationId(conversation.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-200 ${
                      isActive ? "bg-emerald-50" : "hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-medium text-slate-800 truncate">
                      {formatUserName(conversation.user)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      #{conversation.id.slice(0, 8)} · {conversation.created_at}
                    </p>
                    {!!conversation.unread_count && (
                      <span className="mt-1 inline-block rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                        {conversation.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col min-h-0">
          <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <div>
              <p className="text-sm text-slate-500">Support Administrator</p>
              <p className="text-base font-semibold text-slate-900">
                {activeConversation
                  ? formatUserName(activeConversation.user)
                  : "Suhbat tanlanmagan"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  wsConnected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {wsConnected ? "Onlayn" : queuedCount > 0 ? `Navbatda ${queuedCount}` : "Ulanmoqda"}
              </span>
              {tab === "new" && (
                <button
                  onClick={handleAssign}
                  disabled={!activeConversationId || assignLoading}
                  className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-60"
                >
                  Qabul qilish
                </button>
              )}
              {tab === "my" && (
                <button
                  onClick={handleClose}
                  disabled={!activeConversationId || closeLoading}
                  className="px-3 py-2 rounded-md bg-rose-600 text-white text-sm disabled:opacity-60"
                >
                  Yopish
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
            {!activeConversationId ? (
              <div className="h-full grid place-items-center text-slate-500">Suhbat tanlang.</div>
            ) : messagesLoading && mergedMessages.length === 0 ? (
              <div className="h-full grid place-items-center text-slate-500">Xabarlar yuklanmoqda...</div>
            ) : mergedMessages.length === 0 ? (
              <div className="h-full grid place-items-center text-slate-500">Xabarlar yo'q.</div>
            ) : (
              mergedMessages.map((msg) => {
                const mine = resolveSenderId(msg.sender) === userId;
                return (
                  <div key={msg.id} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        mine
                          ? "bg-emerald-600 text-white rounded-br-md"
                          : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className={`mt-1 text-[11px] ${mine ? "text-emerald-100" : "text-slate-400"}`}>
                        {formatChatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white">
            {!canReply && activeConversationId && (
              <p className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Javob berish uchun avval suhbatni "Qabul qilish" tugmasi orqali oling.
              </p>
            )}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={canReply ? "Javob yozing..." : "Avval suhbatni qabul qiling..."}
                disabled={!activeConversationId || !canReply}
                className="flex-1 h-12 rounded-xl border border-slate-300 px-4 outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={!activeConversationId || !canReply || !draft.trim()}
                className="h-12 rounded-xl bg-emerald-600 px-6 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Yuborish
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default SupportAdmin;
