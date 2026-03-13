import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, CheckCheck } from "lucide-react";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread"],
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const { data: notifications } = useQuery<NotificationItem[]>({
    queryKey: ["/api/notifications"],
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    },
  });

  const unreadCount = unreadData?.count || 0;
  const items = notifications || [];

  const handleClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      setLocation(notification.link);
    }
    setOpen(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return language === "es" ? "ahora" : "now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2" aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}>
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="font-semibold text-sm text-[#0A4A6E]">
            {language === "es" ? "Notificaciones" : "Notifications"}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-[#1C7BB1] h-auto p-1"
              onClick={() => markAllReadMutation.mutate()}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              {language === "es" ? "Marcar todo" : "Mark all"}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-gray-400">
            {language === "es" ? "Sin notificaciones" : "No notifications"}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.slice(0, 15).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`px-3 py-2 cursor-pointer ${!n.isRead ? "bg-[#EAF4FA]/50" : ""}`}
                onClick={() => handleClick(n)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#1C7BB1] flex-shrink-0" />}
                    <p className={`text-sm truncate ${!n.isRead ? "font-semibold text-[#0A4A6E]" : "text-gray-600"}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-auto">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
