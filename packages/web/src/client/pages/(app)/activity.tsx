import { memo, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiFetch, apiDelete } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Package, Activity, CalendarCheck, Check, X, ArrowRight } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";

interface ActivityEvent {
  type:
    | "chat_started"
    | "chat_continued"
    | "item_added"
    | "item_removed"
    | "item_checked"
    | "item_unchecked"
    | "item_updated";
  threadId?: string;
  threadTitle?: string | null;
  itemId?: string;
  itemName?: string;
  actorName: string | null;
  timestamp: string | Date;
}

interface PartnerActivityPayload {
  actorName: string | null;
  actorId: string | null;
  action: "chat_started" | "chat_continued" | "item_added" | "item_removed";
  subject: string;
  threadId?: string;
  itemId?: string;
}

interface SyncListItem {
  id: string; // listItemId
  itemId: string;
  name: string;
  quantity: number;
  unit?: string;
  isCompleted: boolean;
}

interface SyncList {
  id: string;
  name: string;
  items: SyncListItem[];
}

const LOADING_SPINNER = (
  <div className="flex items-center justify-center py-16">
    <div className="animate-spin w-6 h-6 border-2 border-pixie-sage-500 border-t-transparent rounded-full" />
  </div>
);

export function groupByDay(events: ActivityEvent[]) {
  const groups: { label: string; events: ActivityEvent[] }[] = [];
  const map = new Map<string, ActivityEvent[]>();

  for (const event of events) {
    const date = new Date(event.timestamp);
    let label: string;
    if (isToday(date)) label = "Today";
    else if (isYesterday(date)) label = "Yesterday";
    else label = format(date, "MMMM d, yyyy");

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(event);
  }

  for (const [label, evs] of map.entries()) {
    groups.push({ label, events: evs });
  }

  return groups;
}

const ActivityItem = memo(function ActivityItem({
  event,
  onClick,
}: {
  event: ActivityEvent;
  onClick?: () => void;
}) {
  const actor = event.actorName || "Someone";
  const isChat = event.type === "chat_started" || event.type === "chat_continued";
  const isItem = event.type.startsWith("item_");

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-pixie-cream-100 dark:hover:bg-pixie-dusk-200 transition-colors text-left disabled:cursor-default"
    >
      <div className="w-8 h-8 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center shrink-0 text-sm font-semibold text-pixie-sage-600 dark:text-pixie-glow-sage">
        {actor.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-pixie-charcoal-200 dark:text-pixie-mist-200 leading-snug">
          <span className="font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100">
            {actor}
          </span>{" "}
          {event.type === "chat_started" && (
            <>
              started a chat
              {event.threadTitle ? (
                <> · <span className="italic">{event.threadTitle}</span></>
              ) : null}
            </>
          )}
          {event.type === "chat_continued" && (
            <>
              continued a chat
              {event.threadTitle ? (
                <> · <span className="italic">{event.threadTitle}</span></>
              ) : null}
            </>
          )}
          {event.type === "item_added" && (
            <>added <span className="font-medium">{event.itemName}</span> to the pantry</>
          )}
          {event.type === "item_removed" && (
            <>used up <span className="font-medium">{event.itemName}</span></>
          )}
          {event.type === "item_checked" && (
            <>checked off <span className="font-medium">{event.itemName}</span></>
          )}
          {event.type === "item_unchecked" && (
            <>unchecked <span className="font-medium">{event.itemName}</span></>
          )}
          {event.type === "item_updated" && (
            <>updated <span className="font-medium">{event.itemName}</span></>
          )}
        </p>
        <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 mt-0.5">
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
        </p>
      </div>
      {isChat && (
        <MessageSquare className="w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300 shrink-0 mt-0.5" />
      )}
      {isItem && (
        <Package className="w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300 shrink-0 mt-0.5" />
      )}
    </button>
  );
});

