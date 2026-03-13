import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  MessageSquare,
  Bell,
  Zap,
  ArrowRight,
  ArrowLeft,
  Link,
} from "lucide-react";

interface Communication {
  id: number;
  channel: string;
  direction: string;
  subject: string | null;
  body: string | null;
  status: string;
  sentBy: number | null;
  campaignId: number | null;
  metadata: any;
  createdAt: string;
}

interface CommunicationTimelineProps {
  userId: number;
}

function getChannelIcon(channel: string) {
  switch (channel) {
    case "email":
      return <Mail className="h-4 w-4" />;
    case "sms":
      return <MessageSquare className="h-4 w-4" />;
    case "in_app":
      return <Bell className="h-4 w-4" />;
    case "drip":
      return <Zap className="h-4 w-4" />;
    default:
      return <Mail className="h-4 w-4" />;
  }
}

function getChannelColor(channel: string) {
  switch (channel) {
    case "email":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "sms":
      return "bg-green-100 text-green-700 border-green-300";
    case "in_app":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "drip":
      return "bg-purple-100 text-purple-700 border-purple-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case "sent":
      return "bg-green-100 text-green-700";
    case "delivered":
      return "bg-blue-100 text-blue-700";
    case "opened":
      return "bg-purple-100 text-purple-700";
    case "clicked":
      return "bg-indigo-100 text-indigo-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function relativeTime(dateStr: string, isEs: boolean): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) {
    return isEs ? "ahora mismo" : "just now";
  }
  if (diffMin < 60) {
    return isEs
      ? `hace ${diffMin} minuto${diffMin !== 1 ? "s" : ""}`
      : `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  }
  if (diffHr < 24) {
    return isEs
      ? `hace ${diffHr} hora${diffHr !== 1 ? "s" : ""}`
      : `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  }
  if (diffDay < 30) {
    return isEs
      ? `hace ${diffDay} dia${diffDay !== 1 ? "s" : ""}`
      : `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  }
  const diffMonth = Math.floor(diffDay / 30);
  return isEs
    ? `hace ${diffMonth} mes${diffMonth !== 1 ? "es" : ""}`
    : `${diffMonth} month${diffMonth !== 1 ? "s" : ""} ago`;
}

export default function CommunicationTimeline({
  userId,
}: CommunicationTimelineProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const { data: communications = [], isLoading } = useQuery<Communication[]>({
    queryKey: ["crm-communications", userId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/admin/crm/${userId}/communications`,
      );
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Mail className="mb-3 h-10 w-10" />
        <p className="text-sm">
          {isEs ? "No hay comunicaciones aun" : "No communications yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

      {communications.map((comm, index) => {
        const channelColor = getChannelColor(comm.channel);
        const statusColor = getStatusVariant(comm.status);
        const truncatedBody =
          comm.body && comm.body.length > 100
            ? comm.body.slice(0, 100) + "..."
            : comm.body;

        return (
          <div key={comm.id} className="relative flex gap-4 pb-6">
            {/* Icon node */}
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${channelColor}`}
            >
              {getChannelIcon(comm.channel)}
            </div>

            {/* Content card */}
            <div className="flex-1 rounded-lg border bg-card p-3 shadow-sm">
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                {/* Direction arrow */}
                {comm.direction === "outbound" ? (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
                )}

                {/* Subject */}
                {comm.subject && (
                  <span className="text-sm font-semibold">{comm.subject}</span>
                )}

                {/* Status badge */}
                <Badge
                  variant="outline"
                  className={`ml-auto text-xs ${statusColor} border-0`}
                >
                  {comm.status}
                </Badge>
              </div>

              {/* Body preview */}
              {truncatedBody && (
                <p className="mb-2 text-sm text-muted-foreground">
                  {truncatedBody}
                </p>
              )}

              {/* Footer: timestamp + campaign link */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{relativeTime(comm.createdAt, isEs)}</span>
                {comm.campaignId && (
                  <span className="inline-flex items-center gap-1">
                    <Link className="h-3 w-3" />
                    {isEs ? "Campana" : "Campaign"} #{comm.campaignId}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
