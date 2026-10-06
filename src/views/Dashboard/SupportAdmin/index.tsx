import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import type { RootState } from "@/app/store";
import {
  ChatConversation,
  ChatMessage,
  ChatStatus,
  useAssignConversationMutation,
  useCloseConversationMutation,
  useGetConversationMessagesQuery,
  useGetSupportMyConversationsQuery,
  useGetSupportNewConversationsQuery,
  useMarkConversationReadMutation,
} from "@/services/uniqeApi";
import {
  MAX_MESSAGE_LENGTH,
  buildChatSocketUrl,
  canCloseConversation,
  canSendMessage,
  createPendingMessage,
  describeChatError,
  describeCloseCode,
  formatChatDateTime,
  formatChatTime,
  formatUserName,
  isFatalCloseCode,
  isSuperAdminRole,
  mergeChatMessages,
  parseSocketEvent,
  resolveSenderId,
  upsertMessage,
} from "@/utils/chatUtils";

const statusLabel = (status: ChatStatus) => {
  switch (status) {
    case "new":
      return "Navbatda";
    case "taken":
      return "Olingan";
    case "closed":
      return "Yopilgan";
    default:
      return status;
  }
};

const statusClass = (status: ChatStatus) => {
  switch (status) {
    case "new":
      return "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300";
    case "taken":
      return "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300";
    default:
      return "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
  }
};

