import React, { useEffect, useState } from "react";
import { Check, ExternalLink, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { manualPaymentsAPI, ManualReceipt } from "@/lib/api";

type AdminReceipt = ManualReceipt & { user_name: string; user_email: string };

const AdminManualPayments: React.FC = () => {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<AdminReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      setReceipts(await manualPaymentsAPI.getAdminReceipts());
    } catch (error) {
      toast({
        title: "Could not load receipts",
        description: error instanceof Error ? error.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReceipts();
  }, []);

  const review = async (receipt: AdminReceipt, approved: boolean) => {
    setWorkingId(receipt.id);
    try {
      if (approved) await manualPaymentsAPI.approveReceipt(receipt.id);
      else await manualPaymentsAPI.rejectReceipt(receipt.id);
      setReceipts((current) =>
        current.map((item) =>
          item.id === receipt.id
            ? { ...item, status: approved ? "approved" : "rejected" }
            : item,
        ),
      );
      toast({ title: approved ? "Receipt approved" : "Receipt rejected" });
    } catch (error) {
      toast({
        title: "Could not update receipt",
        description: error instanceof Error ? error.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Manual payment receipts
          </h1>
          <p className="text-sm text-muted-foreground">
            Review offline bank and wallet transfer screenshots.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadReceipts()}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="animate-spin text-muted-foreground" />
        </div>
      ) : receipts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No manual payment receipts submitted.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {receipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardContent className="flex flex-col gap-4 p-4 md:flex-row">
                <a
                  href={receipt.receipt_image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative h-40 shrink-0 overflow-hidden rounded-lg border bg-muted md:w-48"
                >
                  <img
                    src={receipt.receipt_image_url}
                    alt="Payment receipt"
                    className="h-full w-full object-contain"
                  />
                  <ExternalLink
                    size={16}
                    className="absolute right-2 top-2 text-foreground opacity-0 group-hover:opacity-100"
                  />
                </a>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{receipt.course_title}</h2>
                    <Badge
                      variant={
                        receipt.status === "pending" ? "secondary" : "outline"
                      }
                    >
                      {receipt.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {receipt.user_name} · {receipt.user_email}
                  </p>
                  <p className="text-sm">
                    Amount:{" "}
                    {receipt.amount_etb
                      ? `${Number(receipt.amount_etb).toLocaleString()} ETB`
                      : "Not provided"}
                  </p>
                  {receipt.note && (
                    <p className="text-sm text-muted-foreground">
                      {receipt.note}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(receipt.created_at).toLocaleString()}
                  </p>
                  {receipt.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => void review(receipt, true)}
                        disabled={workingId === receipt.id}
                      >
                        <Check size={15} /> Approve and enroll
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void review(receipt, false)}
                        disabled={workingId === receipt.id}
                      >
                        <X size={15} /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminManualPayments;
