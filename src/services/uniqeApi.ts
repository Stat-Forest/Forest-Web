import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";
import { chatTimestamp } from "@/utils/chatUtils";

export type ChatStatus = "new" | "taken" | "closed";

export interface ChatUser {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  role: string;
}

export interface ChatConversation {
  id: string;
  status: ChatStatus;
  user: ChatUser;
  assigned_to: ChatUser | null;
  taken_at?: string | null;
  closed_at?: string | null;
  last_message_at?: string | null;
  created_at: string;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  sender: string | ChatUser;
  text: string;
  is_read: boolean;
  created_at: string;
}

/** Chat endpointlari DRF sahifalash formatida javob qaytaradi. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface MarkReadResponse {
  marked_count: number;
}

const CHAT_PAGE_SIZE = 100;
const MAX_MESSAGE_PAGES = 20;

const isPaginated = <T>(value: unknown): value is Paginated<T> =>
  typeof value === "object" &&
  value !== null &&
  Array.isArray((value as Paginated<T>).results);

/** Sahifalangan javobni ham, eski massiv javobini ham qo'llab-quvvatlaydi. */
const unwrapList = <T>(response: unknown): T[] => {
  if (Array.isArray(response)) return response as T[];
  if (isPaginated<T>(response)) return response.results;
  return [];
};

export const uniqeApi = createApi({
  reducerPath: "uniqeApi",
  baseQuery: createBaseQueryWithReauth(`${base_url}`),
  tagTypes: ["Reports", "Conversations", "Messages"],
  endpoints: (builder) => ({
    createAiChat: builder.mutation({
      query: (newReport) => ({
        url: `/ai/chat/`,
        method: "POST",
        body: newReport,
      }),
      invalidatesTags: ["Reports"],
    }),
      exportStats: builder.mutation({
      query: (type) => ({
        url: `/report_admin_stat/stats/export/`,
        method: "GET",
        params: { type }, // csv yoki excel
        responseHandler: async (response) => await response.blob(),
      }),
    }),
    createConversation: builder.mutation<ChatConversation, void>({
      query: () => ({
        url: `/chats/conversations/`,
        method: "POST",
      }),
      invalidatesTags: ["Conversations"],
    }),
    getConversationsList: builder.query<ChatConversation[], void>({
      query: () => ({
        url: `/chats/conversations/list/`,
        method: "GET",
        params: { page: 1, per_page: CHAT_PAGE_SIZE },
      }),
      transformResponse: (response: unknown) =>
        unwrapList<ChatConversation>(response),
      providesTags: ["Conversations"],
    }),
    getConversationDetail: builder.query<ChatConversation, string>({
      query: (conversationId) => ({
        url: `/chats/conversations/${conversationId}/`,
        method: "GET",
      }),
      providesTags: (_result, _error, conversationId) => [
        { type: "Conversations", id: conversationId },
      ],
    }),
    // Tarix sahifalangan holda keladi — to'liq suhbatni ko'rsatish uchun
    // barcha sahifalar ketma-ket yig'iladi (guide 2.3 / 7-bo'lim).
    getConversationMessages: builder.query<ChatMessage[], string>({
      async queryFn(conversationId, _api, _extraOptions, baseQuery) {
        const collected: ChatMessage[] = [];

        for (let page = 1; page <= MAX_MESSAGE_PAGES; page += 1) {
          const response = await baseQuery({
            url: `/chats/conversations/${conversationId}/messages/`,
            method: "GET",
            params: { page, per_page: CHAT_PAGE_SIZE },
          });

          if (response.error) {
            // Birinchi sahifa muvaffaqiyatli o'qilgan bo'lsa, keyingi
            // sahifadagi xato butun tarixni yo'qotmasligi kerak.
            if (collected.length > 0) break;
            return { error: response.error };
          }

          collected.push(...unwrapList<ChatMessage>(response.data));

          if (!isPaginated<ChatMessage>(response.data) || !response.data.next) {
            break;
          }
        }

        // Backend teskari (yangidan eskiga) tartibda qaytarishi mumkin —
        // chat oynasi uchun har doim eskidan yangiga tartiblaymiz.
        const first = chatTimestamp(collected[0]?.created_at);
        const last = chatTimestamp(collected[collected.length - 1]?.created_at);
        if (first && last && first > last) collected.reverse();

        return { data: collected };
      },
      providesTags: (_result, _error, conversationId) => [
        { type: "Messages", id: conversationId },
      ],
    }),
    markConversationRead: builder.mutation<MarkReadResponse, string>({
      query: (conversationId) => ({
        url: `/chats/conversations/${conversationId}/mark-read/`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, conversationId) => [
        "Conversations",
        { type: "Messages", id: conversationId },
      ],
    }),
    // Faqat chat egasi va faqat `new` holatidagi chatni bekor qila oladi.
    cancelConversation: builder.mutation<ChatConversation, string>({
      query: (conversationId) => ({
        url: `/chats/conversations/${conversationId}/cancel/`,
        method: "POST",
      }),
      invalidatesTags: ["Conversations"],
    }),
    getSupportMyConversations: builder.query<ChatConversation[], void>({
      query: () => ({
        url: `/chats/support/my/`,
        method: "GET",
        params: { page: 1, per_page: CHAT_PAGE_SIZE },
      }),
      transformResponse: (response: unknown) =>
        unwrapList<ChatConversation>(response),
      providesTags: ["Conversations"],
    }),
    getSupportNewConversations: builder.query<ChatConversation[], void>({
      query: () => ({
        url: `/chats/support/new/`,
        method: "GET",
        params: { page: 1, per_page: CHAT_PAGE_SIZE },
      }),
      transformResponse: (response: unknown) =>
        unwrapList<ChatConversation>(response),
      providesTags: ["Conversations"],
    }),
    assignConversation: builder.mutation<ChatConversation, string>({
      query: (conversationId) => ({
        url: `/chats/conversations/${conversationId}/assign/`,
        method: "POST",
      }),
      invalidatesTags: ["Conversations"],
    }),
    closeConversation: builder.mutation<ChatConversation, string>({
      query: (conversationId) => ({
        url: `/chats/conversations/${conversationId}/close/`,
        method: "POST",
      }),
      invalidatesTags: ["Conversations"],
    }),
  }),
});

export const {
  useCreateAiChatMutation,
  useExportStatsMutation,
  useCreateConversationMutation,
  useGetConversationsListQuery,
  useGetConversationDetailQuery,
  useGetConversationMessagesQuery,
  useMarkConversationReadMutation,
  useCancelConversationMutation,
  useGetSupportMyConversationsQuery,
  useGetSupportNewConversationsQuery,
  useAssignConversationMutation,
  useCloseConversationMutation,
} = uniqeApi;
