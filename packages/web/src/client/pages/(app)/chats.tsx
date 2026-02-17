import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { MessageSquare, Plus, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ChatThread {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ChatsPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["threads", user?.homeId],
    queryFn: () =>
      apiFetch<ChatThread[]>(
        `/api/homes/${user!.homeId}/chat/threads`,
        token!,
      ),
    enabled: !!token && !!user?.homeId,
  });

  const createThread = useMutation({
    mutationFn: () =>
      apiFetch<ChatThread>(
        `/api/homes/${user!.homeId}/chat/threads`,
        token!,
        {
          method: "POST",
          body: JSON.stringify({ title: "New Chat" }),
        },
      ),
    onSuccess: (res) => {
      if (res.data) {
        queryClient.invalidateQueries({ queryKey: ["threads"] });
        navigate(`/chat/${res.data.id}`);
      }
    },
    onError: () => toast.error("Failed to create chat"),
  });

  const threads = data?.data ?? [];

  return (
    <div className="flex flex-col h-full bg-pixie-cream-50 dark:bg-pixie-dusk-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100 shrink-0">
        <h2 className="text-xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
          Chats
        </h2>
        <button
          onClick={() => createThread.mutate()}
          disabled={createThread.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pixie-sage-500 text-white text-sm font-medium disabled:opacity-60 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-pixie-sage-500 border-t-transparent rounded-full" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-pixie-sage-400 dark:text-pixie-glow-sage" />
            </div>
            <div>
              <p className="text-base font-medium text-pixie-charcoal-200 dark:text-pixie-mist-100 mb-1">
                No chats yet
              </p>
              <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
                Start a conversation with Pixie
              </p>
            </div>
            <button
              onClick={() => createThread.mutate()}
              disabled={createThread.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-pixie-sage-500 text-white text-sm font-medium disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              Start a Chat
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-pixie-cream-200 dark:divide-pixie-dusk-300">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  onClick={() => navigate(`/chat/${thread.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-pixie-cream-100 dark:hover:bg-pixie-dusk-200 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-pixie-sage-500 dark:text-pixie-glow-sage" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100 truncate">
                      {thread.title || "Chat"}
                    </p>
                    <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                      {formatDistanceToNow(new Date(thread.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
