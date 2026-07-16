import { createApi } from "@reduxjs/toolkit/query/react";
import { base_url } from "./baseUrl";
import { createBaseQueryWithReauth } from "./baseQueryWithReauth";

export interface ChatUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface ChatConversation {
  id: string;
  status: string;
  user: ChatUser;
  assigned_to: ChatUser | null;
  taken_at: string | null;
  closed_at: string | null;
  last_message_at: string | null;
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

interface MarkReadResponse {
  marked_count: number;
}

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
      }),
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
    getConversationMessages: builder.query<ChatMessage[], string>({
      query: (conversationId) => ({
        url: `/chats/conversations/${conversationId}/messages/`,
        method: "GET",
      }),
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
} = uniqeApi;