function SupportAdmin() {
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = String(
    useSelector((state: RootState) => state.auth.user?.user_id ?? "")
  );
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const isSuperAdmin = isSuperAdminRole(role);

  const [tab, setTab] = useState<"new" | "my">("new");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [liveConversation, setLiveConversation] = useState<ChatConversation | null>(null);

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

  const activeConversation = useMemo(() => {
    const fromList = currentList.find((item) => item.id === activeConversationId) ?? null;
    if (liveConversation && liveConversation.id === activeConversationId) {
      return { ...(fromList ?? {}), ...liveConversation } as ChatConversation;
    }
    return fromList;
  }, [activeConversationId, currentList, liveConversation]);

  const { data: messages = [], isFetching: messagesLoading } =
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

  // Yozish huquqi tab bilan emas, chat holati bilan aniqlanadi:
  // faqat AYNAN shu chatga biriktirilgan admin yoza oladi (guide 4-bo'lim).
  const canReply = canSendMessage(activeConversation, userId);
  const canAssign = activeConversation?.status === "new";
  const canClose =
    canCloseConversation(activeConversation, userId, role) && !closeLoading;
  const isClosed = activeConversation?.status === "closed";
  const shouldConnect = Boolean(
    activeConversationId && token && activeConversation && !isClosed
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
    setLiveConversation(null);
    setSocketError(null);
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

  const handleSocketEvent = useCallback(
    (raw: unknown) => {
      const event = parseSocketEvent(raw);
      if (!event) return;

      switch (event.type) {
        case "chat_message": {
          setLiveMessages((prev) => upsertMessage(prev, event.message));
          if (
            resolveSenderId(event.message.sender) !== userId &&
            activeConversationId
          ) {
            markConversationRead(activeConversationId);
          }
          refetchMy();
          refetchNew();
          break;
        }
        case "conversation_assigned": {
          setLiveConversation(event.conversation);
          refetchMy();
          refetchNew();
          break;
        }
        case "conversation_closed": {
          setLiveConversation(event.conversation);
          refetchMy();
          refetchNew();
          toast.info("Suhbat yopildi.");
          break;
        }
        case "chat_error": {
          toast.error(event.message);
          break;
        }
      }
    },
    [activeConversationId, markConversationRead, refetchMy, refetchNew, userId]
  );

  useEffect(() => {
    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    if (!shouldConnect || !activeConversationId || !token) {
      wsRef.current?.close();
      wsRef.current = null;
      setWsConnected(false);
      clearReconnectTimer();
      return;
    }

    const socketUrl = buildChatSocketUrl(activeConversationId);
    let closedByCleanup = false;

    const openSocket = () => {
      if (closedByCleanup) return;
      const ws = new WebSocket(socketUrl, ["jwt", token]);
      wsRef.current = ws;

      ws.onopen = () => {
        clearReconnectTimer();
        reconnectAttemptRef.current = 0;
        setWsConnected(true);
        setSocketError(null);
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
          handleSocketEvent(JSON.parse(event.data));
        } catch {
          // Buzuq payload — ulanish davom etadi.
        }
      };
      ws.onerror = () => {
        setWsConnected(false);
      };
      ws.onclose = (event) => {
        setWsConnected(false);
        if (closedByCleanup) return;

        if (isFatalCloseCode(event.code)) {
          setSocketError(describeCloseCode(event.code));
          queuedMessagesRef.current = [];
          setQueuedCount(0);
          return;
        }

        reconnectAttemptRef.current += 1;
        const delay = Math.min(15000, 1000 * reconnectAttemptRef.current);
        reconnectTimerRef.current = window.setTimeout(() => openSocket(), delay);
      };
    };

    reconnectAttemptRef.current = 0;
    openSocket();

    return () => {
      closedByCleanup = true;
      clearReconnectTimer();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [shouldConnect, activeConversationId, token, handleSocketEvent]);

  const handleAssign = async () => {
    if (!activeConversationId) return;
    try {
      const assigned = await assignConversation(activeConversationId).unwrap();
      setLiveConversation(assigned);
      await Promise.all([refetchMy(), refetchNew()]);
      setTab("my");
      setActiveConversationId(assigned.id);
      toast.success("Suhbat sizga biriktirildi.");
    } catch (error) {
      toast.error(
        describeChatError(error, false, "Suhbatni biriktirib bo'lmadi.")
      );
    }
  };

  const handleClose = async () => {
    if (!activeConversationId) return;
    try {
      await closeConversation(activeConversationId).unwrap();
      toast.success("Suhbat yopildi.");
      setActiveConversationId(null);
      refetchMy();
      refetchNew();
    } catch (error) {
      toast.error(describeChatError(error, false, "Suhbatni yopib bo'lmadi."));
    }
  };

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeConversationId || !canReply) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Xabar juda uzun (maksimal ${MAX_MESSAGE_LENGTH} belgi).`);
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      queuedMessagesRef.current.push(text);
      setQueuedCount(queuedMessagesRef.current.length);
    } else {
      wsRef.current.send(JSON.stringify({ text }));
    }

    setLiveMessages((prev) => [...prev, createPendingMessage(userId, text)]);
    setDraft("");
  };

  const replyHint = !activeConversationId
    ? null
    : isClosed
      ? "Suhbat yopilgan — faqat tarixni o'qish mumkin."
      : !canReply
        ? 'Javob berish uchun avval suhbatni "Qabul qilish" tugmasi orqali oling.'
        : null;

  return (
    <div className="p-4 h-[calc(100vh-88px)]">
      <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden flex flex-col md:flex-row transition-colors">
        <aside className="w-full md:w-[340px] border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Support</h2>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setTab("new")}
                className={`px-3 py-2 rounded-md text-sm transition ${
                  tab === "new"
                    ? "bg-emerald-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                Yangi ({newConversations.length})
              </button>
              <button
                onClick={() => setTab("my")}
                className={`px-3 py-2 rounded-md text-sm transition ${
                  tab === "my"
                    ? "bg-emerald-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                Mening ({myConversations.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {currentList.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Suhbatlar topilmadi.</p>
            ) : (
              currentList.map((conversation: ChatConversation) => {
                const isActive = conversation.id === activeConversationId;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setActiveConversationId(conversation.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-800/60 transition ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/50"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {formatUserName(conversation.user)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      #{conversation.id.slice(0, 8)} ·{" "}
                      {formatChatDateTime(
                        conversation.last_message_at || conversation.created_at
                      )}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${statusClass(
                          conversation.status
                        )}`}
                      >
                        {statusLabel(conversation.status)}
                      </span>
                      {!!conversation.unread_count && (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
          <header className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isSuperAdmin ? "Super administrator" : "Support Administrator"}
              </p>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {activeConversation
                  ? formatUserName(activeConversation.user)
                  : "Suhbat tanlanmagan"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeConversation && (
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${statusClass(
                    activeConversation.status
                  )}`}
                >
                  {statusLabel(activeConversation.status)}
                </span>
              )}
              {activeConversation && !isClosed && (
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                    wsConnected
                      ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {wsConnected ? "Onlayn" : queuedCount > 0 ? `Navbatda ${queuedCount}` : "Ulanmoqda"}
                </span>
              )}
              {canAssign && (
                <button
                  onClick={handleAssign}
                  disabled={assignLoading}
                  className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-60 transition hover:bg-blue-700"
                >
                  Qabul qilish
                </button>
              )}
              {canClose && (
                <button
                  onClick={handleClose}
                  disabled={closeLoading}
                  className="px-3 py-2 rounded-md bg-rose-600 text-white text-sm disabled:opacity-60 transition hover:bg-rose-700"
                >
                  Yopish
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] dark:bg-none dark:bg-slate-950">
            {!activeConversationId ? (
              <div className="h-full grid place-items-center text-slate-500 dark:text-slate-400">Suhbat tanlang.</div>
            ) : messagesLoading && mergedMessages.length === 0 ? (
              <div className="h-full grid place-items-center text-slate-500 dark:text-slate-400">Xabarlar yuklanmoqda...</div>
            ) : mergedMessages.length === 0 ? (
              <div className="h-full grid place-items-center text-slate-500 dark:text-slate-400">Xabarlar yo'q.</div>
            ) : (
              mergedMessages.map((msg) => {
                const mine = resolveSenderId(msg.sender) === userId;
                return (
                  <div key={msg.id} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        mine
                          ? "bg-emerald-600 text-white rounded-br-md"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className={`mt-1 text-[11px] ${mine ? "text-emerald-100" : "text-slate-400 dark:text-slate-400"}`}>
                        {formatChatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {socketError && (
              <p className="mb-3 text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-lg px-3 py-2">
                {socketError}
              </p>
            )}
            {replyHint && (
              <p className="mb-3 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-lg px-3 py-2">
                {replyHint}
              </p>
            )}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={canReply ? "Javob yozing..." : "Avval suhbatni qabul qiling..."}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={!canReply}
                className="flex-1 h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
              />
              <button
                type="submit"
                disabled={!canReply || !draft.trim()}
                className="h-12 rounded-xl bg-emerald-600 px-6 font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                Yuborish
              </button>
            </div>
            {draft.length > MAX_MESSAGE_LENGTH - 200 && (
              <p className="mt-2 text-right text-xs text-slate-500 dark:text-slate-400">
                {draft.length} / {MAX_MESSAGE_LENGTH}
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}

export default SupportAdmin;
