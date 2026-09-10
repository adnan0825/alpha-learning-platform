/**
 * Admin Payments & Billing - Integrated with backend API
 */
import React, { useEffect, useState } from "react";
import { paymentsAPI } from "@/lib/api";

import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  RefreshCw,
  RefreshCcw,
  ImageIcon,
  ExternalLink,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PaymentsPage: React.FC = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [manualReceipts, setManualReceipts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("all");
  const [receiptActionId, setReceiptActionId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [p, s, r] = await Promise.all([
        paymentsAPI.getAllPayments(),
        paymentsAPI.getPaymentStats(),
        paymentsAPI.getAdminManualReceipts().catch(() => [] as any[]),
      ]);
      setPayments(p);
      setStats(s);
      setManualReceipts(r);
    } catch (err) {
      console.error("Failed to load payment data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const approveReceipt = async (id: number) => {
    setReceiptActionId(id);
    try {
      await paymentsAPI.approveManualReceipt(id);
      toast({
        title: "Approved",
        description: "Student enrolled in the course (if not already).",
      });
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not approve";
      toast({
        title: "Approve failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setReceiptActionId(null);
    }
  };

  const deleteReceipt = async (id: number) => {
    if (
      !window.confirm(
        "Remove this receipt record? This does not unenroll the student.",
      )
    )
      return;
    setReceiptActionId(id);
    try {
      await paymentsAPI.deleteManualReceipt(id);
      toast({
        title: "Deleted",
        description: "Manual receipt removed.",
      });
      setManualReceipts((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not delete";
      toast({
        title: "Delete failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setReceiptActionId(null);
    }
  };

  const filtered =
    tab === "all" ? payments : payments.filter((p) => p.status === tab);

  const statusColors: Record<string, string> = {
    completed: "text-success border-success/30 bg-success/5",
    pending: "text-warning border-warning/30 bg-warning/5",
    failed: "text-destructive border-destructive/30 bg-destructive/5",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-xl ring-1 ring-border/30 backdrop-blur-md dark:bg-card/40"
        >
          <div
            className="pointer-events-none absolute inset-0 hero-saas-grid landing-section-grid-overlay opacity-[0.35] dark:opacity-[0.12]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 p-6 hero-landing-surface sm:flex-row sm:items-center sm:justify-between lg:p-8">
            <div>
              <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent">
                <CreditCard size={14} /> Finance
              </div>
              <h1 className="font-display text-2xl font-bold hero-headline-gradient lg:text-3xl">
                Payments & Billing
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track transactions and platform revenue
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="shrink-0 border-border/60 bg-background/60 shadow-sm"
            >
              <RefreshCw
                size={14}
                className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Revenue"
            value={`${Number(stats?.completed_amount ?? 0).toLocaleString()} ETB`}
            icon={<DollarSign size={18} />}
            gradient="accent"
            delay={0.1}
          />
          <StatCard
            label="Completed Payments"
            value={Number(stats?.completed_count ?? 0)}
            icon={<TrendingUp size={18} />}
            gradient="success"
            delay={0.2}
          />
          <StatCard
            label="Pending Payments"
            value={Number(stats?.pending_count ?? 0)}
            icon={<RefreshCcw size={18} />}
            gradient="info"
            delay={0.3}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              <Card className="surface-dashboard-card overflow-hidden shadow-elevated">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-12 text-center text-muted-foreground"
                          >
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        filtered.map((p) => (
                          <tr
                            key={p.id}
                            className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                              {p.tx_ref || p.chapa_reference || `TXN-${p.id}`}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {p.user_name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {p.user_email}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-muted-foreground">
                              {p.course_title}
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-foreground">
                              {(p.amount || 0).toLocaleString()} ETB
                            </td>
                            <td className="px-5 py-3.5 text-muted-foreground text-xs">
                              {new Date(p.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] uppercase tracking-wider ${statusColors[p.status] || ""}`}
                              >
                                {p.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <ImageIcon size={18} className="text-accent" />
            Manual payment proofs
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Receipt screenshots after manual transfer.{" "}
            <span className="font-medium text-foreground">Approve</span>{" "}
            verifies payment and enrolls the student.{" "}
            <span className="font-medium text-foreground">Delete</span> removes
            the record only (it does not unenroll).
          </p>
          <Card className="surface-dashboard-card overflow-hidden shadow-elevated">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Amount (ETB)
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Note
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Receipt
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {manualReceipts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-muted-foreground"
                      >
                        No manual receipts yet
                      </td>
                    </tr>
                  ) : (
                    manualReceipts.map((row) => {
                      const st = row.status || "pending";
                      const receiptStatusClass =
                        st === "approved"
                          ? "text-success border-success/30 bg-success/5"
                          : "text-warning border-warning/30 bg-warning/5";
                      return (
                        <tr
                          key={row.id}
                          className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(row.created_at).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {row.user_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {row.user_email}
                              </span>
                            </div>
                          </td>
                          <td
                            className="px-5 py-3.5 text-muted-foreground max-w-[200px] truncate"
                            title={row.course_title}
                          >
                            {row.course_title}
                          </td>
                          <td className="px-5 py-3.5 font-medium">
                            {row.amount_etb != null && row.amount_etb !== ""
                              ? Number(row.amount_etb).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[220px]">
                            {row.note ? (
                              <span className="line-clamp-2">{row.note}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <a
                              href={row.receipt_image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                            >
                              View
                              <ExternalLink size={12} />
                            </a>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase tracking-wider ${receiptStatusClass}`}
                            >
                              {st}
                            </Badge>
                            {row.reviewed_at ? (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {new Date(row.reviewed_at).toLocaleString()}
                                {row.reviewed_by_name
                                  ? ` · ${row.reviewed_by_name}`
                                  : ""}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {st === "pending" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-xs"
                                  disabled={receiptActionId === row.id}
                                  onClick={() => approveReceipt(row.id)}
                                >
                                  <CheckCircle size={14} />
                                  Approve
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                                disabled={receiptActionId === row.id}
                                onClick={() => deleteReceipt(row.id)}
                              >
                                <Trash2 size={14} />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default PaymentsPage;
