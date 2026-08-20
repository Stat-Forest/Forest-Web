"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { MessageCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import type { RootState } from "@/app/store";
import {
  ChatConversation,
  ChatMessage,
  ChatStatus,
  useCancelConversationMutation,
  useCreateConversationMutation,
  useGetConversationMessagesQuery,
  useGetConversationsListQuery,
  useMarkConversationReadMutation,
} from "@/services/uniqeApi";
import {
  MAX_MESSAGE_LENGTH,
  buildChatSocketUrl,
  canCancelConversation,
  canSendMessage,
  createPendingMessage,
  describeChatError,
  describeCloseCode,
  formatChatDateTime,
  formatChatTime,
  isFatalCloseCode,
  mergeChatMessages,
  parseSocketEvent,
  resolveSenderId,
  upsertMessage,
} from "@/utils/chatUtils";

const statusLabel = (status: ChatStatus, isRu: boolean) => {
  switch (status) {
    case "new":
      return isRu ? "В очереди" : "Navbatda";
    case "taken":
      return isRu ? "Оператор на связи" : "Operator ulandi";
    case "closed":
      return isRu ? "Закрыт" : "Yopilgan";
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

function SupportChatWidget() {
  const { i18n } = useTranslation();
  const isRu = i18n.language === "ru";
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = String(
    useSelector((state: RootState) => state.auth.user?.user_id ?? "")
  );

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  // WS `conversation_assigned` / `conversation_closed` hodisalari ro'yxat
  // qayta yuklanguncha darhol UI'da aks etishi uchun.
  const [liveConversation, setLiveConversation] =
    useState<ChatConversation | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const queuedMessagesRef = useRef<string[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const markedConversationRef = useRef<string | null>(null);
  // Chat ochilganda avtomatik conversation yaratish bir marta bo'lishi uchun
  const autoCreateAttemptedRef = useRef(false);

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
  const [cancelConversation, { isLoading: cancellingConversation }] =
    useCancelConversationMutation();
  const [markConversationRead] = useMarkConversationReadMutation();

  const activeConversation = useMemo(() => {
    const fromList =
      conversations.find((item) => item.id === activeConversationId) ?? null;
    if (liveConversation && liveConversation.id === activeConversationId) {
      return { ...(fromList ?? {}), ...liveConversation } as ChatConversation;
    }
    return fromList;
  }, [activeConversationId, conversations, liveConversation]);

  const mergedMessages = useMemo(
    () => mergeChatMessages(historyMessages, liveMessages),
    [historyMessages, liveMessages]
  );

  const isClosed = activeConversation?.status === "closed";
  const canWrite = canSendMessage(activeConversation, userId);
  // Faqat ochiq chat uchun WS ulanamiz — yopilganida tarixni o'qish kifoya.
  const shouldConnect = Boolean(
    isOpen && activeConversationId && token && activeConversation && !isClosed
  );

  useEffect(() => {
    if (!isOpen || conversationsLoading) return;
    if (activeConversationId) return;

    // Ochiq (yopilmagan) conversation bo'lsa — uni tanlash
    const openConversation = conversations.find((c) => c.status !== "closed");
    if (openConversation) {
      setActiveConversationId(openConversation.id);
      return;
    }

    // Ochiq conversation yo'q — bir marta avtomatik yangi chat yaratish
    if (!autoCreateAttemptedRef.current && !creatingConversation) {
      autoCreateAttemptedRef.current = true;
      createConversation()
        .unwrap()
        .then((created) => {
          setActiveConversationId(created.id);
          refetchConversations();
        })
        .catch((error) => {
          autoCreateAttemptedRef.current = false;
          toast.error(
            describeChatError(
              error,
              isRu,
              isRu
                ? "Не удалось создать чат. Попробуйте еще раз."
                : "Chat yaratib bo'lmadi. Qaytadan urinib ko'ring."
            )
          );
        });
    }
  }, [
    isOpen,
    activeConversationId,
    conversations,
    conversationsLoading,
    creatingConversation,
    createConversation,
    refetchConversations,
    isRu,
  ]);

  useEffect(() => {
    if (isOpen) return;
    setActiveConversationId(null);
    setDraft("");
    autoCreateAttemptedRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    setLiveMessages([]);
    setLiveConversation(null);
    setSocketError(null);
    queuedMessagesRef.current = [];
    setQueuedCount(0);
    markedConversationRef.current = null;
  }, [activeConversationId]);

  // `messages/` endpointi o'zi o'qildi deb belgilaydi; bu chaqiruv chat
  // ochiqligida kelgan yangi xabarlar uchun (tarix qayta yuklanmaydi).
  useEffect(() => {
    if (!isOpen || !activeConversationId) return;
    if (markedConversationRef.current === activeConversationId) return;

    markedConversationRef.current = activeConversationId;
    markConversationRead(activeConversationId);
  }, [activeConversationId, isOpen, markConversationRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mergedMessages]);

  const handleSocketEvent = useCallback(
    (raw: unknown) => {
      const event = parseSocketEvent(raw);
      if (!event) return;

      switch (event.type) {
        case "chat_message": {
          // Broadcast echo — o'z xabarimiz ham qaytadi, id bo'yicha dedupe.
          setLiveMessages((prev) => upsertMessage(prev, event.message));
          if (resolveSenderId(event.message.sender) !== userId) {
            if (activeConversationId) markConversationRead(activeConversationId);
          }
          refetchConversations();
          break;
        }
        case "conversation_assigned": {
          setLiveConversation(event.conversation);
          refetchConversations();
          toast.info(
            isRu ? "Оператор подключился к чату." : "Operator chatga ulandi."
          );
          break;
        }
        case "conversation_closed": {
          setLiveConversation(event.conversation);
          refetchConversations();
          toast.info(isRu ? "Чат закрыт." : "Chat yopildi.");
          break;
        }
        case "chat_error": {
          // Ulanish ochiq qoladi — faqat foydalanuvchini ogohlantiramiz.
          toast.error(event.message);
          break;
        }
      }
    },
    [activeConversationId, isRu, markConversationRead, refetchConversations, userId]
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
          // Buzuq payload UI ni to'xtatmaydi.
        }
      };
      ws.onerror = () => {
        setWsConnected(false);
      };
      ws.onclose = (event) => {
        setWsConnected(false);
        if (closedByCleanup) return;

        // 4401 / 4403 / 4404 — qayta ulanish foyda bermaydi (guide 3.1).
        if (isFatalCloseCode(event.code)) {
          setSocketError(describeCloseCode(event.code, isRu));
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
  }, [shouldConnect, activeConversationId, token, isRu, handleSocketEvent]);

  const handleCreateConversation = async () => {
    try {
      const created = await createConversation().unwrap();
      setActiveConversationId(created.id);
      setIsOpen(true);
      refetchConversations();
    } catch (error) {
      toast.error(
        describeChatError(
          error,
          isRu,
          isRu
            ? "Не удалось создать чат. Попробуйте еще раз."
            : "Chat yaratib bo'lmadi. Qaytadan urinib ko'ring."
        )
      );
    }
  };

  const handleCancelConversation = async (conversationId: string) => {
    try {
      await cancelConversation(conversationId).unwrap();
      toast.success(isRu ? "Чат отменен." : "Chat bekor qilindi.");
      refetchConversations();
    } catch (error) {
      toast.error(describeChatError(error, isRu));
    }
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text || !activeConversationId || !canWrite) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      toast.error(
        isRu
          ? `Сообщение слишком длинное (максимум ${MAX_MESSAGE_LENGTH} символов).`
          : `Xabar juda uzun (maksimal ${MAX_MESSAGE_LENGTH} belgi).`
      );
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

  const inputPlaceholder = isClosed
    ? isRu
      ? "Чат закрыт"
      : "Chat yopilgan"
    : isRu
      ? "Введите ваше сообщение..."
      : "Xabaringizni yozing...";

  return (
    <div className="fixed right-10 bottom-10 z-[120]">
      {isOpen && (
        <div className="w-[min(92vw,980px)] h-[min(78vh,640px)] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col md:flex-row mb-4 transition-colors">
          <aside className="w-full md:w-[320px] border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Support Chat</h2>
              <button
                onClick={handleCreateConversation}
                disabled={creatingConversation}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {creatingConversation
                  ? isRu
                    ? "Создание..."
                    : "Yaratilmoqda..."
                  : isRu
                    ? "Новый чат"
                    : "Yangi chat"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                  {isRu ? "Загрузка чатов..." : "Chatlar yuklanmoqda..."}
                </p>
              ) : conversations.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                  {isRu
                    ? 'У вас пока нет чатов. Нажмите "Новый чат".'
                    : 'Sizda hali chat yo\'q. "Yangi chat" ni bosing.'}
                </p>
              ) : (
                conversations.map((conversation: ChatConversation) => {
                  const isActive = conversation.id === activeConversationId;

                  return (
                    <div
                      key={conversation.id}
                      className={`border-b border-slate-200 dark:border-slate-800/60 transition ${
                        isActive
                          ? "bg-emerald-50 dark:bg-emerald-950/50"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveConversationId(conversation.id)}
                        onKeyDown={(e) => e.key === "Enter" && setActiveConversationId(conversation.id)}
                        className="w-full text-left px-4 pt-3 pb-3 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {isRu
                              ? `Обращение #${conversation.id.slice(0, 8)}`
                              : `Murojaat #${conversation.id.slice(0, 8)}`}
                          </p>
                          {!!conversation.unread_count && (
                            <span className="min-w-5 h-5 rounded-full bg-rose-500 px-1 text-center text-xs leading-5 text-white">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${statusClass(
                              conversation.status
                            )}`}
                          >
                            {statusLabel(conversation.status, isRu)}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatChatDateTime(
                              conversation.last_message_at || conversation.created_at
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );

                })
              )}
            </div>
          </aside>

          <section className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
            <header className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isRu ? "Связь с оператором" : "Operator bilan muloqot"}
                </p>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {activeConversation
                    ? isRu
                      ? `Обращение #${activeConversation.id.slice(0, 8)}`
                      : `Murojaat #${activeConversation.id.slice(0, 8)}`
                    : isRu
                      ? "Чат не выбран"
                      : "Chat tanlanmagan"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeConversation && canCancelConversation(activeConversation, userId) && (
                  <button
                    type="button"
                    onClick={() => handleCancelConversation(activeConversation.id)}
                    disabled={cancellingConversation}
                    className="text-xs font-medium px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-60 transition cursor-pointer"
                  >
                    {cancellingConversation
                      ? isRu
                        ? "Отмена..."
                        : "Bekor qilinmoqda..."
                      : isRu
                        ? "Отменить"
                        : "Bekor qilish"}
                  </button>
                )}
                {activeConversation && (
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${statusClass(
                      activeConversation.status
                    )}`}
                  >
                    {statusLabel(activeConversation.status, isRu)}
                  </span>
                )}
                {!isClosed && activeConversation && (
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
                      wsConnected
                        ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {wsConnected
                      ? isRu
                        ? "Онлайн"
                        : "Onlayn"
                      : queuedCount > 0
                        ? isRu
                          ? `В очереди ${queuedCount}`
                          : `Navbatda ${queuedCount}`
                        : isRu
                          ? "Подключение..."
                          : "Ulanmoqda"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 grid place-items-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  aria-label={isRu ? "Закрыть чат" : "Chatni yopish"}
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] dark:bg-none dark:bg-slate-950">
              {!activeConversation ? (
                <div className="h-full grid place-items-center text-slate-500 dark:text-slate-400">
                  {isRu
                    ? "Выберите чат слева или создайте новый чат."
                    : "Chap tomondan chat tanlang yoki yangi chat yarating."}
                </div>
              ) : messagesLoading && mergedMessages.length === 0 ? (
                <div className="h-full grid place-items-center text-slate-500 dark:text-slate-400">
                  {isRu ? "Загрузка сообщений..." : "Xabarlar yuklanmoqda..."}
                </div>
              ) : mergedMessages.length === 0 ? (
                <div className="h-full grid place-items-center text-slate-500 dark:text-slate-400">
                  {isRu ? "Пока нет сообщений." : "Hozircha xabarlar mavjud emas."}
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
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-6 whitespace-pre-wrap">
                          {msg.text}
                        </p>
                        <p
                          className={`mt-1 text-[11px] ${
                            mine ? "text-emerald-100" : "text-slate-400 dark:text-slate-400"
                          }`}
                        >
                          {formatChatTime(msg.created_at)}
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
              className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              {socketError && (
                <p className="mb-3 text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-lg px-3 py-2">
                  {socketError}
                </p>
              )}
              {isClosed && (
                <p className="mb-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                  {isRu
                    ? "Чат закрыт — можно только читать историю."
                    : "Chat yopilgan — faqat tarixni o'qish mumkin."}
                </p>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={inputPlaceholder}
                  maxLength={MAX_MESSAGE_LENGTH}
                  disabled={!canWrite}
                  className="flex-1 h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                />
                <button
                  type="submit"
                  disabled={!canWrite || !draft.trim()}
                  className="h-12 rounded-xl bg-emerald-600 px-6 font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                  {isRu ? "Отправить" : "Yuborish"}
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
