/**
 * Instructor Withdrawals Page
 */
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  DollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StatCard from "@/components/StatCard";

import { useLanguage } from "@/contexts/LanguageContext";

const InstructorWithdrawals: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();

  // Mock data
  const balance = 15450;
  const history = [
    {
      id: "w1",
      amount: 5000,
      date: "2025-03-01",
      status: "completed",
      method: "Telebirr",
    },
    {
      id: "w2",
      amount: 2500,
      date: "2025-02-15",
      status: "completed",
      method: "CBE",
    },
    {
      id: "w3",
      amount: 8000,
      date: "2025-04-05",
      status: "pending",
      method: "Telebirr",
    },
  ];

  const handleRequest = () => {
    toast({
      title: t("notify.success.withdrawalRequested"),
      description: t("notify.success.withdrawalDesc"),
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign size={24} className="text-accent" /> Withdrawals
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your earnings and payouts
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Available Balance"
          value={`${balance.toLocaleString()} ETB`}
          icon={<DollarSign />}
          gradient="success"
        />
        <StatCard
          label="Total Withdrawn"
          value="7,500 ETB"
          icon={<ArrowUpRight />}
          gradient="accent"
        />
        <StatCard
          label="Pending Request"
          value="8,000 ETB"
          icon={<Clock />}
          gradient="warning"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">
                Withdrawal History
              </h3>
              <div className="space-y-3">
                {history.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${item.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
                      >
                        {item.status === "completed" ? (
                          <CheckCircle size={18} />
                        ) : (
                          <Clock size={18} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {item.amount.toLocaleString()} ETB
                        </p>
                        <p className="text-xs text-muted-foreground">
                          via {item.method} • {item.date}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        item.status === "completed"
                          ? "text-success border-success/30"
                          : "text-warning border-warning/30"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow-card h-full">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-semibold text-foreground">Request Payout</h3>
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Available for withdrawal
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {balance.toLocaleString()} ETB
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-accent transition-colors bg-accent/5 border-accent">
                  <CreditCard className="text-accent" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Telebirr</p>
                    <p className="text-xs text-muted-foreground">
                      0911 *** ***
                    </p>
                  </div>
                  <CheckCircle size={16} className="text-accent" />
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-accent transition-colors opacity-60">
                  <CreditCard />
                  <div className="flex-1">
                    <p className="text-sm font-medium">CBE Bank</p>
                    <p className="text-xs text-muted-foreground">
                      1000 **** **** 89
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRequest}
                className="w-full gradient-accent text-accent-foreground py-6 text-lg font-semibold shadow-glow-accent"
              >
                Withdraw Now
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Minimum withdrawal: 500 ETB
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InstructorWithdrawals;
