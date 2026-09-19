/**
 * Student Notifications Center
 * Uses real backend notifications API
 */
import React, { useEffect, useState } from "react";
import { notificationsAPI, Notification as NotificationType } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  Award,
  MessageCircle,
  TrendingUp,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const getIconForType = (type: string) => {
  switch (type) {
    case "course":
      return <BookOpen size={16} />;
    case "quiz":
      return <Award size={16} />;
    case "certificate":
      return <Award size={16} />;
    case "success":
      return <TrendingUp size={16} />;
    case "warning":
      return <Bell size={16} />;
    case "error":
      return <Bell size={16} />;
    default:
      return <MessageCircle size={16} />;
  }
};

const getColorForType = (type: string) => {
  switch (type) {
    case "success":
      return "bg-success/10 text-success";
    case "warning":
      return "bg-warning/10 text-warning";
    case "error":
      return "bg-destructive/10 text-destructive";
    case "certificate":
      return "bg-accent/10 text-accent";
    case "course":
      return "bg-info/10 text-info";
    default:
      return "bg-muted/10 text-muted-foreground";
  }
};

const formatTime = (timestamp: string, t: (key: any) => string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("notifications.justNow");
  if (diffMins < 60) return `${diffMins} ${t("notifications.minutesAgo")}`;
  if (diffHours < 24) return `${diffHours} ${t("notifications.hoursAgo")}`;
  if (diffDays < 7) return `${diffDays} ${t("notifications.daysAgo")}`;
  return date.toLocaleDateString();
};

const NotificationsPage: React.FC = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    setUpdating(id);
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    } finally {
      setUpdating(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const unreadCount = notifications.filter((n) => n.read !== true).length;

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell size={24} className="text-accent" />{" "}
              {t("notifications.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {unreadCount}{" "}
              {unreadCount === 1
                ? t("notifications.unread")
                : t("notifications.unreadPlural")}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck size={14} className="mr-1.5" />{" "}
              {t("notifications.markAllRead")}
            </Button>
          )}
        </motion.div>

        {notifications.length === 0 ? (
          <Card className="shadow-card border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Bell size={28} className="text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                {t("notifications.emptyTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("notifications.emptyDescription")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={`shadow-card cursor-pointer transition-all hover:shadow-elevated ${n.read !== true ? "border-accent/30 bg-accent/5" : ""}`}
                  onClick={() => handleMarkAsRead(n.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.read !== true ? "Mark as read: " : "Open notification: "}${n.title}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleMarkAsRead(n.id);
                    }
                  }}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${getColorForType(n.type)}`}
                    >
                      {getIconForType(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">
                            {n.title}
                          </h4>
                          {n.read !== true && (
                            <span className="h-2 w-2 rounded-full bg-accent shrink-0" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          title={t("notifications.delete")}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(n.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1.5">
                        {formatTime(n.createdAt, t)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationsPage;
