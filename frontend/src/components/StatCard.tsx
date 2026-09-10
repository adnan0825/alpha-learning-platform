/**
 * StatCard - Modern glassmorphism stat card with icon, trend indicator, and gradient glow.
 */
import React from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  gradient?: "accent" | "info" | "success" | "primary";
  delay?: number;
}

const gradientMap = {
  accent: "gradient-accent shadow-glow-accent",
  info: "gradient-info shadow-glow-info",
  success: "gradient-success shadow-glow-success",
  primary: "gradient-primary",
};

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend, gradient = "accent", delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-5 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-elevated dark:border-border/45 dark:bg-card/70"
    >
      {/* Decorative gradient blob */}
      <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full ${gradientMap[gradient]} opacity-20 blur-xl group-hover:opacity-30 transition-opacity`} />
      
      <div className="relative">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${gradientMap[gradient]} text-white mb-3`}>
          {icon}
        </div>
        <div className="flex items-end gap-2">
          <p className="font-display text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {trend && (
            <span className={`text-xs font-semibold mb-1 px-1.5 py-0.5 rounded-full ${
              trend.positive 
                ? "bg-success/10 text-success" 
                : "bg-destructive/10 text-destructive"
            }`}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </motion.div>
  );
};

export default StatCard;
