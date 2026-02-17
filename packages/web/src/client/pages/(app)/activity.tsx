import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiFetch } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Package, Activity } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";

interface ActivityEvent {
  type: "chat_started" | "chat_continued" | "item_added";
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

function groupByDay(events: ActivityEvent[]) {
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

function ActivityItem({
  event,
  onClick,
}: {
  event: ActivityEvent;
  onClick?: () => void;
}) {
  const actor = event.actorName || "Someone";
  const isChat = event.type === "chat_started" || event.type === "chat_continued";

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
        </p>
        <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 mt-0.5">
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
        </p>
      </div>
      {isChat && (
        <MessageSquare className="w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300 shrink-0 mt-0.5" />
      )}
      {event.type === "item_added" && (
        <Package className="w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300 shrink-0 mt-0.5" />
      )}
    </button>
  );
}

export default function ActivityPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [realtimeEvents, setRealtimeEvents] = useState<ActivityEvent[]>([]);

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
      const newEvent: ActivityEvent = {
        type: p.action === "item_added" || p.action === "item_removed"
          ? "item_added"
          : p.action,
        threadId: p.threadId,
        itemId: p.itemId,
        itemName: p.action === "item_added" ? p.subject : undefined,
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
      {/* Header */}
      <div className="p-4 border-b border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100 shrink-0">
        <h2 className="text-xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
          Activity
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-pixie-sage-500 border-t-transparent rounded-full" />
          </div>
        ) : allEvents.length === 0 ? (
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
