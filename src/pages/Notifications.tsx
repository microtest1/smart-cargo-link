import { AppLayout } from "@/components/layout/AppLayout";
import { Bell, Package, CreditCard, MessageCircle, Megaphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

const iconMap = {
  shipment: Package,
  payment: CreditCard,
  support: MessageCircle,
  announcement: Megaphone,
};

const colorMap = {
  shipment: "bg-cargo-blue/10 text-cargo-blue",
  payment: "bg-cargo-gold/10 text-cargo-gold",
  support: "bg-cargo-teal/10 text-cargo-teal",
  announcement: "bg-accent/10 text-accent",
};

export default function Notifications() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    isMarkingAllRead 
  } = useNotifications();

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId);
    }
  };

  return (
    <AppLayout title="Notifications">
      <div className="px-4 py-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl mb-1">Notifications</h1>
            <p className="text-muted-foreground text-sm">
              {unreadCount > 0 ? `${unreadCount} unread messages` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllRead}
              disabled={isMarkingAllRead}
            >
              {isMarkingAllRead ? (
                <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-1" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        )}

        {/* Notifications List */}
        {!isLoading && (
          <div className="space-y-3">
            {notifications.map((notification, index) => {
              const notificationType = notification.type as keyof typeof iconMap;
              const Icon = iconMap[notificationType] || Bell;
              const colorClass = colorMap[notificationType] || "bg-muted text-muted-foreground";
              
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.read || false)}
                  className={cn(
                    "bg-card rounded-xl p-4 border transition-all duration-300 animate-scale-in cursor-pointer",
                    notification.read
                      ? "border-border/50"
                      : "border-accent/30 shadow-card"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        colorClass
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={cn(
                          "font-semibold text-sm",
                          !notification.read && "text-foreground"
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">No notifications</p>
            <p className="text-sm text-muted-foreground">
              You're all caught up!
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
