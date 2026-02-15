import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  admin: "bg-pixie-sage-100 text-pixie-sage-700 dark:bg-pixie-sage-900/30 dark:text-pixie-glow-sage",
  member: "bg-pixie-cream-200 text-pixie-charcoal-300 dark:bg-pixie-dusk-300 dark:text-pixie-mist-200",
  viewer: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
};

export function MemberList() {
  const { token, user } = useAuth();

  const { data: members = [] } = useQuery({
    queryKey: ["members", user?.homeId],
    queryFn: async () => {
      const res = await apiGet<Member[]>(`/api/homes/${user!.homeId}/members`, token!);
      return res.data || [];
    },
    enabled: !!token && !!user?.homeId,
  });

  if (members.length <= 1) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-pixie-sage-500 dark:text-pixie-glow-sage" />
        <h4 className="text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 uppercase tracking-wider">
          Kitchen Members
        </h4>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pixie-cream-100/50 dark:bg-pixie-dusk-200/50"
          >
            <div className="w-9 h-9 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-300 flex items-center justify-center text-sm font-semibold text-pixie-sage-600 dark:text-pixie-glow-sage">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100 truncate">
                {member.name}
                {member.userId === user?.id && (
                  <span className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 ml-1">(you)</span>
                )}
              </p>
              <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                {member.email}
              </p>
            </div>
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium capitalize",
                ROLE_COLORS[member.role.toLowerCase()] || ROLE_COLORS.member
              )}
            >
              {member.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
