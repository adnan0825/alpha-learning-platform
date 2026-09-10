/**
 * Student Calendar Page
 */
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const StudentCalendar: React.FC = () => {
  // Mock calendar data
  const currentMonth = "April 2025";
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const events = [
    {
      day: 5,
      title: "React Quiz",
      type: "quiz",
      color: "bg-accent/20 text-accent",
    },
    {
      day: 10,
      title: "Final Project Proposal",
      type: "assignment",
      color: "bg-info/20 text-info",
    },
    {
      day: 15,
      title: "Live Q&A Session",
      type: "live",
      color: "bg-success/20 text-success",
    },
    {
      day: 20,
      title: "Component Library Due",
      type: "assignment",
      color: "bg-info/20 text-info",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarIcon size={24} className="text-accent" /> Learning Schedule
        </h1>
        <p className="text-muted-foreground text-sm">
          Keep track of your deadlines and events
        </p>
      </motion.div>

      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              {currentMonth}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft size={16} />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-muted-foreground uppercase"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-4">
            {/* Empty cells for start of month */}
            {[1, 2].map((i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const dayEvents = events.filter((e) => e.day === day);
              return (
                <div
                  key={day}
                  className="min-h-[100px] border border-border/50 rounded-xl p-2 hover:bg-muted/20 transition-colors"
                >
                  <span
                    className={`text-sm font-medium ${day === 5 ? "text-accent" : "text-foreground"}`}
                  >
                    {day}
                  </span>
                  <div className="mt-2 space-y-1">
                    {dayEvents.map((ev, i) => (
                      <div
                        key={i}
                        className={`text-[10px] px-1.5 py-1 rounded-md truncate font-medium ${ev.color}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card md:col-span-2">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Upcoming Deadlines
            </h3>
            <div className="space-y-3">
              {events
                .filter((e) => e.type !== "live")
                .map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-col flex items-center justify-center h-12 w-12 rounded-lg bg-muted text-foreground font-bold leading-none">
                      <span className="text-xs uppercase text-muted-foreground">
                        Apr
                      </span>
                      <span className="text-lg">{ev.day}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">
                        {ev.title}
                      </h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {ev.type}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      <Clock size={10} className="mr-1" /> 11:59 PM
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Study Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Study Streak
                </span>
                <span className="font-bold text-accent">5 Days 🔥</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Time Spent
                </span>
                <span className="font-bold text-foreground">12h 30m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Lessons Completed
                </span>
                <span className="font-bold text-foreground">8</span>
              </div>
              <div className="pt-4 mt-2 border-t border-border/50">
                <Button className="w-full gradient-accent text-accent-foreground">
                  <BookOpen size={16} className="mr-2" /> Continue Learning
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentCalendar;