function SundaySyncModal({
  homeId,
  token,
  onClose,
}: {
  homeId: string;
  token: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["sync-list", homeId],
    queryFn: async () => {
      const res = await apiFetch<SyncList>(
        `/api/homes/${homeId}/lists/default`,
        token,
      );
      return res.data ?? null;
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (listItemId: string) => {
      if (!data) return;
      await apiDelete(
        `/api/homes/${homeId}/lists/${data.id}/items/${listItemId}`,
        token,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-list"] });
      queryClient.invalidateQueries({ queryKey: ["grocery-list"] });
    },
  });

  const items = (data?.items ?? []).filter((i) => !i.isCompleted);
  const pending = items.filter((i) => !removedIds.has(i.id));

  const handleKeep = useCallback((id: string) => {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setRemovedIds((prev) => new Set([...prev, id]));
  }, []);

  const handleFinish = useCallback(async () => {
    await Promise.all([...removedIds].map((id) => removeMutation.mutateAsync(id)));
    setDone(true);
  }, [removedIds, removeMutation]);

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-pixie-cream-50 dark:bg-pixie-dusk-50 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center">
          <CalendarCheck className="w-10 h-10 text-pixie-sage-500 dark:text-pixie-glow-sage" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100 mb-2">
            Sync complete!
          </h2>
          <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
            Your list is ready for the week.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-pixie-sage-500 hover:bg-pixie-sage-600 text-white rounded-full text-sm font-medium transition-colors"
        >
          Back to Activity
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-pixie-cream-50 dark:bg-pixie-dusk-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100 flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-1 hover:bg-pixie-cream-200 dark:hover:bg-pixie-dusk-300 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-pixie-charcoal-200 dark:text-pixie-mist-200" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
            Sunday Sync
          </h2>
          <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
            Review this week's grocery list together
          </p>
        </div>
        {pending.length > 0 && (
          <span className="text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300">
            {pending.length} left
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? LOADING_SPINNER : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <CalendarCheck className="w-12 h-12 text-pixie-sage-400 dark:text-pixie-glow-sage" />
            <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
              Your list is empty — nothing to review!
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-pixie-sage-500 hover:bg-pixie-sage-600 text-white rounded-full text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const kept = !removedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    kept
                      ? "bg-white dark:bg-pixie-dusk-100 border-pixie-cream-200 dark:border-pixie-dusk-300"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 opacity-60"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${kept ? "text-pixie-charcoal-300 dark:text-pixie-mist-100" : "text-red-500 line-through"}`}>
                      {item.name}
                    </p>
                    {(item.quantity > 1 || item.unit) && (
                      <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 mt-0.5">
                        {item.quantity} {item.unit || "×"}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => kept ? handleRemove(item.id) : handleKeep(item.id)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                        kept
                          ? "bg-pixie-cream-200 dark:bg-pixie-dusk-300 hover:bg-red-100 dark:hover:bg-red-900/30 text-pixie-charcoal-100 dark:text-pixie-mist-300 hover:text-red-500"
                          : "bg-red-100 dark:bg-red-900/30 text-red-500"
                      }`}
                      title={kept ? "Remove from list" : "Undo remove"}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {!kept && (
                      <button
                        onClick={() => handleKeep(item.id)}
                        className="w-9 h-9 rounded-full bg-pixie-sage-100 dark:bg-pixie-sage-900/30 text-pixie-sage-500 dark:text-pixie-glow-sage hover:bg-pixie-sage-200 dark:hover:bg-pixie-sage-900/50 flex items-center justify-center transition-colors"
                        title="Keep"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="p-4 border-t border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100">
          {removedIds.size > 0 && (
            <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 mb-3 text-center">
              {removedIds.size} item{removedIds.size > 1 ? "s" : ""} will be removed
            </p>
          )}
          <button
            onClick={handleFinish}
            disabled={removeMutation.isPending}
            className="w-full py-3 bg-pixie-sage-500 hover:bg-pixie-sage-600 disabled:opacity-60 text-white rounded-full text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {removeMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Finish Sync
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ActivityPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [realtimeEvents, setRealtimeEvents] = useState<ActivityEvent[]>([]);
  const [showSync, setShowSync] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["activity", user?.homeId],
    queryFn: () =>
      apiFetch<ActivityEvent[]>(
        `/api/homes/${user!.homeId}/activity`,
        token!,
      ),
    enabled: !!token && !!user?.homeId,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleWSMessage = useCallback((msg: any) => {
    if (msg.type === "partner_activity") {
      const p = msg.payload as PartnerActivityPayload;
      const isItemAction = p.action.startsWith("item_");
      const newEvent: ActivityEvent = {
        type: p.action,
        threadId: p.threadId,
        itemId: p.itemId,
        itemName: isItemAction ? p.subject : undefined,
        actorName: p.actorName,
        timestamp: msg.timestamp || new Date().toISOString(),
      };
      setRealtimeEvents((prev) => [newEvent, ...prev].slice(0, 50));
    }
  }, []);

  useWebSocket({ onMessage: handleWSMessage });

  const historicEvents: ActivityEvent[] = data?.data ?? [];
  const allEvents = [...realtimeEvents, ...historicEvents];
  const groups = groupByDay(allEvents);

  return (
    <div className="flex flex-col h-full bg-pixie-cream-50 dark:bg-pixie-dusk-50">
      {/* Sunday Sync overlay */}
      {showSync && token && user?.homeId && (
        <SundaySyncModal
          homeId={user.homeId}
          token={token}
          onClose={() => setShowSync(false)}
        />
      )}

      {/* Header */}
      <div className="p-4 border-b border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100 shrink-0 flex items-center justify-between">
        <h2 className="text-xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
          Activity
        </h2>
        <button
          onClick={() => setShowSync(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 text-pixie-sage-600 dark:text-pixie-glow-sage hover:bg-pixie-sage-200 dark:hover:bg-pixie-dusk-300 transition-colors text-sm font-medium"
        >
          <CalendarCheck className="w-4 h-4" />
          Sunday Sync
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? LOADING_SPINNER : allEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center">
              <Activity className="w-8 h-8 text-pixie-sage-400 dark:text-pixie-glow-sage" />
            </div>
            <div>
              <p className="text-base font-medium text-pixie-charcoal-200 dark:text-pixie-mist-100 mb-1">
                No activity yet
              </p>
              <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
                Activity from you and your household will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="pb-4">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-2 sticky top-0 bg-pixie-cream-50/90 dark:bg-pixie-dusk-50/90 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-pixie-charcoal-100 dark:text-pixie-mist-300">
                    {group.label}
                  </p>
                </div>
                <div className="divide-y divide-pixie-cream-200 dark:divide-pixie-dusk-300">
                  {group.events.map((event, i) => (
                    <ActivityItem
                      key={`${event.type}-${event.threadId ?? event.itemId ?? i}-${String(event.timestamp)}`}
                      event={event}
                      onClick={
                        event.threadId
                          ? () => navigate(`/chat/${event.threadId}`)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
