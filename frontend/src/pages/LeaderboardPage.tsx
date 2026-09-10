/**
 * Student Leaderboard & Achievements
 * Uses real backend leaderboard API
 */
import React, { useEffect, useState } from "react";
import { leaderboardAPI, LeaderboardEntry } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Trophy,
  Medal,
  Star,
  Flame,
  Target,
  BookOpen,
  Award,
  Zap,
  RefreshCw,
} from "lucide-react";

const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (index: number) => {
  const colors = [
    "gradient-accent shadow-glow-accent",
    "bg-muted",
    "bg-muted",
    "bg-primary/10 text-primary",
    "bg-success/10 text-success",
    "bg-info/10 text-info",
    "bg-warning/10 text-warning",
    "bg-destructive/10 text-destructive",
  ];
  return colors[index % colors.length];
};

const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async () => {
    setRefreshing(true);
    try {
      const data = await leaderboardAPI.get(50);
      setLeaderboard(data);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy size={24} className="text-accent" /> Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Top learners on Alpha
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaderboard}
            disabled={refreshing}
            className="text-xs"
          >
            <RefreshCw
              size={14}
              className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </motion.div>

        {leaderboard.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Trophy size={48} className="text-muted-foreground mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                No Rankings Yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Be the first to climb the leaderboard!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leaderboard */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="shadow-card">
                  <CardContent className="p-6">
                    <h3 className="font-display font-semibold text-foreground mb-4">
                      Top Students
                    </h3>

                    {/* Top 3 podium */}
                    {leaderboard.length >= 3 && (
                      <div className="flex items-end justify-center gap-4 mb-6 pb-6 border-b border-border/50">
                        {[1, 0, 2].map((idx) => {
                          const student = leaderboard[idx];
                          const isFirst = idx === 0;
                          return (
                            <motion.div
                              key={student.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 + idx * 0.1 }}
                              className={`flex flex-col items-center ${isFirst ? "order-2" : idx === 1 ? "order-1" : "order-3"}`}
                            >
                              <div
                                className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold mb-2 ${
                                  isFirst
                                    ? "gradient-accent text-accent-foreground shadow-glow-accent h-16 w-16"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {student.avatar ? (
                                  <img
                                    src={student.avatar}
                                    alt={student.name}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  getInitials(student.name)
                                )}
                              </div>
                              <p className="text-sm font-semibold text-foreground text-center max-w-[100px] truncate">
                                {student.name.split(" ")[0]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {student.coursesCompleted} courses
                              </p>
                              <div
                                className={`mt-1.5 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  idx === 0
                                    ? "gradient-accent text-accent-foreground"
                                    : idx === 1
                                      ? "bg-muted-foreground/20 text-foreground"
                                      : "bg-muted-foreground/10 text-muted-foreground"
                                }`}
                              >
                                {idx + 1}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}

                    {/* Full list */}
                    <div className="space-y-2">
                      {leaderboard.map((student, i) => (
                        <div
                          key={student.id}
                          className={`flex items-center gap-4 p-3 rounded-xl ${i === 0 ? "bg-accent/5" : "hover:bg-muted/30"} transition-colors`}
                        >
                          <span
                            className={`text-sm font-bold w-6 text-center ${i < 3 ? "text-accent" : "text-muted-foreground"}`}
                          >
                            #{i + 1}
                          </span>
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(i)}`}
                          >
                            {student.avatar ? (
                              <img
                                src={student.avatar}
                                alt={student.name}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              getInitials(student.name)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {student.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.coursesCompleted} courses •{" "}
                              {student.lessonsCompleted} lessons
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-display font-bold text-foreground text-sm">
                              {student.coursesCompleted * 100 +
                                student.lessonsCompleted * 10}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Achievements Placeholder */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="shadow-card">
                  <CardContent className="p-6">
                    <h3 className="font-display font-semibold text-foreground mb-4">
                      Achievement Badges
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          icon: <BookOpen size={20} />,
                          title: "First Course",
                          desc: "Enroll in your first course",
                          color: "text-info",
                        },
                        {
                          icon: <Target size={20} />,
                          title: "Quiz Master",
                          desc: "Score 100% on any quiz",
                          color: "text-success",
                        },
                        {
                          icon: <Flame size={20} />,
                          title: "5-Day Streak",
                          desc: "Learn 5 days in a row",
                          color: "text-warning",
                        },
                        {
                          icon: <Trophy size={20} />,
                          title: "Certificate",
                          desc: "Complete a course",
                          color: "text-accent",
                        },
                        {
                          icon: <Star size={20} />,
                          title: "Top 10",
                          desc: "Reach top 10 on leaderboard",
                          color: "text-destructive",
                        },
                        {
                          icon: <Medal size={20} />,
                          title: "Fast Learner",
                          desc: "Complete course in 7 days",
                          color: "text-accent",
                        },
                      ].map((badge, i) => (
                        <motion.div
                          key={badge.title}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/30 bg-muted/30 text-center opacity-50 grayscale"
                        >
                          <div className="text-muted-foreground">
                            {badge.icon}
                          </div>
                          <p className="text-[11px] font-semibold text-foreground">
                            {badge.title}
                          </p>
                          <p className="text-[9px] text-muted-foreground leading-tight">
                            {badge.desc}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Achievement system coming soon!
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LeaderboardPage;
