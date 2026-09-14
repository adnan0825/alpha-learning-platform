/**
 * Admin System Logs / Activity - Integrated with backend API
 */
import React, { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  Activity,
  Search,
  User,
  BookOpen,
  Shield,
  LogIn,
  Trash2,
  CheckCircle,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const typeColors: Record<string, string> = {
  user_created: "bg-info/10 text-info",
  course_created: "bg-accent/10 text-accent",
  enrollment: "bg-success/10 text-success",
  auth: "bg-info/10 text-info",
  admin: "bg-destructive/10 text-destructive",
};

const typeIcons: Record<string, React.ReactNode> = {
  user_created: <User size={14} />,
  course_created: <BookOpen size={14} />,
  enrollment: <CheckCircle size={14} />,
  auth: <LogIn size={14} />,
  admin: <Shield size={14} />,
};

const formatTime = (timestamp: string, t: (key: any) => string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("logs.justNow");
  if (diffMins < 60) return `${diffMins}${t("logs.minutesAgo")}`;
  if (diffHours < 24) return `${diffHours}${t("logs.hoursAgo")}`;
  if (diffDays < 7) return `${diffDays}${t("logs.daysAgo")}`;
  return date.toLocaleDateString();
};

const SystemLogs: React.FC = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await adminAPI.getLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
  };

  const filtered = logs.filter((log) => {
    const detailString = JSON.stringify(log.data).toLowerCase();
    const typeString = log.event_type.toLowerCase();
    const matchesSearch =
      detailString.includes(search.toLowerCase()) ||
      typeString.includes(search.toLowerCase());
    const matchesFilter = filter === "all" || log.event_type === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity size={24} className="text-accent" /> {t("logs.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("logs.subtitle")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={14}
              className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {t("logs.refresh")}
          </Button>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder={t("logs.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 bg-card">
              <SelectValue placeholder={t("logs.allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("logs.allTypes")}</SelectItem>
              <SelectItem value="user_created">
                {t("logs.registrations")}
              </SelectItem>
              <SelectItem value="course_created">
                {t("logs.courseCreations")}
              </SelectItem>
              <SelectItem value="enrollment">
                {t("logs.enrollments")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Activity size={40} className="mx-auto mb-3 opacity-20" />
                <p>{t("logs.empty")}</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors"
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${typeColors[log.event_type] || "bg-muted"}`}
                    >
                      {typeIcons[log.event_type] || <Activity size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground capitalize">
                          {log.event_type.replace("_", " ")}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase tracking-wider"
                        >
                          {log.event_type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {log.event_type === "user_created" && (
                          <span>
                            {t("logs.newUser")} <strong>{log.data.user}</strong>{" "}
                            ({log.data.email}) {t("logs.joinedAs")}{" "}
                            {log.data.role}
                          </span>
                        )}
                        {log.event_type === "course_created" && (
                          <span>
                            {t("logs.instructor")}{" "}
                            <strong>{log.data.instructor}</strong>{" "}
                            {t("logs.createdCourse")}{" "}
                            <strong>{log.data.course}</strong>
                          </span>
                        )}
                        {log.event_type === "enrollment" && (
                          <span>
                            {t("logs.student")}{" "}
                            <strong>{log.data.student}</strong>{" "}
                            {t("logs.enrolledIn")}{" "}
                            <strong>{log.data.course}</strong>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground/60">
                        <Clock size={10} />
                        <span>
                          {formatTime(log.timestamp, t)} •{" "}
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SystemLogs;
